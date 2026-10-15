import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronsUpDown, MessagesSquare, Reply, Search, Sparkles, SquarePen, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ExoAvatar from "@/components/exo/ExoAvatar";
import MessageBubble from "@/components/exo/MessageBubble";
import TypingIndicator from "@/components/exo/TypingIndicator";
import ChatList, { type ThreadRow } from "@/components/exo/ChatList";
import { useWallet } from "@/hooks/useWallet";
import { useAccountTier } from "@/hooks/useAccountTier";
import { apyForBoost, askExo, extractLinks, followUps, loadMode, saveMode, splitReply, stripSources, type ExoMode, excerpt, loadHistory, loadThreads, MAIN_THREAD, newId, saveHistory, saveThreads, threadKey, type ChatMessage, type ChatThread } from "@/lib/exoChat";

const SUGGESTIONS = [
  "What's happening in crypto markets today?",
  "How should I think about portfolio risk?",
  "Explain dollar-cost averaging simply",
  "What are key factors for long-term investing?",
];

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

export default function ExoApp({ initialMessages, forceTyping }: Props = {}) {
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
  const { savingsBalance } = useWallet();
  const { config: tierConfig } = useAccountTier();
  // Savings APY by plan: Personal 6%, Pro 8%, Business 9%, Bank 10%.
  const tierApy = apyForBoost(tierConfig?.apyBoost);
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

  const life = mode === "life";
  // Live context chips: built from the user's real data, then from Exo's last reply.
  const contextChips = life
    ? LIFE_SUGGESTIONS
    : [
        ...(goals[0] ? [`How am I tracking on ${goals[0].goal}?`] : []),
        ...(Number(savingsBalance) > 0 ? [`Project my savings at ${tierApy}% APY`] : []),
        ...SUGGESTIONS,
      ];
  const shownChips = (lastExo && !streamingId ? chips : contextChips).slice(0, 2);

  return (
    <div data-mode={mode} className="fixed inset-0 z-40 flex bg-black text-foreground">
      <aside className={`${listOpen ? "flex" : "hidden"} w-full flex-col border-r border-white/[0.06] bg-black md:flex md:w-72 md:flex-shrink-0`}>
        <ChatList threads={threadRows} activeId={activeId} onOpen={openThread} onNew={newChat} />
      </aside>

      <div className={`${listOpen ? "hidden" : "flex"} relative min-w-0 flex-1 flex-col md:flex`} style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <header className="flex items-center gap-1 px-3 py-3 md:px-6">
          <Link
            to="/dashboard"
            aria-label="Back to ExoSky"
            title="Back to ExoSky"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ExoAvatar size={28} thinking={typing} />
            <h1 className="truncate text-[19px] font-semibold tracking-tight">{active.kind === "exo" ? "Exo" : active.title}</h1>
            {typing && <span className="text-xs text-muted-foreground" aria-live="polite">typing...</span>}
          </div>
          <button type="button" onClick={() => setListOpen(true)} aria-label="Chats" title="Chats" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:hidden">
            <MessagesSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen((o) => !o);
              setQuery("");
            }}
            aria-label="Search in chat"
            aria-pressed={searchOpen}
            title="Search in chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={newChat}
            disabled={empty || isLoading}
            aria-label="New chat"
            title="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </header>
        {searchOpen && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 md:mx-6">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search in chat" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            {q && <span className="font-mono text-xs tabular-nums text-muted-foreground">{shownMessages.length}</span>}
          </div>
        )}

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 md:px-8" role="log" aria-live="polite" aria-label="Exo">
          {empty && !typing ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 opacity-30" aria-hidden="true">
              <ExoAvatar size={88} />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {rows.map(({ m, newDay, firstInGroup, lastInGroup }) => (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-3 flex justify-center" role="separator">
                      <span className="text-[11px] font-medium text-muted-foreground">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <MessageBubble msg={m} mode={mode} firstInGroup={firstInGroup} lastInGroup={lastInGroup} onReply={startReply} onReact={react} onJumpTo={jumpTo} />
                </div>
              ))}
              <AnimatePresence>{showDots && <TypingIndicator />}</AnimatePresence>
            </div>
          )}
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
              className="absolute bottom-44 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ArrowDown className="h-4 w-4" />
              {unseen > 0 && <span className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full bg-emerald-400 px-1 text-caption font-bold leading-5 text-black">{unseen}</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <div className="px-3 pb-3 pt-1 md:px-8">
          <div className="mx-auto max-w-3xl">
            {!typing && (
              <div className="mb-2.5 grid grid-cols-2 gap-2" aria-label="Suggestions">
                {shownChips.map((c, i) => (
                  <motion.button
                    key={c}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => sendMessage(c)}
                    className="min-w-0 truncate rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm font-medium text-foreground/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {replyTo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 flex items-center gap-2 overflow-hidden rounded-2xl border-l-[3px] border-emerald-400 bg-white/[0.04] px-3 py-2">
                  <Reply className="h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-semibold text-emerald-300">{replyTo.role === "user" ? "You" : "Exo"}</div>
                    <div className="truncate text-muted-foreground">{excerpt(replyTo.content)}</div>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="rounded-full p-1 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form
              className="rounded-[28px] border border-white/10 bg-[#0d0d0e] px-4 pb-2.5 pt-3 transition-colors focus-within:border-white/20"
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
                className="max-h-40 min-h-[28px] w-full resize-none bg-transparent text-[16px] leading-7 outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={life}
                  aria-label={life ? "Exo Life. Switch to Exo Money" : "Exo Money. Switch to Exo Life"}
                  onClick={() => setMode(life ? "money" : "life")}
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {life ? <Sparkles className="h-3.5 w-3.5 text-lime-300" aria-hidden="true" /> : <Wallet className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />}
                  {life ? "Exo Life" : "Exo Money"}
                  <ChevronsUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </button>
                {!life && <span className="text-[11px] text-muted-foreground/70">Not financial advice</span>}
                <motion.button
                  key={sendPulse}
                  type="submit"
                  aria-label="Send"
                  disabled={isLoading || !input.trim()}
                  initial={sendPulse ? { scale: 0.7 } : false}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="ml-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ArrowUp className="h-5 w-5" />
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
