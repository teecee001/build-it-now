import { useState } from "react";
import { Bug, MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type FeedbackType = "feedback" | "bug";

export function BetaFeedback() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feedback");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("beta_feedback" as any).insert({
      user_id: user.id,
      type,
      message: message.trim(),
      page_url: window.location.pathname,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error("Failed to send. Please try again.");
    } else {
      toast.success(type === "bug" ? "Bug report sent — thank you!" : "Feedback sent — thank you!");
      setMessage("");
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/25 flex items-center justify-center hover:scale-105 transition-transform"
        whileTap={{ scale: 0.95 }}
        aria-label="Send feedback"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Beta Feedback</h3>
                <p className="text-xs text-muted-foreground">Help us improve Ξ╳oSky</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
                BETA
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              {/* Type selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setType("feedback")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    type === "feedback"
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : "bg-secondary/50 text-muted-foreground border border-transparent hover:bg-secondary"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Feedback
                </button>
                <button
                  onClick={() => setType("bug")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    type === "bug"
                      ? "bg-destructive/10 text-destructive border border-destructive/30"
                      : "bg-secondary/50 text-muted-foreground border border-transparent hover:bg-secondary"
                  }`}
                >
                  <Bug className="w-3.5 h-3.5" />
                  Report Bug
                </button>
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Describe the bug — what happened and what you expected..."
                    : "What would you like to see improved?"
                }
                className="min-h-[100px] bg-secondary/30 border-border text-sm resize-none rounded-xl"
              />

              <Button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "Sending..." : "Send"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
