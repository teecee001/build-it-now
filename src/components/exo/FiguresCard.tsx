import type { Figure } from "@/lib/exoChat";

export default function FiguresCard({ figures }: { figures: Figure[] }) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-2" role="group" aria-label={figures.map((f) => `${f.label} ${f.value}`).join(", ")}>
      {figures.map((f, i) => (
        <div
          key={i}
          className={`rounded-card px-3 py-2 ${i === 0 ? "bg-gradient-accent text-accent-foreground" : "bg-background/60"}`}
        >
          <div className={`text-caption uppercase tracking-wide truncate ${i === 0 ? "opacity-90" : "text-muted-foreground"}`}>{f.label}</div>
          <div className="text-lg font-bold tabular-nums leading-tight">{f.value}</div>
        </div>
      ))}
    </div>
  );
}
