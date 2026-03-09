import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExoLogo } from "@/components/ExoLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Loader2, CheckCircle2, Search, Users,
  ShieldCheck, ArrowLeft, Trash2, RefreshCw,
  Clock, Mail, Calendar, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface WaitlistEntry {
  id: string;
  email: string;
  is_approved: boolean;
  created_at: string;
}

export default function AdminWaitlist() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user, authLoading]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_waitlist_admin");
    if (!error && data) setEntries(data as WaitlistEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchEntries();
  }, [isAdmin]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleApprove = async (id: string, email: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("waitlist")
      .update({ is_approved: true } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to approve");
    } else {
      toast.success(`Approved ${email}`);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, is_approved: true } : e)));
    }
    setActionLoading(null);
  };

  const handleRevoke = async (id: string, email: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("waitlist")
      .update({ is_approved: false } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to revoke");
    } else {
      toast.info(`Revoked access for ${email}`);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, is_approved: false } : e)));
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string, email: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("waitlist").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove");
    } else {
      toast.success(`Removed ${email}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
    setActionLoading(null);
  };

  const filtered = entries.filter((e) => {
    const matchesSearch = e.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ? true : filter === "approved" ? e.is_approved : !e.is_approved;
    return matchesSearch && matchesFilter;
  });

  const totalCount = entries.length;
  const approvedCount = entries.filter((e) => e.is_approved).length;
  const pendingCount = totalCount - approvedCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-6 w-px bg-border" />
            <ExoLogo size="sm" />
            <div className="flex items-center gap-2">
              <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] font-bold tracking-wider uppercase">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black tracking-tight">Waitlist Management</h1>
          <p className="text-muted-foreground mt-1">Review and approve beta access requests</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
        >
          <Card className="relative overflow-hidden p-6 bg-card border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-muted-foreground/[0.03] rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight">{totalCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Total requests</p>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-6 bg-card border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/[0.05] rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight text-accent">{approvedCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Approved</p>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-6 bg-card border-border/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.05] rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight text-amber-500">{pendingCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Awaiting review</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email address..."
              className="pl-10 h-11 bg-secondary/30 border-border/50 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "approved"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={`rounded-lg ${filter === f ? "bg-foreground text-background shadow-sm" : "border-border/50"}`}
              >
                {f === "all" ? "All" : f === "pending" ? `Pending (${pendingCount})` : `Approved (${approvedCount})`}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={fetchEntries} className="rounded-lg border-border/50">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_200px_140px_180px] gap-4 px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          <span>Email</span>
          <span>Requested</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading waitlist...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm font-semibold">No entries found</p>
            <p className="text-xs mt-1">
              {search ? "Try a different search term" : "No one has joined the waitlist yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
              >
                <Card className="group p-4 sm:p-5 bg-card/50 border-border/40 hover:bg-card hover:border-border/60 transition-all duration-200 rounded-xl">
                  <div className="sm:grid sm:grid-cols-[1fr_200px_140px_180px] sm:gap-4 sm:items-center flex flex-col gap-3">
                    {/* Email — full, never truncated */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center text-sm font-bold shrink-0">
                        {entry.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-semibold break-all">{entry.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                      <span>
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                        <span className="text-muted-foreground/50 ml-1.5">
                          ({formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })})
                        </span>
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      {entry.is_approved ? (
                        <Badge className="bg-accent/10 text-accent border-accent/20 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:justify-end">
                      {actionLoading === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {!entry.is_approved ? (
                            <Button
                              size="sm"
                              className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs gap-1.5 rounded-lg shadow-sm shadow-accent/20"
                              onClick={() => handleApprove(entry.id, entry.email)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-lg border-border/50"
                              onClick={() => handleRevoke(entry.id, entry.email)}
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(entry.id, entry.email)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/50">
            Ξ╳oSky Admin · Waitlist v1.0
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            Showing {filtered.length} of {totalCount} entries
          </p>
        </div>
      </div>
    </div>
  );
}
