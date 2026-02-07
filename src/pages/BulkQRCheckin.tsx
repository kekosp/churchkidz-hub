import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle, XCircle, Users, Camera, StopCircle, Save, Trash2 } from "lucide-react";
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
import { AppLayout } from "@/components/layout";

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
  const lastScanTimeRef = useRef<Map<string, number>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration not supported
      }
    }
  };

  const playFeedback = (type: 'success' | 'error' | 'duplicate') => {
    if (type === 'success') {
      vibrate(100);
    } else if (type === 'duplicate') {
      vibrate([50, 50, 50]);
    } else {
      vibrate(300);
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
      } else if (type === 'duplicate') {
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
      } else {
        oscillator.frequency.value = 220;
        oscillator.type = 'triangle';
      }
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio not supported
    }
  };

  useEffect(() => {
    if (!authLoading && userRole && userRole === "parent") {
      toast.error(t('bulkQR.noPermission'));
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate, t]);

  const handleQRScan = async (childId: string) => {
    const now = Date.now();
    const lastScan = lastScanTimeRef.current.get(childId);
    
    if (lastScan && now - lastScan < 3000) return;
    if (scannedIdsRef.current.has(childId)) return;

    lastScanTimeRef.current.set(childId, now);
    scannedIdsRef.current.add(childId);

    try {
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("full_name")
        .eq("id", childId)
        .single();

      if (childError || !childData) {
        playFeedback('error');
        setScannedChildren(prev => [...prev, {
          id: childId,
          name: t('bulkQR.unknownChild'),
          timestamp: new Date(),
          status: 'error',
          message: t('bulkQR.childNotFound')
        }]);
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("id")
        .eq("child_id", childId)
        .eq("service_date", today)
        .maybeSingle();

      if (existingAttendance) {
        playFeedback('duplicate');
        setScannedChildren(prev => [...prev, {
          id: childId,
          name: childData.full_name,
          timestamp: new Date(),
          status: 'duplicate',
          message: t('attendance.alreadyRecorded')
        }]);
        toast.info(`${childData.full_name}: ${t('attendance.alreadyRecorded')}`);
      } else {
        playFeedback('success');
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
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { await handleQRScan(decodedText); },
        () => {}
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
    lastScanTimeRef.current.clear();
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

        if (error) throw error;

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

    if (successCount > 0) toast.success(`${t('bulkQR.savedCount')}: ${successCount}`);
    if (errorCount > 0) toast.error(`${t('bulkQR.errorCount')}: ${errorCount}`);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const pendingCount = scannedChildren.filter(c => c.status === 'pending').length;
  const savedCount = scannedChildren.filter(c => c.status === 'saved').length;
  const duplicateCount = scannedChildren.filter(c => c.status === 'duplicate').length;

  return (
    <AppLayout title={t('bulkQR.title')} fullWidth>
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
              {saving ? t('common.saving') : t('common.save')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
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
    </AppLayout>
  );
};

export default BulkQRCheckin;
