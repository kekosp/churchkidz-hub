import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, CheckCircle, XCircle, Users, Camera, StopCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScannedChild {
  id: string;
  name: string;
  timestamp: Date;
  status: 'pending' | 'saved' | 'error' | 'duplicate';
  message?: string;
}

const BulkQRCheckin = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [scannedChildren, setScannedChildren] = useState<ScannedChild[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && userRole && userRole === "parent") {
      toast.error(t('bulkQR.noPermission'));
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate, t]);

  const handleQRScan = async (childId: string) => {
    // Skip if already scanned in this session
    if (scannedIdsRef.current.has(childId)) {
      return;
    }

    try {
      // Get child info
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .single();

      if (childError || !childData) {
        setScannedChildren(prev => [...prev, {
          id: childId,
          name: t('bulkQR.unknownChild'),
          timestamp: new Date(),
          status: 'error',
          message: t('bulkQR.childNotFound')
        }]);
        return;
      }

      // Check for existing attendance today
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("id")
        .eq("child_id", childId)
        .eq("service_date", today)
        .maybeSingle();

      scannedIdsRef.current.add(childId);

      if (existingAttendance) {
        setScannedChildren(prev => [...prev, {
          id: childId,
          name: childData.full_name,
          timestamp: new Date(),
          status: 'duplicate',
          message: t('attendance.alreadyRecorded')
        }]);
        toast.info(`${childData.full_name}: ${t('attendance.alreadyRecorded')}`);
      } else {
        setScannedChildren(prev => [...prev, {
          id: childId,
          name: childData.full_name,
          timestamp: new Date(),
          status: 'pending'
        }]);
        toast.success(`${t('bulkQR.scanned')}: ${childData.full_name}`);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error processing QR:", error);
      }
    }
  };

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("bulk-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleQRScan(decodedText);
        },
        () => {
          // Ignore scan errors
        }
      );

      setScanning(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error starting scanner:", error);
      }
      toast.error(t('bulkQR.cameraError'));
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
      }
    }
  };

  const removeChild = (childId: string) => {
    setScannedChildren(prev => prev.filter(c => c.id !== childId));
    scannedIdsRef.current.delete(childId);
  };

  const clearAll = () => {
    setScannedChildren([]);
    scannedIdsRef.current.clear();
  };

  const saveAllAttendance = async () => {
    const pendingChildren = scannedChildren.filter(c => c.status === 'pending');
    
    if (pendingChildren.length === 0) {
      toast.info(t('bulkQR.noPending'));
      setShowSaveDialog(false);
      return;
    }

    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    let successCount = 0;
    let errorCount = 0;

    for (const child of pendingChildren) {
      try {
        const { error } = await supabase
          .from("attendance")
          .insert({
            child_id: child.id,
            service_date: today,
            present: true,
            recorded_by: user?.id,
          });

        if (error) {
          throw error;
        }

        setScannedChildren(prev => 
          prev.map(c => c.id === child.id ? { ...c, status: 'saved' as const } : c)
        );
        successCount++;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`Error saving attendance for ${child.name}:`, error);
        }
        setScannedChildren(prev => 
          prev.map(c => c.id === child.id ? { ...c, status: 'error' as const, message: t('bulkQR.saveError') } : c)
        );
        errorCount++;
      }
    }

    setSaving(false);
    setShowSaveDialog(false);

    if (successCount > 0) {
      toast.success(`${t('bulkQR.savedCount')}: ${successCount}`);
    }
    if (errorCount > 0) {
      toast.error(`${t('bulkQR.errorCount')}: ${errorCount}`);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
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

  const pendingCount = scannedChildren.filter(c => c.status === 'pending').length;
  const savedCount = scannedChildren.filter(c => c.status === 'saved').length;
  const duplicateCount = scannedChildren.filter(c => c.status === 'duplicate').length;

  return (
    <>
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bulkQR.confirmSave')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulkQR.confirmSaveDesc').replace('{count}', String(pendingCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={saveAllAttendance} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </AlertDialogAction>
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

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('bulkQR.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('bulkQR.subtitle')}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scanner Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  {t('bulkQR.scanner')}
                </CardTitle>
                <CardDescription>
                  {t('bulkQR.scannerDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  id="bulk-qr-reader"
                  className="w-full max-w-sm mx-auto mb-4 min-h-[250px] bg-muted rounded-lg"
                ></div>
                
                <div className="flex justify-center gap-4">
                  {!scanning ? (
                    <Button onClick={startScanning} size="lg" className="gap-2">
                      <Camera className="h-4 w-4" />
                      {t('bulkQR.startScanning')}
                    </Button>
                  ) : (
                    <Button onClick={stopScanning} variant="destructive" size="lg" className="gap-2">
                      <StopCircle className="h-4 w-4" />
                      {t('bulkQR.stopScanning')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('bulkQR.scannedChildren')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    <div className="text-xs text-muted-foreground">{t('bulkQR.pending')}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-2xl font-bold text-green-600">{savedCount}</div>
                    <div className="text-xs text-muted-foreground">{t('bulkQR.saved')}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-600">{duplicateCount}</div>
                    <div className="text-xs text-muted-foreground">{t('bulkQR.duplicates')}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowSaveDialog(true)} 
                    disabled={pendingCount === 0 || saving}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {t('bulkQR.saveAll')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearAll}
                    disabled={scannedChildren.length === 0}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('bulkQR.clear')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scanned List */}
          {scannedChildren.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('bulkQR.scannedList')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {scannedChildren.map((child, index) => (
                    <div
                      key={`${child.id}-${index}`}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        child.status === 'saved'
                          ? "border-green-500/20 bg-green-500/5"
                          : child.status === 'pending'
                          ? "border-yellow-500/20 bg-yellow-500/5"
                          : child.status === 'duplicate'
                          ? "border-blue-500/20 bg-blue-500/5"
                          : "border-red-500/20 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {child.status === 'saved' && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                        {child.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-yellow-500 flex-shrink-0" />
                        )}
                        {child.status === 'duplicate' && (
                          <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                        {child.status === 'error' && (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(child.timestamp, "h:mm:ss a")}
                            {child.message && ` - ${child.message}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            child.status === 'saved' ? 'default' :
                            child.status === 'pending' ? 'secondary' :
                            child.status === 'duplicate' ? 'outline' : 'destructive'
                          }
                        >
                          {child.status === 'saved' && t('bulkQR.saved')}
                          {child.status === 'pending' && t('bulkQR.pending')}
                          {child.status === 'duplicate' && t('bulkQR.duplicate')}
                          {child.status === 'error' && t('bulkQR.error')}
                        </Badge>
                        {child.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChild(child.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default BulkQRCheckin;