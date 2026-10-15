import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, PiggyBank, Reply, Search, Sparkles, SquarePen, Target, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ExoAvatar from "@/components/exo/ExoAvatar";
import MessageBubble from "@/components/exo/MessageBubble";
import TypingIndicator from "@/components/exo/TypingIndicator";
import ChatList, { type ThreadRow } from "@/components/exo/ChatList";
import { useWallet } from "@/hooks/useWallet";
import { useSavings } from "@/hooks/useSavings";
import { askExo, extractLinks, followUps, loadMode, saveMode, splitReply, stripSources, type ExoMode, excerpt, loadHistory, loadThreads, MAIN_THREAD, newId, saveHistory, saveThreads, threadKey, type ChatMessage, type ChatThread } from "@/lib/exoChat";

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
  const { apyRate } = useSavings();
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

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8rem)] w-full max-w-5xl overflow-hidden md:rounded-card md:border md:border-border/60">
      <aside className={`${listOpen ? "flex" : "hidden"} w-full flex-col border-r border-border/60 bg-background md:flex md:w-72 md:flex-shrink-0`}>
        <ChatList threads={threadRows} activeId={activeId} onOpen={openThread} onNew={newChat} />
      </aside>
      <div className={`${listOpen ? "hidden" : "flex"} relative min-w-0 flex-1 flex-col md:flex`}>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-label="Chats"
          className="-ml-2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <ExoAvatar size={40} online thinking={typing} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight tracking-tight">{active.kind === "exo" ? "Exo" : active.title}</h1>
          <p className="truncate text-xs leading-tight" aria-live="polite">
            {typing ? (
              <span className="text-accent">typing...</span>
            ) : (
              <span className="text-accent">online</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchOpen((o) => !o);
            setQuery("");
          }}
          aria-label="Search in chat"
          aria-pressed={searchOpen}
          title="Search in chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={newChat}
          disabled={empty || isLoading}
          aria-label="New chat"
          title="New chat"
          className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SquarePen className="h-4 w-4" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </header>

      <div className="flex items-center justify-center border-b border-border/60 bg-background/80 px-4 py-2">
        <div role="tablist" aria-label="Exo mode" className="relative grid w-full max-w-xs grid-cols-2 rounded-full bg-secondary p-1 text-sm">
          <motion.span
            aria-hidden="true"
            layout
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-accent shadow-[0_0_16px_hsl(var(--accent)/0.35)] ${mode === "money" ? "left-1" : "left-[calc(50%+3px)]"}`}
          />
          {(["money", "life"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === m ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "money" ? <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              {m === "money" ? "Exo Money" : "Exo Life"}
            </button>
          ))}
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-background/80 px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search in chat"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && <span className="text-xs tabular-nums text-muted-foreground">{shownMessages.length}</span>}
        </div>
      )}

      {/* Pinned money cards */}
      {!initialMessages && mode === "money" && (
        <div className="flex gap-2 overflow-x-auto border-b border-border/60 bg-secondary/30 px-4 py-2 [scrollbar-width:none]" aria-label="Pinned">
          <div className="flex min-w-[150px] items-center gap-2 rounded-card border-l-[3px] border-accent bg-background/70 px-3 py-1.5">
            <Wallet className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="text-xs leading-tight">
              <div className="text-muted-foreground">Balance</div>
              <div className="font-semibold tabular-nums">{money(balance)}</div>
            </div>
          </div>
          <div className="flex min-w-[150px] items-center gap-2 rounded-card border-l-[3px] border-accent bg-background/70 px-3 py-1.5">
            <PiggyBank className="h-4 w-4 text-accent" aria-hidden="true" />
            <div className="text-xs leading-tight">
              <div className="text-muted-foreground">Savings</div>
              <div className="font-semibold tabular-nums">
                {money(savingsBalance)} <span className="font-normal text-accent">· {apyRate}% APY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {goals.length > 0 && active.kind === "exo" && mode === "money" && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border/60 bg-secondary/40 px-4 py-2 text-xs" aria-label="Goals">
          <Target className="h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
          {goals.map((g) => (
            <span key={g.id} className="whitespace-nowrap rounded-full bg-background/70 px-3 py-1">
              {g.goal}
              {g.target_amount != null && <b className="ml-1 tabular-nums">${Number(g.target_amount).toLocaleString()}</b>}
              {g.target_date && (
                <span className="ml-1 text-muted-foreground">· {new Date(g.target_date).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.07),transparent_60%)] px-3 py-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-label="Exo"
      >
        {empty && !typing && (
          // No bot splash: Exo opens the conversation like a person would.
          <div className="flex min-h-full flex-col justify-end pb-2">
            <MessageBubble
              msg={{ id: "exo-hello", role: "assistant", content: mode === "money" ? GREETING_MONEY : GREETING_LIFE, createdAt: Date.now() }}
              firstInGroup
              lastInGroup
              onReply={startReply}
              onReact={() => undefined}
              onJumpTo={() => undefined}
            />
            {mode === "money" && <p className="mt-1 pl-9 text-caption text-muted-foreground/70">Not financial advice</p>}
          </div>
        )}

        {rows.map(({ m, newDay, firstInGroup, lastInGroup }) => (
          <div key={m.id}>
            {newDay && (
              <div className="sticky top-1 z-10 my-3 flex justify-center" role="separator">
                <span className="rounded-full bg-secondary/90 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">{dayLabel(m.createdAt)}</span>
              </div>
            )}
            <MessageBubble msg={m} firstInGroup={firstInGroup} lastInGroup={lastInGroup} onReply={startReply} onReact={react} onJumpTo={jumpTo} />
          </div>
        ))}

        <AnimatePresence>{showDots && <TypingIndicator />}</AnimatePresence>
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
            className="absolute bottom-36 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowDown className="h-4 w-4" />
            {unseen > 0 && (
              <span className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full bg-accent px-1 text-caption font-bold leading-5 text-accent-foreground">{unseen}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/85 px-3 pb-3 pt-2 backdrop-blur-xl md:px-6">
        <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] md:-mx-6 md:px-6" aria-label="Suggestions">
          {chips.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={isLoading}
              className="whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-foreground/90 transition hover:bg-accent/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {s}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-2 overflow-hidden rounded-card border-l-[3px] border-accent bg-secondary px-3 py-2"
            >
              <Reply className="h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-semibold text-accent">{replyTo.role === "user" ? "You" : "Exo"}</div>
                <div className="truncate text-muted-foreground">{excerpt(replyTo.content)}</div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="rounded-full p-1 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          className="flex items-end gap-2"
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
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-3xl border border-border bg-secondary px-4 py-3 text-[15px] leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-accent text-accent-foreground shadow-[0_0_20px_hsl(var(--accent)/0.35)] disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        </form>
      </div>
      </div>
    </div>
  );
}
