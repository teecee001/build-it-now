import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { useProfile } from "@/hooks/useProfile";
import { Download, FileText, FileSpreadsheet, Calendar, X } from "lucide-react";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface StatementExportProps {
  open: boolean;
  onClose: () => void;
}

export function StatementExport({ open, onClose }: StatementExportProps) {
  const { transactions } = useTransactions();
  const { profile } = useProfile();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  if (!open) return null;

  const filtered = transactions.filter(tx => {
    if (!startDate || !endDate) return true;
    const txDate = parseISO(tx.created_at);
    return isWithinInterval(txDate, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate)),
    });
  });

  const generateCSV = (txs: Transaction[]) => {
    const headers = ["Date", "Type", "Description", "Recipient", "Amount", "Currency", "Status"];
    const rows = txs.map(tx => [
      format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
      tx.type,
      tx.description || "",
      tx.recipient || "",
      String(tx.amount),
      tx.currency,
      tx.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    return csv;
  };

  const generatePDFContent = (txs: Transaction[]) => {
    const name = profile?.full_name || "Account Holder";
    const handle = profile?.handle || "";
    const dateRange = startDate && endDate
      ? `${format(parseISO(startDate), "MMM d, yyyy")} — ${format(parseISO(endDate), "MMM d, yyyy")}`
      : "All Time";

    const totalIn = txs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 32px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
  .summary-item { }
  .summary-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; }
  .positive { color: #16a34a; }
  .negative { color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e5e5; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
  tr:hover { background: #fafafa; }
  .amount { font-family: 'Courier New', monospace; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #999; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f0f0f0; }
</style></head><body>
<h1>Ξ╳oSky Statement</h1>
<div class="subtitle">${name} ${handle} · ${dateRange} · Generated ${format(new Date(), "MMM d, yyyy")}</div>
<div class="summary">
  <div class="summary-item"><div class="summary-label">Money In</div><div class="summary-value positive">+$${totalIn.toFixed(2)}</div></div>
  <div class="summary-item"><div class="summary-label">Money Out</div><div class="summary-value negative">-$${totalOut.toFixed(2)}</div></div>
  <div class="summary-item"><div class="summary-label">Net</div><div class="summary-value">${(totalIn - totalOut) >= 0 ? '+' : '-'}$${Math.abs(totalIn - totalOut).toFixed(2)}</div></div>
  <div class="summary-item"><div class="summary-label">Transactions</div><div class="summary-value">${txs.length}</div></div>
</div>
<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>`;

    txs.forEach(tx => {
      const amt = Number(tx.amount);
      const cls = amt >= 0 ? "positive" : "";
      html += `<tr>
        <td>${format(new Date(tx.created_at), "MMM d, yyyy")}</td>
        <td><span class="badge">${tx.type.replace("_", " ")}</span></td>
        <td>${tx.description || "—"}</td>
        <td>${tx.status}</td>
        <td class="amount ${cls}" style="text-align:right">${amt >= 0 ? '+' : '-'}$${Math.abs(amt).toFixed(2)}</td>
      </tr>`;
    });

    html += `</tbody></table>
<div class="footer">
  <p>Ξ╳oSky · Confidential Account Statement · This document is generated for informational purposes only.</p>
</div></body></html>`;
    return html;
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No transactions in selected range");
      return;
    }

    if (exportFormat === "csv") {
      const csv = generateCSV(filtered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `x_money_statement_${startDate || "all"}_${endDate || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} transactions as CSV`);
    } else {
      const html = generatePDFContent(filtered);
      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        // Give it a moment to load, then trigger print (which allows save as PDF)
        setTimeout(() => win.print(), 500);
      }
      toast.success(`Statement generated — use Print > Save as PDF`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 bg-card border-border space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold">Export Statement</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Start Date
            </label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> End Date
            </label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportFormat("csv")}
              className={`p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                exportFormat === "csv" ? "border-accent bg-accent/5" : "border-border bg-secondary hover:bg-secondary/80"
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${exportFormat === "csv" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-sm font-medium">CSV</p>
                <p className="text-[10px] text-muted-foreground">Spreadsheet format</p>
              </div>
            </button>
            <button
              onClick={() => setExportFormat("pdf")}
              className={`p-3 rounded-lg border transition-colors flex items-center gap-2 ${
                exportFormat === "pdf" ? "border-accent bg-accent/5" : "border-border bg-secondary hover:bg-secondary/80"
              }`}
            >
              <FileText className={`w-4 h-4 ${exportFormat === "pdf" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-sm font-medium">PDF</p>
                <p className="text-[10px] text-muted-foreground">Printable statement</p>
              </div>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Transactions found</span>
          <Badge variant="secondary" className="font-mono">{filtered.length}</Badge>
        </div>

        <Button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
        >
          <Download className="w-4 h-4" /> Export {exportFormat.toUpperCase()}
        </Button>
      </Card>
    </div>
  );
}
