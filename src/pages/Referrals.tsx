import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReferrals } from "@/hooks/useReferrals";
import {
  Users, Copy, CheckCircle2, Gift, ArrowRight, Loader2,
  Share2, DollarSign, UserPlus, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Referrals() {
  const {
    referralCode, referrals, isLoading,
    redeemCode, completedCount, pendingCount, totalEarned,
  } = useReferrals();

  const [redeemInput, setRedeemInput] = useState("");
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const text = `Join X Money and we both get $10! Use my referral code: ${referralCode}`;
    if (navigator.share) {
      navigator.share({ title: "X Money Referral", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Share text copied to clipboard!");
    }
  };

  const handleRedeem = async () => {
    if (!redeemInput.trim()) return;
    try {
      await redeemCode.mutateAsync(redeemInput.trim());
      toast.success("Referral redeemed! $10 bonus credited 🎉");
      setRedeemInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem code");
    }
  };

  // Milestone tiers
  const milestones = [
    { count: 1, reward: "$10", label: "First Referral" },
    { count: 5, reward: "$50 + bonus", label: "5 Friends" },
    { count: 10, reward: "$100 + VIP", label: "10 Friends" },
    { count: 25, reward: "$250 + Metal+", label: "25 Friends" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Users className="w-6 h-6 text-warning" />
          <h1 className="text-2xl font-bold tracking-tight">Refer & Earn</h1>
        </div>
        <p className="text-muted-foreground text-sm">Invite friends and you both earn $10</p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-card border-border text-center">
            <UserPlus className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold font-mono">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Referred</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <DollarSign className="w-5 h-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold font-mono text-success">${totalEarned}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Earned</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Trophy className="w-5 h-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold font-mono">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
          </Card>
        </div>
      </motion.div>

      {/* Your Referral Code */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card className="p-5 bg-card border-border space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="text-sm font-semibold mb-3">Your Referral Code</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
                <p className="text-xl font-bold font-mono tracking-[0.2em]">
                  {referralCode || "Loading..."}
                </p>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={copyCode}
                className="h-12 w-12 shrink-0"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={shareLink}
              className="w-full mt-3 bg-foreground text-background hover:bg-foreground/90 gap-2"
            >
              <Share2 className="w-4 h-4" /> Share with Friends
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Redeem Code */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <Card className="p-5 bg-card border-border space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold">Have a Referral Code?</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="bg-secondary border-border font-mono uppercase tracking-wider"
              maxLength={15}
            />
            <Button
              onClick={handleRedeem}
              disabled={redeemCode.isPending || !redeemInput.trim()}
              className="bg-success text-success-foreground hover:bg-success/90 gap-1 shrink-0"
            >
              {redeemCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Redeem</>}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Milestones */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-5 bg-card border-border space-y-3">
          <h3 className="text-sm font-semibold">Referral Milestones</h3>
          <div className="space-y-2">
            {milestones.map((m) => {
              const achieved = completedCount >= m.count;
              return (
                <div
                  key={m.count}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    achieved ? "bg-success/5 border border-success/10" : "bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      achieved ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      {achieved ? <CheckCircle2 className="w-4 h-4" /> : m.count}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.reward}</p>
                    </div>
                  </div>
                  {achieved && (
                    <Badge className="bg-success/10 text-success border-0 text-xs">Unlocked</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Referral History */}
      {referrals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Referral History
          </h3>
          <div className="space-y-2">
            {referrals.map((r) => (
              <Card key={r.id} className="p-3 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      r.status === "completed" ? "bg-success/10" : "bg-secondary"
                    }`}>
                      <UserPlus className={`w-4 h-4 ${
                        r.status === "completed" ? "text-success" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {r.status === "completed" ? "Friend joined" : "Invite pending"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold font-mono ${
                    r.status === "completed" ? "text-success" : "text-muted-foreground"
                  }`}>
                    {r.status === "completed" ? `+$${r.reward_amount}` : "Pending"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
