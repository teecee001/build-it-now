import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { FearGreedGauge } from "@/components/FearGreedGauge";

/** Crypto-only sentiment strip for the Markets page. */
export function FearGreedSection({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="fear-greed"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="grid md:grid-cols-[minmax(0,320px)_1fr] gap-3 items-stretch">
            <FearGreedGauge variant="full" />
            <Card className="p-4 md:p-5 flex flex-col justify-center border-border/80 bg-card/50">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                How to read this
              </p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                The index scores crypto market sentiment from 0 (extreme fear) to 100 (extreme greed)
                using volatility, volume, social buzz, dominance, and trends. Extreme readings often
                mark crowded positioning — useful context next to price, not a buy or sell signal.
              </p>
              <p className="text-[11px] text-muted-foreground mt-3">
                Source: alternative.me · Refreshes every few minutes
              </p>
            </Card>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
