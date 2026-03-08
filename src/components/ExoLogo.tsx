import { cn } from "@/lib/utils";

interface ExoLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Show just the mark (Ξ╳) or mark + wordmark */
  variant?: "mark" | "full";
}

const sizes = {
  xs: { mark: "text-sm", box: "w-6 h-6", word: "text-sm" },
  sm: { mark: "text-base", box: "w-7 h-7", word: "text-base" },
  md: { mark: "text-lg", box: "w-8 h-8", word: "text-lg" },
  lg: { mark: "text-2xl", box: "w-12 h-12", word: "text-2xl" },
  xl: { mark: "text-3xl", box: "w-14 h-14", word: "text-3xl" },
};

export function ExoLogo({ size = "md", variant = "full", className }: ExoLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          s.box,
          "rounded-lg bg-gradient-accent flex items-center justify-center font-bold tracking-tighter text-primary-foreground select-none"
        )}
      >
        <span className={cn(s.mark, "leading-none")}>Ξ╳</span>
      </div>
      {variant === "full" && (
        <span className={cn(s.word, "font-bold tracking-tight")}>
          <span className="bg-gradient-accent bg-clip-text text-transparent">Ξ╳</span>oSky
        </span>
      )}
    </div>
  );
}
