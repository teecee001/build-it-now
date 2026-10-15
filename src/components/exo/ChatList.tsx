import { Search, SquarePen, Target } from "lucide-react";
import { useState } from "react";
import ExoAvatar from "./ExoAvatar";
import { excerpt, type ChatThread } from "@/lib/exoChat";

export type ThreadRow = ChatThread & { last?: string; lastAt?: number; unread?: number };

const when = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

type Props = { threads: ThreadRow[]; activeId: string; onOpen: (id: string) => void; onNew: () => void };

/** Telegram-style conversation list: Exo first, then goals and saved chats. */
export default function ChatList({ threads, activeId, onOpen, onNew }: Props) {
  const [q, setQ] = useState("");
  const shown = q.trim() ? threads.filter((t) => `${t.title} ${t.last ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) : threads;
  return (
    <nav aria-label="Chats" className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <h2 className="flex-1 text-base font-semibold">Chats</h2>
        <button
          type="button"
          onClick={onNew}
          aria-label="New chat"
          title="New chat"
          className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SquarePen className="h-4 w-4" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search chats</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
        </label>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {shown.map((t) => {
          const active = t.id === activeId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-card px-2 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-accent/15" : "hover:bg-secondary"}`}
              >
                {t.kind === "goal" ? (
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                    <Target className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : (
                  <ExoAvatar size={44} online={t.kind === "exo"} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="flex-1 truncate text-sm font-semibold">{t.title}</span>
                    <span className="text-caption text-muted-foreground">{when(t.lastAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-muted-foreground">{t.last ? excerpt(t.last, 60) : "\u00a0"}</span>
                    {!!t.unread && !active && (
                      <span className="h-5 min-w-5 rounded-full bg-accent px-1.5 text-center text-caption font-bold leading-5 text-accent-foreground">{t.unread}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
