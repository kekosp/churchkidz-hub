import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

interface Child {
  id: string;
  full_name: string;
  parent_name: string;
  school_grade?: string;
}

const QRCodes = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole) {
      fetchChildren();
    }
  }, [user, userRole]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("children")
        .select("id, full_name, parent_name, school_grade")
        .order("full_name");

      // Parents only see their own children
      if (userRole === "parent") {
        query = query.eq("parent_id", user?.id);
      }
      // Servants see assigned children
      else if (userRole === "servant") {
        query = query.eq("servant_id", user?.id);
      }
      // Admins see all children (no filter)

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching children:", error);
        toast.error("Failed to load children");
        return;
      }

      setChildren(data || []);
    } catch (error) {
      console.error("Exception fetching children:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (childId: string, childName: string) => {
    const svg = document.getElementById(`qr-${childId}`) as HTMLElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${childName}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-4xl font-bold mb-8 text-foreground">QR Codes</h1>

        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No children found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card key={child.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{child.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Parent: {child.parent_name}
                  </p>
                  {child.school_grade && (
                    <p className="text-sm text-muted-foreground">
                      Grade: {child.school_grade}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      id={`qr-${child.id}`}
                      value={child.id}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQRCode(child.id, child.full_name)}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodes;
