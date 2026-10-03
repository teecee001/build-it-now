import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ExoLogo } from "@/components/ExoLogo";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, isLoading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const postAuthTarget = nextPath ?? "/dashboard";

  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to={postAuthTarget} replace />;

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter your email first");
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent. Check your inbox and spam.");
    setIsResetting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (isSignUp) {
      if (!fullName.trim()) {
        toast.error("Please enter your name");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setIsSubmitting(false);
        return;
      }

      try {
        await supabase.rpc("join_waitlist", { p_email: normalizedEmail });
      } catch {
        /* non-blocking */
      }

      const emailRedirectTo = nextPath
        ? `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`
        : `${window.location.origin}/dashboard`;

      const { error } = await signUp(normalizedEmail, password, fullName.trim(), emailRedirectTo);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          toast.error("This email already has an account. Sign in instead.");
          setIsSignUp(false);
        } else {
          toast.error(error.message);
        }
      } else {
        setPendingConfirm(true);
      }
    } else {
      const { error } = await signIn(normalizedEmail, password);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("email not confirmed")) {
          setPendingConfirm(true);
          toast.message("Confirm your email to continue", {
            description: "Check your inbox (and spam) for the link from ExoSky.",
          });
        } else if (msg.includes("invalid login")) {
          toast.error("Wrong email or password. Try again or create an account.");
        } else {
          toast.error(error.message);
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleResendConfirm = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    if (error) toast.error(error.message);
    else toast.success("Confirmation email sent. Check inbox and spam.");
    setIsSubmitting(false);
  };

  if (pendingConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="inline-flex items-center justify-center mb-6">
            <ExoLogo size="lg" variant="mark" />
          </div>
          <Card className="p-8 bg-card border-border">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-2">
              We sent a confirmation link to{" "}
              <span className="text-foreground font-medium">{email}</span>.
            </p>
            <p className="text-muted-foreground text-xs mb-6">
              Open the link to activate your demo account. Check spam if you don’t see it.
            </p>
            <Button className="w-full" onClick={handleResendConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend email"}
            </Button>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => {
                setPendingConfirm(false);
                setIsSignUp(false);
              }}
            >
              Back to Sign In
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-5">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 mb-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ExoLogo size="md" variant="mark" />
            <span className="text-2xl font-bold tracking-tight">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-accent)" }}
              >
                Ξ╳
              </span>
              oSky
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
              Beta
            </span>
          </a>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {isSignUp
              ? "Create your demo account. Paper balances, live markets."
              : "Welcome back. Sign in to continue."}
          </p>
        </div>

        <Card className="p-6 bg-card border-border shadow-card">
          <Button
            variant="outline"
            className="w-full mb-4 h-11"
            onClick={async () => {
              const redirectUri = nextPath
                ? `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`
                : window.location.origin;
              const { error } = await signInWithGoogle(redirectUri);
              if (error) toast.error(error.message);
            }}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="h-11 bg-secondary border-border"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 bg-secondary border-border"
            />
            <Input
              type="password"
              placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-11 bg-secondary border-border"
            />
            {!isSignUp && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isResetting ? "Sending..." : "Forgot password?"}
                </button>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                "Create demo account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {isSignUp && (
            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5 bg-secondary/50 rounded-lg p-2.5">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              Demo mode. Paper balances, no real money.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPendingConfirm(false);
              }}
              className="text-foreground font-medium hover:underline"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">
              Home
            </a>
            <span>·</span>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <span>·</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <span>·</span>
            <a href="/disclosures" className="hover:text-foreground transition-colors">
              Disclosures
            </a>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
