import { ExternalLink } from "lucide-react";
import type { LinkPreview } from "@/lib/exoChat";

/** Rich previews for the Sources Exo cites (title + site), Telegram-style. */
export default function LinkPreviews({ links }: { links: LinkPreview[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2.5 rounded-lg border-l-[3px] border-accent bg-background/50 px-2.5 py-2 no-underline transition hover:bg-background/80"
        >
          <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(l.host)}&sz=64`} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 flex-shrink-0 rounded" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-accent">{l.host}</span>
            <span className="block truncate text-[13px] text-foreground">{l.title}</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
