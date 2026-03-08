import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ExoLogo } from "@/components/ExoLogo";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, isLoading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isSignUp) {
      // Check waitlist approval before allowing signup
      const { data: isApproved } = await supabase.rpc("check_waitlist_approved", {
        check_email: email.trim().toLowerCase(),
      });

      if (!isApproved) {
        // Check if they're on the waitlist at all
        const { data: waitlistEntry } = await supabase
          .from("waitlist")
          .select("email")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();

        if (waitlistEntry) {
          setPendingApproval(true);
          toast.info("You're on the waitlist! We'll notify you once approved.");
        } else {
          toast.error("Please join the waitlist first from our homepage.");
        }
        setIsSubmitting(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      }
    }
    setIsSubmitting(false);
  };

  // Pending approval state
  if (pendingApproval) {
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
              <Clock className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">You're on the list!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your email <span className="text-foreground font-medium">{email}</span> is on the waitlist. 
              We'll send you an email once you've been approved for beta access.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 text-accent" />
              We review applications manually to ensure a great beta experience.
            </div>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => setPendingApproval(false)}
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <ExoLogo size="lg" variant="mark" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">ExoSky</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">Beta</span>
          </div>
          <p className="text-muted-foreground mt-2">The everything finance app — now in beta</p>
        </div>

        <Card className="p-6 bg-card border-border shadow-card">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full mb-4 h-11"
            onClick={async () => {
              const { error } = await signInWithGoogle();
              if (error) toast.error(error.message);
            }}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isSignUp ? "Sign up with Google" : "Continue with Google"}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-secondary border-border"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-secondary border-border"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 bg-secondary border-border"
            />
            <Button
              type="submit"
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {isSignUp && (
            <p className="text-xs text-muted-foreground text-center mt-3 bg-secondary/50 rounded-lg p-2.5">
              ⚡ Sign-up requires waitlist approval. <a href="/" className="text-accent hover:underline">Join the waitlist</a> first.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setPendingApproval(false); }}
              className="text-foreground font-medium hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 text-xs text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <span>·</span>
            <a href="/disclosures" className="hover:text-foreground transition-colors">Disclosures</a>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
