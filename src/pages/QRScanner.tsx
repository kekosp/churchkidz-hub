import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";

interface ScanResult {
  childName: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

const QRScanner = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && userRole && userRole === "parent") {
      toast.error("Only servants and admins can scan QR codes");
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate]);

  const recordAttendance = async (childId: string) => {
    try {
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .single();

      if (childError || !childData) {
        throw new Error("Child not found");
      }

      const today = format(new Date(), "yyyy-MM-dd");

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
          message: t('attendance.alreadyRecorded'),
          timestamp: new Date(),
        };
      }

      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          child_id: childId,
          service_date: today,
          present: true,
          recorded_by: user?.id,
        });

      if (insertError) {
        throw insertError;
      }

      return {
        childName: childData.full_name,
        success: true,
        message: t('qr.scanSuccess'),
        timestamp: new Date(),
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error recording attendance:", error);
      }
      return {
        childName: "Unknown",
        success: false,
        message: t('qr.scanError'),
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
          if (isPausedRef.current) {
            return;
          }

          isPausedRef.current = true;
          const result = await recordAttendance(decodedText);
          setPendingResult(result);
          setShowConfirmDialog(true);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );

      setScanning(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error starting scanner:", error);
      }
      toast.error("Failed to start camera. Please check permissions.");
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error stopping scanner:", error);
        }
      } finally {
        scannerRef.current = null;
        setScanning(false);
        isPausedRef.current = false;
      }
    }
  };

  const handleConfirmScan = () => {
    if (pendingResult) {
      setScanResults((prev) => [pendingResult, ...prev]);
      
      if (pendingResult.success) {
        toast.success(`${pendingResult.childName} - ${t('common.present')}!`);
      } else {
        toast.error(`${pendingResult.childName}: ${pendingResult.message}`);
      }
    }
    
    setShowConfirmDialog(false);
    setPendingResult(null);
    isPausedRef.current = false;
  };

  const handleCancelScan = () => {
    setShowConfirmDialog(false);
    setPendingResult(null);
    isPausedRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch((error) => {
          console.debug("Scanner cleanup:", error);
        });
      }
    };
  }, [scanning]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingResult?.success ? t('attendance.markPresent') : t('qr.scanError')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-lg">{pendingResult?.childName}</p>
              <p>{pendingResult?.message}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={handleCancelScan}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmScan}>
              {pendingResult?.success ? t('common.save') : t('common.yes')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
            {t('common.back')}
          </Button>

          <h1 className="text-4xl font-bold mb-8 text-foreground">
            {t('qr.scanTitle')}
          </h1>

          <div className="grid gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('qr.scanInstructions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  id="qr-reader"
                  className="w-full max-w-md mx-auto mb-4"
                ></div>
                
                <div className="flex justify-center gap-4">
                  {!scanning ? (
                    <Button onClick={startScanning} size="lg">
                      {t('qr.scanTitle')}
                    </Button>
                  ) : (
                    <Button onClick={stopScanning} variant="destructive" size="lg">
                      {t('common.cancel')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {scanResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.title')}</CardTitle>
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
    </>
  );
};

export default QRScanner;
