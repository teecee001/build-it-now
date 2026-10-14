import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Lucide dot instead of the "●" glyph; same "Live" / "Demo" wording. */
export function LiveDot() {
  return <Circle className="w-2 h-2 fill-current" aria-hidden="true" />;
}

export function LiveBadge({ isLive, className = "text-xs" }: { isLive: boolean; className?: string }) {
  return (
    <Badge variant={isLive ? "default" : "secondary"} className={`gap-1 ${className}`}>
      {isLive ? <><LiveDot />Live</> : "Demo"}
    </Badge>
  );
}
