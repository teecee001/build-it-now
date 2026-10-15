import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, Gift, PiggyBank, Plane, Reply, Search, Sparkles, SquarePen, Target, UtensilsCrossed, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ExoAvatar from "@/components/exo/ExoAvatar";
import MessageBubble from "@/components/exo/MessageBubble";
import TypingIndicator from "@/components/exo/TypingIndicator";
import ChatList, { type ThreadRow } from "@/components/exo/ChatList";
import { useWallet } from "@/hooks/useWallet";
import { useAccountTier } from "@/hooks/useAccountTier";
import { Sparkline } from "@/components/exo/RichCards";
import { apyForBoost, projectSeries, askExo, extractLinks, followUps, loadMode, saveMode, splitReply, stripSources, type ExoMode, excerpt, loadHistory, loadThreads, MAIN_THREAD, newId, saveHistory, saveThreads, threadKey, type ChatMessage, type ChatThread } from "@/lib/exoChat";

const SUGGESTIONS = [
  "What's happening in crypto markets today?",
  "How should I think about portfolio risk?",
  "Explain dollar-cost averaging simply",
  "What are key factors for long-term investing?",
];

const GREETING_MONEY = "Hey 👋 I'm keeping an eye on your money and the markets. What's on your mind?";
const GREETING_LIFE = "Hey 👋 Shopping, trips, plans and places. What are we sorting out today?";
const LIFE_SUGGESTIONS = ["Plan a weekend trip", "Find a gift under $50", "Plan a dinner on Friday"];

const GROUP_GAP_MS = 5 * 60 * 1000;

type Goal = { id: string; goal: string; target_amount: number | null; target_date: string | null };
type GoalsClient = {
  from: (t: string) => {
    select: (c: string) => {
      order: (col: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Goal[] | null; error: unknown }> };
    };
  };
};

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

type Props = {
  /** Preview hook: start with these messages instead of stored history. */
  initialMessages?: ChatMessage[];
  /** Preview hook: show the typing indicator. */
  forceTyping?: boolean;
};

export default function AIAdvisor({ initialMessages, forceTyping }: Props = {}) {
  const [userKey, setUserKey] = useState<string | null>(initialMessages ? "preview" : null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sendPulse, setSendPulse] = useState(0);
  const [mode, setModeState] = useState<ExoMode>(() => loadMode());
  const setMode = (m: ExoMode) => {
    setModeState(m);
    saveMode(m);
  };
  // id of the Exo bubble currently streaming in (null when idle)
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState("exo");
  const [listOpen, setListOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { balance, savingsBalance } = useWallet();
  const { config: tierConfig } = useAccountTier();
  // Savings APY by plan: Personal 6%, Pro 8%, Business 9%, Bank 10%.
  const tierApy = apyForBoost(tierConfig?.apyBoost);
  const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typing = isLoading || !!forceTyping;
  const showDots = typing && !streamingId;

  // Resolve the signed-in user, load their history and (optionally) their Exo goals.
  useEffect(() => {
    if (initialMessages) return;
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const uid = data.session?.user.id ?? "anon";
      setUserKey(uid);
      setMessages(loadHistory(uid));
      setThreads(loadThreads(uid));
      if (data.session) {
        try {
          const { data: rows, error } = await (supabase as unknown as GoalsClient)
            .from("exo_goals")
            .select("id, goal, target_amount, target_date")
            .order("created_at", { ascending: false })
            .limit(3);
          if (!cancelled && !error && rows) setGoals(rows);
        } catch {
          /* goals table not installed: no pinned area */
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialMessages]);

  useEffect(() => {
    if (userKey && userKey !== "preview") saveHistory(threadKey(userKey, activeId), messages);
  }, [messages, userKey, activeId]);
  useEffect(() => {
    if (userKey && userKey !== "preview") saveThreads(userKey, threads);
  }, [threads, userKey]);

  // Chat list: Exo, then goals as conversations, then saved chats (newest first).
  const allThreads = useMemo<ChatThread[]>(() => {
    const goalThreads: ChatThread[] = goals.map((g) => ({
      id: `goal:${g.id}`,
      title: g.goal,
      kind: "goal",
      updatedAt: 0,
      context: `> My goal: ${g.goal}${g.target_amount != null ? ` ($${Number(g.target_amount).toLocaleString()}` + (g.target_date ? ` by ${g.target_date})` : ")") : ""}`,
    }));
    return [MAIN_THREAD, ...goalThreads, ...[...threads].sort((a, b) => b.updatedAt - a.updatedAt)];
  }, [goals, threads]);
  const active = allThreads.find((t) => t.id === activeId) ?? MAIN_THREAD;
  const threadRows: ThreadRow[] = allThreads.map((t) => {
    const hist = t.id === activeId ? messages : userKey && userKey !== "preview" ? loadHistory(threadKey(userKey, t.id)) : [];
    const last = hist[hist.length - 1];
    return { ...t, last: last?.content, lastAt: last?.createdAt };
  });

  const openThread = (id: string) => {
    setListOpen(false);
    setSearchOpen(false);
    setQuery("");
    if (id === activeId || isLoading) return;
    setActiveId(id);
    setReplyTo(null);
    setMessages(userKey && userKey !== "preview" ? loadHistory(threadKey(userKey, id)) : []);
  };

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseen(0);
  }, []);

  useLayoutEffect(() => {
    scrollToBottom(false);
  }, [userKey, scrollToBottom]);

  const lastMsg = messages[messages.length - 1];
  const lastId = lastMsg?.id;
  const lastRole = lastMsg?.role;
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;
  useEffect(() => {
    if (!lastId) return;
    if (atBottomRef.current || lastRole === "user") scrollToBottom();
    else setUnseen((n) => n + 1);
  }, [lastId, lastRole, scrollToBottom]);

  useEffect(() => {
    if (typing && atBottomRef.current) scrollToBottom();
  }, [typing, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
  };

  // Auto-grow the composer.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text.trim(),
      createdAt: Date.now(),
      replyTo: replyTo ? { id: replyTo.id, role: replyTo.role, excerpt: excerpt(replyTo.content) } : undefined,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setReplyTo(null);
    setSendPulse((n) => n + 1);
    setIsLoading(true);
    if (active.kind === "chat")
      setThreads((ts) => ts.map((t) => (t.id === active.id ? { ...t, updatedAt: Date.now(), title: t.title === "New chat" ? excerpt(text, 40) : t.title } : t)));
    const liveId = newId();
    let started = false;
    const result = await askExo(history, active.context, {
      mode,
      // Stream into one live bubble (Sources hidden; shown as cards when done).
      onDelta: (soFar) => {
        const content = stripSources(soFar);
        if (!started) {
          started = true;
          setStreamingId(liveId);
          setMessages((prev) => [...prev.map((m) => (m.role === "user" ? { ...m, read: true } : m)), { id: liveId, role: "assistant", content, createdAt: Date.now() }]);
        } else setMessages((prev) => prev.map((m) => (m.id === liveId ? { ...m, content } : m)));
      },
    });
    // Final: short bubbles, sources as cards on the last one.
    const sources = extractLinks(result.text, 4);
    const parts = splitReply(stripSources(result.text) || result.text);
    const at = Date.now();
    const finals: ChatMessage[] = parts.map((content, i) => ({
      id: i === 0 ? liveId : newId(),
      role: "assistant",
      content,
      createdAt: at + i,
      ...(i === parts.length - 1 && sources.length ? { sources } : {}),
    }));
    setMessages((prev) => [...prev.filter((m) => m.id !== liveId).map((m) => (m.role === "user" ? { ...m, read: true } : m)), ...finals]);
    setStreamingId(null);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const react = (m: ChatMessage, emoji: string) =>
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reaction: x.reaction === emoji ? undefined : emoji } : x)));

  const startReply = (m: ChatMessage) => {
    setReplyTo(m);
    inputRef.current?.focus();
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.animate?.([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 900 });
  };

  // New chat starts a fresh conversation; earlier ones stay in the chat list.
  const newChat = () => {
    if (isLoading) return;
    const t: ChatThread = { id: `c-${newId()}`, title: "New chat", kind: "chat", updatedAt: Date.now() };
    setThreads((ts) => [t, ...ts]);
    setActiveId(t.id);
    setMessages([]);
    setReplyTo(null);
    setListOpen(false);
    inputRef.current?.focus();
  };

  const q = query.trim().toLowerCase();
  const shownMessages = useMemo(() => (q ? messages.filter((m) => m.content.toLowerCase().includes(q)) : messages), [messages, q]);

  // Day separators + grouping of consecutive messages from the same sender.
  const rows = useMemo(
    () =>
      shownMessages.map((m, i, list) => {
        const prev = list[i - 1];
        const next = list[i + 1];
        const sameDay = (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();
        const newDay = !prev || !sameDay(prev, m);
        const firstInGroup = newDay || prev.role !== m.role || m.createdAt - prev.createdAt > GROUP_GAP_MS;
        const lastInGroup = !next || !sameDay(next, m) || next.role !== m.role || next.createdAt - m.createdAt > GROUP_GAP_MS;
        return { m, newDay, firstInGroup, lastInGroup };
      }),
    [shownMessages],
  );

  const empty = messages.length === 0;
  const lastExo = [...messages].reverse().find((m) => m.role === "assistant");
  const chips = lastExo && !streamingId ? followUps(lastExo.content, mode) : mode === "money" ? SUGGESTIONS : LIFE_SUGGESTIONS;

  const total = Number(balance || 0) + Number(savingsBalance || 0);
  const series = projectSeries(Number(savingsBalance || 0) || 0, tierApy, 12);
  const life = mode === "life";
  const accentText = life ? "text-lime-300" : "text-emerald-400";

  const modeSwitch = (
    <div role="tablist" aria-label="Exo mode" className="relative grid w-full grid-cols-2 rounded-full border border-white/[0.06] bg-black/60 p-1 text-[13px] md:w-60">
      <motion.span
        aria-hidden="true"
        layout
        transition={{ type: "spring", stiffness: 520, damping: 38 }}
        className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full ${life ? "left-[calc(50%+3px)] bg-gradient-to-r from-lime-300 to-emerald-400 shadow-[0_0_22px_rgba(190,242,100,0.35)]" : "left-1 bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_22px_rgba(16,185,129,0.45)]"}`}
      />
      {(["money", "life"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => setMode(m)}
          className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${mode === m ? "text-black" : "text-muted-foreground hover:text-foreground"}`}
        >
          {m === "money" ? <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          {m === "money" ? "Exo Money" : "Exo Life"}
        </button>
      ))}
    </div>
  );

  return (
    <div
      data-mode={mode}
      className="relative mx-auto flex h-[calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-6xl overflow-hidden bg-[#050706] md:h-[calc(100dvh-8rem)] md:rounded-[28px] md:border md:border-white/[0.06] md:shadow-[0_40px_120px_-40px_rgba(16,185,129,0.25)]"
    >
      {/* Ambient identity: Money = emerald ledger grid, Life = soft lime aurora */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className={`absolute inset-0 ${life ? "bg-[radial-gradient(60%_50%_at_80%_0%,rgba(190,242,100,0.12),transparent_70%),radial-gradient(50%_40%_at_10%_100%,rgba(16,185,129,0.10),transparent_70%)]" : "bg-[radial-gradient(60%_45%_at_50%_0%,rgba(16,185,129,0.16),transparent_70%)]"}`}
        />
        {!life && <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />}
      </div>

      <aside className={`${listOpen ? "flex" : "hidden"} relative z-10 w-full flex-col border-r border-white/[0.06] bg-black/50 backdrop-blur-xl md:flex md:w-72 md:flex-shrink-0`}>
        <ChatList threads={threadRows} activeId={activeId} onOpen={openThread} onNew={newChat} />
      </aside>

      <div className={`${listOpen ? "hidden" : "flex"} relative z-10 min-w-0 flex-1 flex-col md:flex`}>
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/40 px-4 py-3 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setListOpen(true)}
              aria-label="Chats"
              className="-ml-2 rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 md:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
              <motion.span
                aria-hidden="true"
                className={`absolute inset-0 rounded-full ${life ? "bg-[conic-gradient(from_0deg,rgba(190,242,100,0.9),transparent_40%,rgba(16,185,129,0.8),transparent_80%)]" : "bg-[conic-gradient(from_0deg,rgba(16,185,129,0.95),transparent_45%,rgba(16,185,129,0.35),transparent_85%)]"}`}
                animate={{ rotate: 360 }}
                transition={{ duration: typing ? 1.6 : 8, repeat: Infinity, ease: "linear" }}
              />
              <span aria-hidden="true" className="absolute inset-[2px] rounded-full bg-[#050706]" />
              <div className="relative">
                <ExoAvatar size={40} online thinking={typing} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{active.kind === "exo" ? "Exo" : active.title}</h1>
                <span className={`rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.14em] ${life ? "border-lime-300/30 text-lime-200" : "border-emerald-400/30 text-emerald-300"}`}>
                  {life ? "Life" : "Money"}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs leading-tight" aria-live="polite">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${life ? "bg-lime-300" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${life ? "bg-lime-300" : "bg-emerald-400"}`} />
                </span>
                <span className={accentText}>{typing ? "typing..." : "online"}</span>
              </p>
            </div>
            <div className="hidden md:block">{modeSwitch}</div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen((o) => !o);
                setQuery("");
              }}
              aria-label="Search in chat"
              aria-pressed={searchOpen}
              title="Search in chat"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={newChat}
              disabled={empty || isLoading}
              aria-label="New chat"
              title="New chat"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <SquarePen className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 md:hidden">{modeSwitch}</div>
          {searchOpen && (
            <div className="mt-2.5 flex items-center gap-2 rounded-full border border-white/[0.06] bg-black/50 px-3 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search in chat"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {q && <span className="font-mono text-xs tabular-nums text-muted-foreground">{shownMessages.length}</span>}
            </div>
          )}
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-8"
          role="log"
          aria-live="polite"
          aria-label="Exo"
        >
          {/* Pulse: Money = live money card with projection chart; Life = quick plans */}
          {!initialMessages && !q && (
            <AnimatePresence mode="wait">
              {!life ? (
                <motion.section
                  key="money"
                  aria-label="Pinned"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="relative mx-auto mb-5 max-w-2xl overflow-hidden rounded-[22px] border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.10] via-black/60 to-black/80 p-4 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.6)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Total</div>
                      <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{money(total)}</div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div className="font-mono text-emerald-300">{tierApy}% APY</div>
                      <div>12-month projection</div>
                    </div>
                  </div>
                  <Sparkline data={series} className="mt-2 h-14 w-full" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-black/40 px-3 py-2">
                      <Wallet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <div className="text-xs leading-tight">
                        <div className="text-muted-foreground">Balance</div>
                        <div className="font-mono text-sm font-semibold tabular-nums">{money(balance)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-black/40 px-3 py-2">
                      <PiggyBank className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <div className="text-xs leading-tight">
                        <div className="text-muted-foreground">Savings</div>
                        <div className="font-mono text-sm font-semibold tabular-nums">{money(savingsBalance)}</div>
                      </div>
                    </div>
                  </div>
                  {goals.length > 0 && active.kind === "exo" && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Goals">
                      <Target className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      {goals.map((g) => (
                        <span key={g.id} className="rounded-full border border-white/[0.06] bg-black/40 px-2.5 py-0.5">
                          {g.goal}
                          {g.target_amount != null && <b className="ml-1 font-mono tabular-nums">${Number(g.target_amount).toLocaleString()}</b>}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.section>
              ) : (
                <motion.section
                  key="life"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mx-auto mb-5 grid max-w-2xl grid-cols-3 gap-2"
                >
                  {LIFE_SUGGESTIONS.map((t, i) => {
                    const Icon = [Plane, Gift, UtensilsCrossed][i] ?? Sparkles;
                    return (
                      <motion.button
                        key={t}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => sendMessage(t)}
                        disabled={isLoading}
                        className="flex flex-col items-start gap-3 rounded-[20px] border border-lime-300/15 bg-gradient-to-br from-lime-300/[0.10] to-black/60 p-3 text-left text-[13px] font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-300/15 text-lime-200"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                        {t}
                      </motion.button>
                    );
                  })}
                </motion.section>
              )}
            </AnimatePresence>
          )}

          <div className="mx-auto max-w-3xl">
            {empty && !typing && (
              // No bot splash: Exo opens the conversation like a person would.
              <div className="flex flex-col pb-2">
                <MessageBubble
                  msg={{ id: "exo-hello", role: "assistant", content: life ? GREETING_LIFE : GREETING_MONEY, createdAt: Date.now() }}
                  firstInGroup
                  lastInGroup
                  mode={mode}
                  onReply={startReply}
                  onReact={() => undefined}
                  onJumpTo={() => undefined}
                />
                {!life && <p className="mt-1 pl-9 text-caption text-muted-foreground/70">Not financial advice</p>}
              </div>
            )}

            {rows.map(({ m, newDay, firstInGroup, lastInGroup }) => (
              <div key={m.id}>
                {newDay && (
                  <div className="sticky top-1 z-10 my-3 flex justify-center" role="separator">
                    <span className="rounded-full border border-white/[0.06] bg-black/70 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <MessageBubble msg={m} mode={mode} firstInGroup={firstInGroup} lastInGroup={lastInGroup} onReply={startReply} onReact={react} onJumpTo={jumpTo} />
              </div>
            ))}

            <AnimatePresence>{showDots && <TypingIndicator />}</AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              aria-label={unseen ? `${unseen} new message` : "Scroll to bottom"}
              className="absolute bottom-36 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/80 shadow-lg backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ArrowDown className="h-4 w-4" />
              {unseen > 0 && (
                <span className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full bg-emerald-400 px-1 text-caption font-bold leading-5 text-black">{unseen}</span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Composer */}
        <div className="relative z-20 px-3 pb-3 pt-2 md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" aria-label="Suggestions">
              {chips.map((c, i) => (
                <motion.button
                  key={c}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => sendMessage(c)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs text-foreground/90 backdrop-blur transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${life ? "border-lime-300/25 bg-lime-300/[0.07] hover:bg-lime-300/15 focus-visible:ring-lime-300" : "border-emerald-400/25 bg-emerald-400/[0.07] hover:bg-emerald-400/15 focus-visible:ring-emerald-400"}`}
                >
                  <Sparkles className={`h-3 w-3 ${accentText}`} aria-hidden="true" />
                  {c}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 flex items-center gap-2 overflow-hidden rounded-2xl border-l-[3px] border-emerald-400 bg-black/60 px-3 py-2 backdrop-blur"
                >
                  <Reply className="h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-semibold text-emerald-300">{replyTo.role === "user" ? "You" : "Exo"}</div>
                    <div className="truncate text-muted-foreground">{excerpt(replyTo.content)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                    className="rounded-full p-1 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form
              className={`group flex items-end gap-2 rounded-[26px] border bg-black/70 p-1.5 pl-4 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-colors focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_20px_60px_-20px_rgba(16,185,129,0.35)] ${life ? "border-lime-300/15" : "border-emerald-400/15"}`}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <label htmlFor="exo-input" className="sr-only">
                Ask Exo...
              </label>
              <textarea
                id="exo-input"
                ref={inputRef}
                rows={1}
                placeholder="Ask Exo..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
              />
              <motion.button
                key={sendPulse}
                type="submit"
                aria-label="Send"
                disabled={isLoading || !input.trim()}
                initial={sendPulse ? { scale: 0.7, rotate: -25 } : false}
                animate={{ scale: 1, rotate: 0 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-black disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${life ? "bg-gradient-to-br from-lime-300 to-emerald-400" : "bg-gradient-to-br from-emerald-300 to-emerald-600"} shadow-[0_0_24px_rgba(16,185,129,0.45)] disabled:shadow-none`}
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
