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
  Loader2, CheckCircle2, XCircle, Search, Users,
  ShieldCheck, ArrowLeft, Trash2, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  // Fetch waitlist
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <ExoLogo size="sm" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold">Admin Panel</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-black">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total signups</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-black text-accent">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-orange-500">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="pl-9 h-10 bg-secondary/50 border-border rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "approved"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f ? "bg-foreground text-background" : ""}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={fetchEntries}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="p-4 bg-card border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                      {entry.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Joined {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.is_approved ? (
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5 text-[11px]">
                        Pending
                      </Badge>
                    )}

                    {actionLoading === entry.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        {!entry.is_approved ? (
                          <Button
                            size="sm"
                            className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 text-xs gap-1"
                            onClick={() => handleApprove(entry.id, entry.email)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleRevoke(entry.id, entry.email)}
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id, entry.email)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
