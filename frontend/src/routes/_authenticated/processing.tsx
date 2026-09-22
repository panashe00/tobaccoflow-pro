import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scan, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/processing")({
  head: () => ({ meta: [{ title: "Bale Processing · TIMS" }] }),
  component: Processing,
});

type TicketLookup = {
  bale_id: number;
  ticket_number: string;
  grower_name: string;
  grower_number: string;
  mass: number;
  lot_number: number;
  hessian_code: string;
  is_editable: boolean;
  already_processed: boolean;
  existing: { buyer_grade: string; price_per_kg: string; grade_mismatch: boolean; price_mismatch: boolean } | null;
};

type ProcessedRow = {
  id: number;
  ticket_number: string;
  grower_number: string;
  pre_grade: string | null;
  final_grade: string;
  pre_price: string | null;
  final_price: string;
  has_mismatch: boolean;
};

function Processing() {
  const [barcode, setBarcode] = useState("");
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [buyerGrade, setBuyerGrade] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ has_mismatch: boolean; grade_mismatch: boolean; price_mismatch: boolean } | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const gradeRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const { data: todayList = [], refetch: refetchToday } = useQuery<ProcessedRow[]>({
    queryKey: ["bale-processing-today"],
    queryFn: () => api.listBaleProcessingToday(),
  });

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const reset = () => {
    setBarcode(""); setTicket(null); setBuyerGrade(""); setPrice(""); setLastResult(null);
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const doLookup = async () => {
    if (!barcode.trim()) return;
    try {
      const result: TicketLookup = await api.lookupBaleProcessing(barcode.trim());
      setTicket(result);
      setLastResult(null);
      if (result.already_processed && result.existing) {
        // Already processed — show as read-only, mismatch (if any) already known.
        setBuyerGrade(result.existing.buyer_grade);
        setPrice(result.existing.price_per_kg);
      } else {
        setBuyerGrade(""); setPrice("");
        setTimeout(() => gradeRef.current?.focus(), 0);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ticket not found");
      setTicket(null);
      setTimeout(() => barcodeRef.current?.focus(), 0);
    }
  };

  const save = async () => {
    if (!ticket || !buyerGrade || !price) return;
    setSaving(true);
    try {
      const result = await api.saveBaleProcessing({
        bale: ticket.bale_id,
        buyer_grade: buyerGrade,
        price_per_kg: parseFloat(price),
      });
      setLastResult(result);
      if (result.grade_mismatch || result.price_mismatch) {
        toast.warning(`Ticket ${ticket.ticket_number} verified — mismatch flagged`);
      } else {
        toast.success(`Ticket ${ticket.ticket_number} verified`);
      }
      refetchToday();
      setTimeout(() => reset(), 1200);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const canEdit =
    ticket &&
    !ticket.already_processed &&
    ticket.is_editable;

  const canSave =
    canEdit &&
    buyerGrade.trim() !== "" &&
    price.trim() !== "";

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Bale Processing" description="Final ticket verification. Re-captures grade and price independently, then flags any mismatch against pre-processing." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Verify Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    ref={barcodeRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doLookup(); } }}
                    placeholder="Scan ticket"
                    className="pl-8 font-mono"
                  />
                </div>
              </div>

              {ticket && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{ticket.grower_number}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Mass</span><span className="font-mono">{ticket.mass} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lot</span><span className="font-mono">{ticket.lot_number}</span></div>
                  {ticket.already_processed && (
                    <div className="pt-1 border-t text-muted-foreground">Already processed — read only</div>
                  )}
                  {!ticket.is_editable && !ticket.already_processed && (
                    <div className="pt-1 border-t text-warning-foreground">Sale date closed — read only</div>
                  )}
                </div>
              )}

              {ticket && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Buyer Grade (re-capture)</Label>
                    <Input
                      ref={gradeRef}
                      value={buyerGrade}
                      onChange={(e) => setBuyerGrade(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); priceRef.current?.focus(); } }}
                      placeholder="e.g. A1"
                      className="font-mono uppercase"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price (USD/kg, re-capture)</Label>
                    <Input
                      ref={priceRef}
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
                      className="font-mono"
                      disabled={!canEdit}
                    />
                  </div>

                  {lastResult && (lastResult.grade_mismatch || lastResult.price_mismatch) && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive p-2 rounded-md bg-destructive/5">
                      <AlertTriangle className="size-3.5" />
                      Mismatch flagged — {lastResult.grade_mismatch && "grade"}{lastResult.grade_mismatch && lastResult.price_mismatch && " & "}{lastResult.price_mismatch && "price"}. Cannot be resolved here.
                    </div>
                  )}

                  <Button onClick={save} className="w-full" disabled={!canSave || saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}Verify & Save
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Processed Tickets · Verification Status</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Ticket</TableHead><TableHead>Grower</TableHead>
                  <TableHead>Pre-Grade</TableHead><TableHead>Final Grade</TableHead>
                  <TableHead className="text-right">Pre $/kg</TableHead><TableHead className="text-right">Final $/kg</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {todayList.map((row) => (
                    <TableRow key={row.id} className={row.has_mismatch ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs">{row.ticket_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.grower_number}</TableCell>
                      <TableCell>{row.pre_grade ?? "—"}</TableCell>
                      <TableCell className={row.has_mismatch ? "text-destructive font-medium" : ""}>{row.final_grade}</TableCell>
                      <TableCell className="text-right font-mono">{row.pre_price ? `$${parseFloat(row.pre_price).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className={`text-right font-mono ${row.has_mismatch ? "text-destructive font-medium" : ""}`}>${parseFloat(row.final_price).toFixed(2)}</TableCell>
                      <TableCell>
                        {row.has_mismatch
                          ? <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" /><StatusBadge status="mismatch" /></span>
                          : <span className="inline-flex items-center gap-1 text-xs"><CheckCircle2 className="size-3 text-success" /><StatusBadge status="verified" /></span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {todayList.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">No tickets processed yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}