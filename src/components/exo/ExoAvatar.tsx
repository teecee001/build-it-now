import { cn } from "@/lib/utils";

// Exo's avatar is the site's tab icon (public/favicon.svg), rendered exactly as-is.
// It "breathes" (gentle scale + green glow, 3s); `thinking` makes it faster and stronger (1.2s).
// No animation with prefers-reduced-motion. The online dot stays static.
export default function ExoAvatar({
  size = 40,
  online = false,
  thinking = false,
}: {
  size?: number;
  online?: boolean;
  thinking?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <div
        className={cn(
          "w-full h-full will-change-transform motion-reduce:animate-none",
          thinking ? "animate-exo-breathe-strong" : "animate-exo-breathe",
        )}
        style={{ borderRadius: size * (96 / 512) }}
      >
        <img src="/favicon.svg" alt="" width={size} height={size} draggable={false} className="block w-full h-full select-none" />
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent ring-2 ring-background" />
      )}
    </div>
  );
}
