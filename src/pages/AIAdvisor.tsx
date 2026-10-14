import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Reply, SquarePen, Target, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ExoAvatar from "@/components/exo/ExoAvatar";
import MessageBubble from "@/components/exo/MessageBubble";
import TypingIndicator from "@/components/exo/TypingIndicator";
import { askExo, clearHistory, excerpt, loadHistory, newId, saveHistory, type ChatMessage } from "@/lib/exoChat";

const SUGGESTIONS = [
  "What's happening in crypto markets today?",
  "How should I think about portfolio risk?",
  "Explain dollar-cost averaging simply",
  "What are key factors for long-term investing?",
];

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typing = isLoading || !!forceTyping;

  // Resolve the signed-in user, load their history and (optionally) their Exo goals.
  useEffect(() => {
    if (initialMessages) return;
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const uid = data.session?.user.id ?? "anon";
      setUserKey(uid);
      setMessages(loadHistory(uid));
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
    if (userKey && userKey !== "preview") saveHistory(userKey, messages);
  }, [messages, userKey]);

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
    const result = await askExo(history);
    setMessages((prev) => [
      ...prev.map((m) => (m.role === "user" ? { ...m, read: true } : m)),
      { id: newId(), role: "assistant", content: result.text, createdAt: Date.now() },
    ]);
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

  const newChat = () => {
    if (isLoading) return;
    setMessages([]);
    setReplyTo(null);
    if (userKey && userKey !== "preview") clearHistory(userKey);
    inputRef.current?.focus();
  };

  // Day separators + grouping of consecutive messages from the same sender.
  const rows = useMemo(
    () =>
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const sameDay = (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();
        const newDay = !prev || !sameDay(prev, m);
        const firstInGroup = newDay || prev.role !== m.role || m.createdAt - prev.createdAt > GROUP_GAP_MS;
        const lastInGroup = !next || !sameDay(next, m) || next.role !== m.role || next.createdAt - m.createdAt > GROUP_GAP_MS;
        return { m, newDay, firstInGroup, lastInGroup };
      }),
    [messages],
  );

  const empty = messages.length === 0;

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <ExoAvatar size={40} online thinking={typing} />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight tracking-tight">Exo</h1>
          <p className="truncate text-xs leading-tight" aria-live="polite">
            {typing ? (
              <span className="text-accent">typing...</span>
            ) : (
              <span className="text-muted-foreground">
                <span className="text-accent">online</span> · Exo Intelligence · Not financial advice
              </span>
            )}
          </p>
        </div>
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

      {goals.length > 0 && (
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
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
            <ExoAvatar size={72} online />
            <div>
              <p className="text-heading">Exo</p>
              <p className="text-sm text-muted-foreground">Ask Exo about markets, budgets, investing, or strategy</p>
            </div>
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

        <AnimatePresence>{typing && <TypingIndicator />}</AnimatePresence>
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
          {SUGGESTIONS.map((s) => (
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
  );
}
