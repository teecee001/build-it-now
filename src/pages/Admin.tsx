import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExoLogo } from "@/components/ExoLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Loader2, CheckCircle2, Search, Users, ShieldCheck, Trash2, RefreshCw,
  Clock, Mail, Calendar, Shield, LayoutDashboard, Activity, MessageSquare,
  UserPlus, Ban, ShieldOff, Plus, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type WaitlistEntry = { id: string; email: string; is_approved: boolean; created_at: string };
type Overview = {
  waitlist_total: number; waitlist_pending: number; waitlist_approved: number;
  users_total: number; users_confirmed: number;
  usd_balance: number; usd_savings: number; tx_total: number; feedback_total: number;
};
type AdminUser = {
  id: string; email: string; email_confirmed: boolean; created_at: string;
  last_sign_in_at: string | null; banned_until: string | null;
  full_name: string | null; handle: string | null; country_code: string | null;
  usd_balance: number; usd_savings: number; is_admin: boolean;
};
type AdminTx = {
  id: string; user_id: string; user_email: string | null; type: string;
  amount: number; currency: string; description: string | null;
  recipient: string | null; status: string; created_at: string;
};
type AdminFeedback = {
  id: string; user_id: string; user_email: string | null; type: string;
  message: string; page_url: string | null; created_at: string;
};

function rpcMessage(error: { message?: string } | null) {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("could not find the function") || m.includes("schema cache") || m.includes("does not exist")) {
    return "Database not updated yet. Paste the admin SQL in Supabase → SQL Editor and Run.";
  }
  if (m.includes("not authorized")) return "Admin access denied for this account.";
  return error?.message || "Request failed";
}

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [txs, setTxs] = useState<AdminTx[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);

  const [search, setSearch] = useState("");
  const [waitFilter, setWaitFilter] = useState<"all" | "pending" | "approved">("all");
  const [newEmail, setNewEmail] = useState("");
  const [approveOnAdd, setApproveOnAdd] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      await supabase.rpc("claim_founder_admin");
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, [user, authLoading]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, wl, us, tx, fb] = await Promise.all([
      supabase.rpc("admin_overview"),
      supabase.rpc("get_waitlist_admin"),
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_list_transactions"),
      supabase.rpc("admin_list_feedback"),
    ]);
    if (ov.error) toast.error(rpcMessage(ov.error));
    else setOverview(ov.data as Overview);
    if (wl.error) toast.error(rpcMessage(wl.error));
    else setWaitlist((wl.data as WaitlistEntry[]) || []);
    if (!us.error) setUsers((us.data as AdminUser[]) || []);
    if (!tx.error) setTxs((tx.data as AdminTx[]) || []);
    if (!fb.error) setFeedback((fb.data as AdminFeedback[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const filteredWait = useMemo(() => waitlist.filter((e) => {
    const q = search.toLowerCase();
    const match = e.email.toLowerCase().includes(q);
    const f = waitFilter === "all" ? true : waitFilter === "approved" ? e.is_approved : !e.is_approved;
    return match && f;
  }), [waitlist, search, waitFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.handle || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const run = async (key: string, fn: () => Promise<void>) => {
    setAction(key);
    try { await fn(); } finally { setAction(null); }
  };

  const approve = (id: string, email: string) => run(id, async () => {
    const { error } = await supabase.rpc("set_waitlist_approval", { p_id: id, p_approved: true });
    if (error) toast.error(rpcMessage(error));
    else { toast.success(`Approved ${email}`); setWaitlist((p) => p.map((e) => e.id === id ? { ...e, is_approved: true } : e)); }
  });
  const revoke = (id: string, email: string) => run(id, async () => {
    const { error } = await supabase.rpc("set_waitlist_approval", { p_id: id, p_approved: false });
    if (error) toast.error(rpcMessage(error));
    else { toast.info(`Revoked ${email}`); setWaitlist((p) => p.map((e) => e.id === id ? { ...e, is_approved: false } : e)); }
  });
  const remove = (id: string, email: string) => run(id, async () => {
    const { error } = await supabase.rpc("delete_waitlist_entry", { p_id: id });
    if (error) toast.error(rpcMessage(error));
    else { toast.success(`Removed ${email}`); setWaitlist((p) => p.filter((e) => e.id !== id)); }
  });
  const approveAll = () => run("all", async () => {
    const { data, error } = await supabase.rpc("admin_waitlist_approve_all");
    if (error) toast.error(rpcMessage(error));
    else {
      toast.success(`Approved ${data ?? 0} pending emails`);
      setWaitlist((p) => p.map((e) => ({ ...e, is_approved: true })));
    }
  });
  const addEmail = () => run("add", async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const { data, error } = await supabase.rpc("admin_waitlist_add", { p_email: email, p_approved: approveOnAdd });
    if (error) toast.error(rpcMessage(error));
    else if ((data as { ok?: boolean })?.ok === false) toast.error("Invalid email");
    else {
      toast.success(approveOnAdd ? `Added and approved ${email}` : `Added ${email} as pending`);
      setNewEmail("");
      await load();
    }
  });
  const confirmUser = (id: string, email: string) => run(id, async () => {
    const { error } = await supabase.rpc("admin_user_confirm", { p_user_id: id });
    if (error) toast.error(rpcMessage(error));
    else { toast.success(`Confirmed ${email}`); setUsers((p) => p.map((u) => u.id === id ? { ...u, email_confirmed: true } : u)); }
  });
  const banUser = (id: string, email: string, banned: boolean) => run(id, async () => {
    const { error } = await supabase.rpc("admin_user_ban", { p_user_id: id, p_banned: banned });
    if (error) toast.error(rpcMessage(error));
    else {
      toast.success(banned ? `Banned ${email}` : `Unbanned ${email}`);
      setUsers((p) => p.map((u) => u.id === id ? { ...u, banned_until: banned ? "2099-01-01" : null } : u));
    }
  });
  const setRole = (id: string, email: string, admin: boolean) => run(id, async () => {
    const { error } = await supabase.rpc("admin_user_set_role", { p_user_id: id, p_admin: admin });
    if (error) toast.error(rpcMessage(error));
    else {
      toast.success(admin ? `${email} is now admin` : `Removed admin from ${email}`);
      setUsers((p) => p.map((u) => u.id === id ? { ...u, is_admin: admin } : u));
    }
  });

  const pending = waitlist.filter((e) => !e.is_approved).length;
  const approved = waitlist.length - pending;
  const ov = overview;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ExoLogo size="sm" />
            <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3 h-3 mr-1" /> Admin
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">{user.email}</span>
            <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => navigate("/dashboard")}>App</Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Control center</h1>
          <p className="text-muted-foreground mt-1">Waitlist, users, activity, and feedback — you approve who gets in.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-auto flex flex-wrap gap-1 bg-secondary/40 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="waitlist" className="rounded-lg gap-1.5"><Mail className="w-3.5 h-3.5" /> Waitlist {pending > 0 && <span className="ml-1 text-amber-500">({pending})</span>}</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg gap-1.5"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-lg gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Feedback</TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, name, handle…" className="pl-10 h-11 bg-secondary/30 border-border/50 rounded-xl" />
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Pending waitlist", value: ov?.waitlist_pending ?? pending, icon: Clock, color: "text-amber-500" },
                { label: "Approved", value: ov?.waitlist_approved ?? approved, icon: CheckCircle2, color: "text-accent" },
                { label: "Users", value: ov?.users_total ?? users.length, icon: Users, color: "text-foreground" },
                { label: "Transactions", value: ov?.tx_total ?? txs.length, icon: Activity, color: "text-foreground" },
              ].map((s) => (
                <Card key={s.label} className="p-5 bg-card border-border/50">
                  <s.icon className={`w-4 h-4 mb-3 ${s.color}`} />
                  <p className="text-2xl font-black tracking-tight">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </Card>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Card className="p-5 bg-card border-border/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">USD on platform</p>
                <p className="text-2xl font-black">{money(ov?.usd_balance ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Savings {money(ov?.usd_savings ?? 0)}</p>
              </Card>
              <Card className="p-5 bg-card border-border/50 flex flex-col justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-lg" disabled={!pending || action === "all"} onClick={approveAll}>
                    {action === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                    Approve all pending
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setTab("waitlist")}>Open waitlist</Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setTab("users")}>Open users</Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-4">
            <Card className="p-4 bg-card border-border/50">
              <p className="text-sm font-semibold mb-3">Add or approve an email</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="friend@email.com" className="h-10 rounded-xl" />
                <Button className="rounded-lg h-10" onClick={addEmail} disabled={!newEmail || action === "add"}>
                  {action === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {approveOnAdd ? "Add & approve" : "Add pending"}
                </Button>
                <Button variant="outline" className="rounded-lg h-10" onClick={() => setApproveOnAdd((v) => !v)}>
                  {approveOnAdd ? "Will approve" : "Pending only"}
                </Button>
                <Button variant="outline" className="rounded-lg h-10" disabled={!pending || action === "all"} onClick={approveAll}>
                  Approve all ({pending})
                </Button>
              </div>
            </Card>

            <div className="flex gap-2 flex-wrap">
              {(["all", "pending", "approved"] as const).map((f) => (
                <Button key={f} size="sm" variant={waitFilter === f ? "default" : "outline"} className="rounded-lg" onClick={() => setWaitFilter(f)}>
                  {f === "all" ? `All (${waitlist.length})` : f === "pending" ? `Pending (${pending})` : `Approved (${approved})`}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredWait.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No waitlist emails match.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredWait.map((entry) => (
                  <Card key={entry.id} className="p-4 bg-card/60 border-border/40 rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold break-all">{entry.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {entry.is_approved ? (
                        <Badge className="bg-accent/10 text-accent border-accent/20 w-fit">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 w-fit">Pending</Badge>
                      )}
                      <div className="flex gap-2">
                        {action === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <>
                            {!entry.is_approved ? (
                              <Button size="sm" className="h-8 rounded-lg" onClick={() => approve(entry.id, entry.email)}>Approve</Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => revoke(entry.id, entry.email)}>Revoke</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(entry.id, entry.email)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No users yet. Approve waitlist, then they Sign Up.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredUsers.map((u) => {
                  const banned = !!u.banned_until && new Date(u.banned_until) > new Date();
                  return (
                    <Card key={u.id} className="p-4 bg-card/60 border-border/40 rounded-xl">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold break-all">{u.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.full_name || "No name"} {u.handle ? `· ${u.handle}` : ""} · {money(u.usd_balance)} + {money(u.usd_savings)} savings
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {u.is_admin && <Badge className="bg-accent/10 text-accent border-accent/20">Admin</Badge>}
                          {u.email_confirmed ? (
                            <Badge variant="outline" className="text-accent border-accent/30">Confirmed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30">Unconfirmed</Badge>
                          )}
                          {banned && <Badge variant="outline" className="text-destructive border-destructive/30">Banned</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {action === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                              {!u.email_confirmed && (
                                <Button size="sm" className="h-8 rounded-lg" onClick={() => confirmUser(u.id, u.email)}>Confirm email</Button>
                              )}
                              {u.id !== user.id && (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => banUser(u.id, u.email, !banned)}>
                                  {banned ? <><ShieldOff className="w-3.5 h-3.5" /> Unban</> : <><Ban className="w-3.5 h-3.5" /> Ban</>}
                                </Button>
                              )}
                              {u.id !== user.id && lowerEmail(u.email) !== "edwinmaurice11@gmail.com" && (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => setRole(u.id, u.email, !u.is_admin)}>
                                  <UserPlus className="w-3.5 h-3.5" /> {u.is_admin ? "Remove admin" : "Make admin"}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {txs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No transactions yet.</p>
            ) : (
              <div className="space-y-1.5">
                {txs.filter((t) => !search || (t.user_email || "").toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase())).map((t) => (
                  <Card key={t.id} className="p-4 bg-card/60 border-border/40 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.type} · {money(t.amount)} {t.currency}</p>
                      <p className="text-xs text-muted-foreground break-all">{t.user_email} {t.description ? `· ${t.description}` : ""} {t.recipient ? `→ ${t.recipient}` : ""}</p>
                    </div>
                    <Badge variant="outline" className="w-fit">{t.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback">
            {feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No beta feedback yet.</p>
            ) : (
              <div className="space-y-1.5">
                {feedback.map((f) => (
                  <Card key={f.id} className="p-4 bg-card/60 border-border/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{f.type}</Badge>
                      <span className="text-xs text-muted-foreground">{f.user_email}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                    {f.page_url && <p className="text-xs text-muted-foreground mt-1">{f.page_url}</p>}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function lowerEmail(email: string | null) {
  return (email || "").toLowerCase();
}
