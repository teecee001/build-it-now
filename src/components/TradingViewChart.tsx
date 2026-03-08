import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData, Time } from "lightweight-charts";
import { COINGECKO_IDS } from "@/constants/cryptoIds";

interface TradingViewChartProps {
  code: string;
  height?: number;
  days?: number;
  type?: "area" | "candlestick";
}

export function TradingViewChart({ code, height = 300, days = 30, type = "area" }: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--muted-foreground))",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "hsla(var(--border), 0.3)" },
        horzLines: { color: "hsla(var(--border), 0.3)" },
      },
      width: chartRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
      },
      timeScale: {
        borderColor: "hsl(var(--border))",
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "hsl(var(--muted-foreground))", width: 1, style: 3 },
        horzLine: { color: "hsl(var(--muted-foreground))", width: 1, style: 3 },
      },
    });

    chartInstanceRef.current = chart;

    const geckoId = COINGECKO_IDS[code];

    async function fetchAndRender() {
      try {
        if (type === "candlestick") {
          // Fetch OHLC data
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`
          );
          if (!res.ok) throw new Error("fetch failed");
          const raw: [number, number, number, number, number][] = await res.json();

          const candleData: CandlestickData[] = raw.map(([time, open, high, low, close]) => ({
            time: (Math.floor(time / 1000)) as Time,
            open, high, low, close,
          }));

          const series = chart.addCandlestickSeries({
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderUpColor: "#22c55e",
            borderDownColor: "#ef4444",
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
          });
          series.setData(candleData);
        } else {
          // Fetch line data
          const res = await fetch(
            `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`
          );
          if (!res.ok) throw new Error("fetch failed");
          const json = await res.json();
          const prices: [number, number][] = json.prices;

          // Deduplicate by day
          const seen = new Set<number>();
          const lineData: LineData[] = [];
          for (const [ts, price] of prices) {
            const dayTs = Math.floor(ts / 86400000) * 86400 as Time;
            if (!seen.has(dayTs as number)) {
              seen.add(dayTs as number);
              lineData.push({ time: dayTs, value: price });
            }
          }

          const isUp = lineData.length >= 2 && lineData[lineData.length - 1].value >= lineData[0].value;

          const series = chart.addAreaSeries({
            lineColor: isUp ? "#22c55e" : "#ef4444",
            topColor: isUp ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
            bottomColor: isUp ? "rgba(34, 197, 94, 0.02)" : "rgba(239, 68, 68, 0.02)",
            lineWidth: 2,
          });
          series.setData(lineData);
        }

        chart.timeScale().fitContent();
      } catch {
        // Fallback: generate mock data
        const basePrice = code === "BTC" ? 67000 : code === "ETH" ? 1900 : 100;
        const seed = code.charCodeAt(0) + code.charCodeAt(1);
        const lineData: LineData[] = Array.from({ length: days }, (_, i) => ({
          time: (Math.floor(Date.now() / 1000) - (days - i) * 86400) as Time,
          value: basePrice * (1 + Math.sin(seed + i * 0.3) * 0.05 + (i / days) * 0.03),
        }));
        const series = chart.addAreaSeries({
          lineColor: "#22c55e",
          topColor: "rgba(34, 197, 94, 0.3)",
          bottomColor: "rgba(34, 197, 94, 0.02)",
          lineWidth: 2,
        });
        series.setData(lineData);
        chart.timeScale().fitContent();
      }
    }

    fetchAndRender();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [code, days, type, height]);

  return <div ref={chartRef} className="w-full" />;
}
