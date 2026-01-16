import { useState, useRef, useCallback } from 'react';
import { Bug, X, Send, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const MIN_DESCRIPTION_LENGTH = 50;

export function BugReportButton() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDescription('');
    setStepsToReproduce('');
    setExpectedBehavior('');
    setActualBehavior('');
    setScreenshot(null);
    setScreenshotPreview(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('bugReport.invalidFileType'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('bugReport.fileTooLarge'));
      return;
    }

    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFormValid = () => {
    return description.length >= MIN_DESCRIPTION_LENGTH && screenshot !== null;
  };

  const handleSubmitClick = () => {
    if (!isFormValid()) {
      if (description.length < MIN_DESCRIPTION_LENGTH) {
        toast.error(t('bugReport.descriptionTooShort').replace('{count}', String(MIN_DESCRIPTION_LENGTH)));
      }
      if (!screenshot) {
        toast.error(t('bugReport.screenshotRequired'));
      }
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      if (!user) {
        toast.error(t('bugReport.loginRequired'));
        return;
      }

      // Upload screenshot
      const fileExt = screenshot!.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bug-screenshots')
        .upload(fileName, screenshot!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bug-screenshots')
        .getPublicUrl(fileName);

      // Get browser info
      const browserInfo = `${navigator.userAgent} | Screen: ${window.innerWidth}x${window.innerHeight}`;

      // Insert bug report
      const { error: insertError } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          description: description.trim(),
          steps_to_reproduce: stepsToReproduce.trim() || null,
          expected_behavior: expectedBehavior.trim() || null,
          actual_behavior: actualBehavior.trim() || null,
          browser_info: browserInfo,
          screenshot_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast.success(t('bugReport.submitSuccess'));
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Bug report submission error:', error);
      toast.error(t('bugReport.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (description || screenshot)) {
      // If closing with unsaved data, confirm
      if (confirm(t('bugReport.discardChanges'))) {
        resetForm();
        setIsOpen(false);
      }
    } else {
      setIsOpen(open);
    }
  };

  const characterCount = description.length;
  const isDescriptionValid = characterCount >= MIN_DESCRIPTION_LENGTH;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
            size="icon"
            variant="default"
          >
            <Bug className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              {t('bugReport.title')}
            </DialogTitle>
            <DialogDescription>
              {t('bugReport.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-1">
                {t('bugReport.bugDescription')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('bugReport.descriptionPlaceholder')}
                className="min-h-[120px] resize-none"
                maxLength={2000}
              />
              <p className={`text-xs ${isDescriptionValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                {characterCount}/{MIN_DESCRIPTION_LENGTH} {t('bugReport.minimumChars')}
              </p>
            </div>

            {/* Screenshot */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t('bugReport.screenshot')} <span className="text-destructive">*</span>
              </Label>
              
              {screenshotPreview ? (
                <div className="relative rounded-lg border overflow-hidden">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full h-48 object-contain bg-muted"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeScreenshot}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('bugReport.uploadInstructions')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF (max 5MB)
                  </p>
                </div>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Optional Fields */}
            <div className="space-y-2">
              <Label htmlFor="steps">{t('bugReport.stepsToReproduce')}</Label>
              <Textarea
                id="steps"
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder={t('bugReport.stepsPlaceholder')}
                className="min-h-[80px] resize-none"
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected">{t('bugReport.expectedBehavior')}</Label>
                <Textarea
                  id="expected"
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder={t('bugReport.expectedPlaceholder')}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual">{t('bugReport.actualBehavior')}</Label>
                <Textarea
                  id="actual"
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                  placeholder={t('bugReport.actualPlaceholder')}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={!isFormValid() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('bugReport.submitting')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t('bugReport.submit')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bugReport.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bugReport.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              {t('bugReport.confirmSubmit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
