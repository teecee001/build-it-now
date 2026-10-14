import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Copy, Reply, SmilePlus } from "lucide-react";
import ExoAvatar from "./ExoAvatar";
import ExoMarkdown from "./ExoMarkdown";
import FiguresCard from "./FiguresCard";
import { extractFigures, type ChatMessage } from "@/lib/exoChat";

const REACTIONS = ["👍", "❤️", "😂", "😮", "🙏", "🔥"];

type Props = {
  msg: ChatMessage;
  firstInGroup: boolean;
  lastInGroup: boolean;
  onReply: (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
  onJumpTo: (id: string) => void;
};

const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function MessageBubble({ msg, firstInGroup, lastInGroup, onReply, onReact, onJumpTo }: Props) {
  const mine = msg.role === "user";
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pressTimer = useRef<number>();
  const rootRef = useRef<HTMLDivElement>(null);
  const figures = mine ? [] : extractFigures(msg.content);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
    setMenuOpen(false);
  };

  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pressTimer.current = window.setTimeout(() => {
      navigator.vibrate?.(10);
      setMenuOpen(true);
    }, 450);
  };
  const endPress = () => window.clearTimeout(pressTimer.current);

  // Bubble corner shapes: tail only on the last bubble of a group, tight corners between grouped bubbles.
  const radius = mine
    ? `rounded-[20px] ${firstInGroup ? "" : "rounded-tr-md"} ${lastInGroup ? "rounded-br-[6px]" : "rounded-br-md"}`
    : `rounded-[20px] ${firstInGroup ? "" : "rounded-tl-md"} ${lastInGroup ? "rounded-bl-[6px]" : "rounded-bl-md"}`;

  return (
    <motion.div
      ref={rootRef}
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`group relative flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${lastInGroup ? "mb-2" : "mb-1"} ${msg.reaction ? "pb-3" : ""}`}
    >
      {!mine && (lastInGroup ? <ExoAvatar size={28} /> : <div className="w-7 flex-shrink-0" />)}

      <div className={`relative max-w-[82%] md:max-w-[70%] ${mine ? "order-1" : ""}`}>
        <div
          tabIndex={0}
          role="article"
          aria-label={`${mine ? "You" : "Exo"}, ${time(msg.createdAt)}`}
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ContextMenu") {
              e.preventDefault();
              setMenuOpen((o) => !o);
            }
          }}
          className={`relative px-3.5 pt-2 pb-1.5 select-text outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-card ${radius} ${
            mine ? "bg-gradient-accent text-accent-foreground" : "bg-secondary text-foreground"
          }`}
        >
          {lastInGroup && (
            <svg
              aria-hidden="true"
              viewBox="0 0 11 20"
              className={`absolute bottom-0 w-[11px] h-[20px] ${mine ? "-right-[6px] text-[hsl(160_84%_39%)]" : "-left-[6px] -scale-x-100 text-secondary"}`}
            >
              <path d="M0 0v14c0 3 2 6 6 6h5C6 20 1 15 0 0z" fill="currentColor" />
            </svg>
          )}

          {msg.replyTo && (
            <button
              type="button"
              onClick={() => onJumpTo(msg.replyTo!.id)}
              className={`mb-2 block w-full text-left rounded-lg border-l-[3px] px-2 py-1 text-[13px] ${
                mine ? "border-white/80 bg-white/15" : "border-accent bg-background/50"
              }`}
            >
              <span className={`block font-semibold text-xs ${mine ? "" : "text-accent"}`}>{msg.replyTo.role === "user" ? "You" : "Exo"}</span>
              <span className="line-clamp-2 opacity-90">{msg.replyTo.excerpt}</span>
            </button>
          )}

          {figures.length > 0 && <FiguresCard figures={figures} />}

          {mine ? (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.content}</p>
          ) : (
            <ExoMarkdown content={msg.content} />
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 text-caption ${mine ? "text-accent-foreground/80" : "text-muted-foreground"}`}>
            <time dateTime={new Date(msg.createdAt).toISOString()}>{time(msg.createdAt)}</time>
            {mine &&
              (msg.read ? (
                <CheckCheck className="w-3.5 h-3.5" aria-label="Read" />
              ) : (
                <Check className="w-3.5 h-3.5" aria-label="Sent" />
              ))}
          </div>

          {msg.reaction && (
            <button
              type="button"
              onClick={() => onReact(msg, msg.reaction!)}
              aria-label={`Reaction ${msg.reaction}`}
              className={`absolute -bottom-3.5 ${mine ? "right-3" : "left-3"} rounded-full bg-card border border-border px-2 py-1 text-sm shadow`}
            >
              {msg.reaction}
            </button>
          )}
        </div>

        {/* Hover actions (desktop) */}
        <div
          className={`absolute top-1 ${mine ? "-left-24" : "-right-24"} hidden md:flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity`}
        >
          {[
            { label: "Reply", icon: Reply, on: () => onReply(msg) },
            { label: copied ? "Copied" : "Copy", icon: Copy, on: copy },
            { label: "React", icon: SmilePlus, on: () => setMenuOpen(true) },
          ].map(({ label, icon: Icon, on }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              onClick={on}
              className="w-7 h-7 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            role="menu"
            aria-label="Message actions"
            className={`absolute z-30 top-full mt-2 ${mine ? "right-0" : "left-0"} w-56 rounded-card border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-2`}
          >
            <div className="flex justify-between px-1 pb-1.5 border-b border-border/70" role="group" aria-label="React">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="menuitem"
                  aria-label={`React ${e}`}
                  onClick={() => {
                    onReact(msg, e);
                    setMenuOpen(false);
                  }}
                  className={`w-8 h-8 rounded-full text-lg hover:bg-secondary hover:scale-125 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${msg.reaction === e ? "bg-secondary" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
            {[
              { label: "Reply", icon: Reply, on: () => { onReply(msg); setMenuOpen(false); } },
              { label: "Copy", icon: Copy, on: copy },
            ].map(({ label, icon: Icon, on }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={on}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-card text-sm hover:bg-secondary focus-visible:outline-none focus-visible:bg-secondary"
              >
                <Icon className="w-4 h-4 text-muted-foreground" /> {label}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
