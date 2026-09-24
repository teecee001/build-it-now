import { useQuery } from "@tanstack/react-query";

export type FearGreedClass =
  | "Extreme Fear"
  | "Fear"
  | "Neutral"
  | "Greed"
  | "Extreme Greed";

export interface FearGreedPoint {
  value: number;
  classification: FearGreedClass;
  timestamp: number; // unix seconds
}

export interface FearGreedData {
  current: FearGreedPoint;
  previous: FearGreedPoint | null;
  history: FearGreedPoint[]; // oldest → newest
  delta: number | null; // current - previous
}

function classify(value: number): FearGreedClass {
  if (value <= 24) return "Extreme Fear";
  if (value <= 44) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 74) return "Greed";
  return "Extreme Greed";
}

async function fetchFearGreed(): Promise<FearGreedData> {
  const res = await fetch("https://api.alternative.me/fng/?limit=30&format=json");
  if (!res.ok) throw new Error("Fear & Greed unavailable");
  const json = await res.json();
  const rows = (json?.data ?? []) as { value: string; value_classification: string; timestamp: string }[];
  if (!rows.length) throw new Error("Fear & Greed empty");

  // API returns newest first
  const points: FearGreedPoint[] = rows
    .map((r) => {
      const value = Number(r.value);
      if (!Number.isFinite(value)) return null;
      return {
        value: Math.max(0, Math.min(100, Math.round(value))),
        classification: (r.value_classification as FearGreedClass) || classify(value),
        timestamp: Number(r.timestamp) || 0,
      };
    })
    .filter((p): p is FearGreedPoint => !!p);

  if (!points.length) throw new Error("Fear & Greed parse failed");

  const current = points[0];
  const previous = points[1] ?? null;
  const history = [...points].reverse(); // oldest → newest for charts
  const delta = previous ? current.value - previous.value : null;

  return { current, previous, history, delta };
}

export function useFearGreed() {
  const query = useQuery({
    queryKey: ["fear-greed-index"],
    queryFn: fetchFearGreed,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/** Map 0–100 value to a Tailwind-friendly accent for the band. */
export function fearGreedTone(value: number): {
  text: string;
  bg: string;
  ring: string;
  stroke: string;
  label: FearGreedClass;
} {
  const label = classify(value);
  if (value <= 24) {
    return { text: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/30", stroke: "#f87171", label };
  }
  if (value <= 44) {
    return { text: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/30", stroke: "#fb923c", label };
  }
  if (value <= 55) {
    return { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/30", stroke: "#fbbf24", label };
  }
  if (value <= 74) {
    return { text: "text-lime-400", bg: "bg-lime-500/10", ring: "ring-lime-500/30", stroke: "#a3e635", label };
  }
  return { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", stroke: "#34d399", label };
}
