import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, LogIn, Loader2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { loginSchema, signupSchema } from "@/lib/validation-schemas";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type FieldErrors = Record<string, string>;

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"auth" | "forgot">("auth");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupErrors, setSignupErrors] = useState<FieldErrors>({});

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotErrors, setForgotErrors] = useState<FieldErrors>({});
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const collectErrors = (err: z.ZodError): FieldErrors => {
    const out: FieldErrors = {};
    err.errors.forEach((e) => {
      const key = e.path[0]?.toString() ?? "_";
      if (!out[key]) out[key] = e.message;
    });
    return out;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    const validation = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!validation.success) {
      setLoginErrors(collectErrors(validation.error));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (import.meta.env.DEV) console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          setLoginErrors({ _form: "Invalid email or password" });
          toast.error("Invalid email or password");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setLoginErrors({ _form: "Please confirm your email before logging in" });
          toast.error("Please confirm your email before logging in");
        } else {
          setLoginErrors({ _form: "Unable to log in. Please try again." });
          toast.error("Unable to log in. Please try again.");
        }
        return;
      }

      if (data.session) {
        toast.success("Login successful!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Unexpected login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});

    const validation = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      full_name: signupFullName,
      phone_number: signupPhone,
    });

    if (!validation.success) {
      setSignupErrors(collectErrors(validation.error));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName,
            phone_number: signupPhone,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (import.meta.env.DEV) console.error("Signup error:", error);
        if (error.message.includes("already registered") || error.message.toLowerCase().includes("already")) {
          setSignupErrors({ email: "This email is already registered" });
          toast.error("This email is already registered. Please log in.");
        } else {
          setSignupErrors({ _form: "Unable to create account. Please try again." });
          toast.error("Unable to create account. Please try again.");
        }
        return;
      }

      if (data.user) {
        toast.success("Account created! Check your email to confirm.");
        setSignupEmail("");
        setSignupPassword("");
        setSignupFullName("");
        setSignupPhone("");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Unexpected signup error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrors({});

    const validation = forgotSchema.safeParse({ email: forgotEmail });
    if (!validation.success) {
      setForgotErrors(collectErrors(validation.error));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (import.meta.env.DEV) console.error("Reset error:", error);
        // Don't reveal whether the email exists
      }

      setForgotSent(true);
      toast.success("If that email exists, a reset link was sent.");
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Unexpected reset error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (errors: FieldErrors, key: string) =>
    errors[key] ? (
      <p className="text-sm font-medium text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">{t('app.title')}</CardTitle>
            <CardDescription>
              {view === "forgot" ? "Reset your password" : t('auth.loginDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === "forgot" ? (
              <div className="space-y-4">
                {forgotSent ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Check your inbox</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        If an account exists for <span className="font-medium">{forgotEmail}</span>,
                        you'll receive a password reset link shortly.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setView("auth");
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                      Back to login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4" noValidate>
                    <p className="text-sm text-muted-foreground">
                      Enter your email and we'll send you a link to reset your password.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="name@church.com"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotErrors.email) setForgotErrors({});
                        }}
                        disabled={loading}
                        aria-invalid={!!forgotErrors.email}
                        dir="ltr"
                      />
                      {fieldError(forgotErrors, "email")}
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send reset link
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full gap-2"
                      onClick={() => setView("auth")}
                      disabled={loading}
                    >
                      <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                      Back to login
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('auth.email')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@church.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email || loginErrors._form)
                            setLoginErrors((prev) => ({ ...prev, email: "", _form: "" }));
                        }}
                        disabled={loading}
                        aria-invalid={!!loginErrors.email}
                        dir="ltr"
                      />
                      {fieldError(loginErrors, "email")}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">{t('auth.password')}</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setView("forgot");
                            setForgotEmail(loginEmail);
                            setForgotErrors({});
                          }}
                          disabled={loading}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginErrors.password || loginErrors._form)
                              setLoginErrors((prev) => ({ ...prev, password: "", _form: "" }));
                          }}
                          disabled={loading}
                          aria-invalid={!!loginErrors.password}
                          className="pr-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldError(loginErrors, "password")}
                    </div>
                    {loginErrors._form && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                        {loginErrors._form}
                      </div>
                    )}
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('auth.loggingIn')}
                        </>
                      ) : (
                        <>
                          <LogIn className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
                          {t('auth.login')}
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupFullName}
                        onChange={(e) => {
                          setSignupFullName(e.target.value);
                          if (signupErrors.full_name)
                            setSignupErrors((prev) => ({ ...prev, full_name: "" }));
                        }}
                        disabled={loading}
                        aria-invalid={!!signupErrors.full_name}
                      />
                      {fieldError(signupErrors, "full_name")}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">{t('auth.phoneNumber')}</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={signupPhone}
                        onChange={(e) => {
                          setSignupPhone(e.target.value);
                          if (signupErrors.phone_number)
                            setSignupErrors((prev) => ({ ...prev, phone_number: "" }));
                        }}
                        disabled={loading}
                        aria-invalid={!!signupErrors.phone_number}
                        dir="ltr"
                      />
                      {fieldError(signupErrors, "phone_number")}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('auth.email')}</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@church.com"
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value);
                          if (signupErrors.email)
                            setSignupErrors((prev) => ({ ...prev, email: "" }));
                        }}
                        disabled={loading}
                        aria-invalid={!!signupErrors.email}
                        dir="ltr"
                      />
                      {fieldError(signupErrors, "email")}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => {
                            setSignupPassword(e.target.value);
                            if (signupErrors.password)
                              setSignupErrors((prev) => ({ ...prev, password: "" }));
                          }}
                          disabled={loading}
                          aria-invalid={!!signupErrors.password}
                          className="pr-10"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signupErrors.password ? (
                        fieldError(signupErrors, "password")
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Min 8 chars with uppercase, lowercase, and a number.
                        </p>
                      )}
                    </div>
                    {signupErrors._form && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                        {signupErrors._form}
                      </div>
                    )}
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('auth.creatingAccount')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          {t('auth.signup')}
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
