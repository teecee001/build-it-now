import { Card } from "@/components/ui/card";
import { ConversionResult } from "@/types";

interface ConversionHistoryProps {
  history: ConversionResult[];
}

export const ConversionHistory = ({ history }: ConversionHistoryProps) => {
  return (
    <Card className="p-8 bg-card border-border">
      <h2 className="text-2xl font-semibold mb-6">Conversion History</h2>
      
      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No conversions yet. Try converting a currency!</p>
        ) : (
          history.slice().reverse().map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-gradient-accent text-accent-foreground font-medium transition-transform hover:scale-[1.02]"
            >
              {item.amount} {item.from} → {item.result.toFixed(4)} {item.to} ({item.timestamp.toLocaleString()})
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
