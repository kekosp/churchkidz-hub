import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { passwordValidation } from "@/lib/validation-schemas";

type FieldErrors = Record<string, string>;

const resetSchema = z
  .object({
    password: passwordValidation,
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery hash on this page load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasRecoverySession(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const collectErrors = (err: z.ZodError): FieldErrors => {
    const out: FieldErrors = {};
    err.errors.forEach((e) => {
      const key = e.path[0]?.toString() ?? "_";
      if (!out[key]) out[key] = e.message;
    });
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = resetSchema.safeParse({ password, confirm });
    if (!validation.success) {
      setErrors(collectErrors(validation.error));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (import.meta.env.DEV) console.error("Reset password error:", error);
        setErrors({ _form: "Unable to update password. The reset link may have expired." });
        toast.error("Unable to update password. Please request a new reset link.");
        return;
      }
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => {
        supabase.auth.signOut().finally(() => navigate("/auth"));
      }, 2000);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Unexpected reset error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="text-sm font-medium text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-accent/10 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
            <CardDescription>
              Choose a strong password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Password updated</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
            ) : !hasRecoverySession ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired.
                </p>
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                      }}
                      disabled={loading}
                      aria-invalid={!!errors.password}
                      className="pr-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    fieldError("password")
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Min 8 chars with uppercase, lowercase, and a number.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (errors.confirm) setErrors((p) => ({ ...p, confirm: "" }));
                    }}
                    disabled={loading}
                    aria-invalid={!!errors.confirm}
                    dir="ltr"
                  />
                  {fieldError("confirm")}
                </div>
                {errors._form && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    {errors._form}
                  </div>
                )}
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Update password
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
