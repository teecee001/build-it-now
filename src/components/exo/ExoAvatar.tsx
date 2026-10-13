import { Bot } from "lucide-react";

export default function ExoAvatar({ size = 40, online = false }: { size?: number; online?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <div className="w-full h-full rounded-full bg-gradient-accent flex items-center justify-center shadow-[0_0_20px_hsl(var(--accent)/0.35)]">
        <Bot className="text-accent-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent ring-2 ring-background" />
      )}
    </div>
  );
}
