import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScanResult {
  childName: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

const QRScanner = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Only admins and servants can scan
  useEffect(() => {
    if (!authLoading && userRole && userRole === "parent") {
      toast.error("Only servants and admins can scan QR codes");
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate]);

  const recordAttendance = async (childId: string) => {
    try {
      // First, get child information
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .single();

      if (childError || !childData) {
        throw new Error("Child not found");
      }

      const today = format(new Date(), "yyyy-MM-dd");

      // Check if attendance already recorded today
      const { data: existingAttendance, error: checkError } = await supabase
        .from("attendance")
        .select("id")
        .eq("child_id", childId)
        .eq("service_date", today)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingAttendance) {
        return {
          childName: childData.full_name,
          success: false,
          message: "Already marked present today",
          timestamp: new Date(),
        };
      }

      // Record new attendance
      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          child_id: childId,
          service_date: today,
          present: true,
          recorded_by: user?.id,
          notes: "Recorded via QR scan",
        });

      if (insertError) {
        throw insertError;
      }

      return {
        childName: childData.full_name,
        success: true,
        message: "Attendance recorded successfully",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error recording attendance:", error);
      return {
        childName: "Unknown",
        success: false,
        message: "Failed to record attendance",
        timestamp: new Date(),
      };
    }
  };

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Process the scanned QR code
          const result = await recordAttendance(decodedText);
          setScanResults((prev) => [result, ...prev]);

          if (result.success) {
            toast.success(`${result.childName} marked present!`);
          } else {
            toast.error(`${result.childName}: ${result.message}`);
          }
        },
        (errorMessage) => {
          // Ignore scan errors (happens continuously while scanning)
        }
      );

      setScanning(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Failed to start camera. Please check permissions.");
      // Clear the scanner ref if start failed
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      } finally {
        scannerRef.current = null;
        setScanning(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      // Only stop if scanner is actually running
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch((error) => {
          // Silently handle cleanup errors
          console.debug("Scanner cleanup:", error);
        });
      }
    };
  }, [scanning]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-4xl font-bold mb-8 text-foreground">
          QR Code Scanner
        </h1>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                id="qr-reader"
                className="w-full max-w-md mx-auto mb-4"
              ></div>
              
              <div className="flex justify-center gap-4">
                {!scanning ? (
                  <Button onClick={startScanning} size="lg">
                    Start Scanning
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="destructive" size="lg">
                    Stop Scanning
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {scanResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        result.success
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-red-500/20 bg-red-500/5"
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {result.childName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(result.timestamp, "h:mm:ss a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
