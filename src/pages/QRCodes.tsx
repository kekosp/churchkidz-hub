import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeSVG } from "qrcode.react";
import { Download, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";

interface Child {
  id: string;
  full_name: string;
  parent_name: string;
  school_grade?: string;
}

const QRCodes = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && userRole) {
      fetchChildren();
    }
  }, [user, userRole]);


  const fetchChildren = async () => {
    try {
      setLoading(true);
      
      // Use secure view that masks sensitive parent contact info based on user role
      let query = supabase
        .from("children_safe_view" as any)
        .select("id, full_name, parent_name, school_grade")
        .order("full_name") as any;

      if (userRole === "parent") {
        query = query.eq("parent_id", user?.id);
      } else if (userRole === "servant") {
        query = query.eq("servant_id", user?.id);
      }

      const { data, error } = await query;

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching children:", error);
        }
        toast.error("Failed to load children");
        return;
      }

      setChildren(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Exception fetching children:", error);
      }
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (childId: string, childName: string): Promise<void> => {
    return new Promise((resolve) => {
      const svg = document.getElementById(`qr-${childId}`) as HTMLElement;
      if (!svg) {
        resolve();
        return;
      }

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
        resolve();
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  const toggleSelect = (childId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
      } else {
        newSet.add(childId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(children.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const downloadSelectedQRCodes = async () => {
    const selectedChildren = children.filter((c) => selectedIds.has(c.id));
    for (let i = 0; i < selectedChildren.length; i++) {
      await downloadQRCode(selectedChildren[i].id, selectedChildren[i].full_name);
      if (i < selectedChildren.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    toast.success(`Downloaded ${selectedChildren.length} QR codes`);
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const headerActions = children.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {!isSelecting ? (
        <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
          <Check className="h-4 w-4 mr-2" />
          {t('qr.selectMode')}
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={selectedIds.size === children.length ? deselectAll : selectAll}
          >
            {selectedIds.size === children.length ? t('qr.deselectAll') : t('qr.selectAll')}
          </Button>
          <Button
            size="sm"
            onClick={downloadSelectedQRCodes}
            disabled={selectedIds.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('qr.downloadSelected')} ({selectedIds.size})
          </Button>
          <Button variant="ghost" size="sm" onClick={cancelSelection}>
            <X className="h-4 w-4 mr-2" />
            {t('qr.cancelSelection')}
          </Button>
        </>
      )}
    </div>
  ) : undefined;

  if (loading) {
    return (
      <AppLayout title={t('qr.title')} headerActions={headerActions}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('qr.title')} headerActions={headerActions}>
      <div className="space-y-6">
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {t('children.noChildren')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card
                key={child.id}
                className={`relative transition-all ${
                  isSelecting && selectedIds.has(child.id)
                    ? "ring-2 ring-primary"
                    : ""
                } ${isSelecting ? "cursor-pointer" : ""}`}
                onClick={() => isSelecting && toggleSelect(child.id)}
              >
                {isSelecting && (
                  <div className="absolute top-4 right-4 z-10">
                    <Checkbox
                      checked={selectedIds.has(child.id)}
                      onCheckedChange={() => toggleSelect(child.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{child.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('children.parentName')}: {child.parent_name}
                  </p>
                  {child.school_grade && (
                    <p className="text-sm text-muted-foreground">
                      {t('children.schoolGrade')}: {child.school_grade}
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
                  {!isSelecting && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(child.id, child.full_name)}
                      className="w-full gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {t('qr.download')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default QRCodes;
