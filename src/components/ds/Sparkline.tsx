/** Minimal SVG sparkline. Renders nothing unless there are at least 2 points with some variation. */
export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  if (max === min) return null;
  const w = 100;
  const h = 28;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - 2 - ((p - min) / (max - min)) * (h - 4)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  const color = up ? "hsl(var(--success))" : "hsl(var(--destructive))";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true" data-testid="balance-sparkline">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
