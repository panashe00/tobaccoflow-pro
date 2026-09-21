import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scan, Search, Loader2, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pre-processing")({
  head: () => ({ meta: [{ title: "Ticket Pre-Processing · TIMS" }] }),
  component: PreProcessing,
});

type ApiTimbGrade = { id: number; code: string; is_active: boolean };
type ApiBuyerGrade = { id: number; code: string; is_active: boolean };
type ApiCurrentBuyer = { id: number; name: string } | null;

type TicketLookup = {
  bale_id: number;
  ticket_number: string;
  grower_name: string;
  grower_number: string;
  mass: number;
  lot_number: number;
  group_number: number;
  hessian_code: string;
  is_editable: boolean;
  existing: { timb_grade: string; buyer_grade: string; price_per_kg: string } | null;
};

type PreProcessedRow = {
  id: number;
  ticket_number: string;
  grower_number: string;
  mass: number;
  timb_grade: string;
  buyer_grade: string;
  price_per_kg: string;
};

function PreProcessing() {
  const [barcode, setBarcode] = useState("");
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [timb, setTimb] = useState("");
  const [buyerGrade, setBuyerGrade] = useState("");
  const [price, setPrice] = useState("");
  const [timbError, setTimbError] = useState("");
  const [buyerGradeError, setBuyerGradeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const barcodeRef = useRef<HTMLInputElement>(null);
  const timbRef = useRef<HTMLInputElement>(null);
  const buyerRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const { data: timbGrades = [] } = useQuery<ApiTimbGrade[]>({ queryKey: ["grades"], queryFn: () => api.listGrades() });
  const { data: currentBuyer } = useQuery<ApiCurrentBuyer>({ queryKey: ["current-buyer"], queryFn: api.getCurrentBuyer });
  const { data: buyerGrades = [] } = useQuery<ApiBuyerGrade[]>({
    queryKey: ["buyer-grades", currentBuyer?.id],
    queryFn: () => api.listBuyerGrades(currentBuyer!.id),
    enabled: !!currentBuyer,
  });

  const { data: todayList = [], refetch: refetchToday } = useQuery<PreProcessedRow[]>({
    queryKey: ["preprocessed-today", q],
    queryFn: () => api.listPreProcessedToday(q),
  });

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const resetForNextTicket = () => {
    setBarcode(""); setTicket(null); setTimb(""); setBuyerGrade(""); setPrice("");
    setTimbError(""); setBuyerGradeError("");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const doLookup = async () => {
    if (!barcode.trim()) return;
    try {
      const result: TicketLookup = await api.lookupTicketForPreProcessing(barcode.trim());
      setTicket(result);
      if (result.existing) {
        setTimb(result.existing.timb_grade);
        setBuyerGrade(result.existing.buyer_grade);
        setPrice(result.existing.price_per_kg);
      } else {
        setTimb(""); setBuyerGrade(""); setPrice("");
      }
      setTimeout(() => timbRef.current?.focus(), 0);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ticket not found");
      setTicket(null);
    }
  };

  const validateTimb = () => {
    if (!timb) { setTimbError(""); return true; }
    const valid = timbGrades.some((g) => g.is_active && g.code.toLowerCase() === timb.toLowerCase());
    setTimbError(valid ? "" : `"${timb}" is not a valid TIMB grade`);
    return valid;
  };

  const validateBuyerGrade = () => {
    if (!buyerGrade) { setBuyerGradeError(""); return true; }
    const valid = buyerGrades.some((g) => g.is_active && g.code.toLowerCase() === buyerGrade.toLowerCase());
    setBuyerGradeError(valid ? "" : `"${buyerGrade}" is not a valid grade for ${currentBuyer?.name ?? "the current buyer"}`);
    return valid;
  };

  const canSave = !!ticket?.is_editable && !!timb && !!buyerGrade && !!price && !timbError && !buyerGradeError;

  const save = async () => {
    if (!ticket) return;
    const timbOk = validateTimb();
    const buyerOk = validateBuyerGrade();
    if (!timbOk || !buyerOk) return;
    if (!price) { toast.error("Price is required"); return; }

    setSaving(true);
    try {
      await api.saveTicketPreProcessing({
        bale: ticket.bale_id,
        timb_grade: timb,
        buyer_grade: buyerGrade,
        price_per_kg: parseFloat(price),
      });
      toast.success(`Ticket ${ticket.ticket_number} pre-processed`);
      refetchToday();
      resetForNextTicket();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Ticket Pre-Processing"
          description={`Capture buyer's information from tickets${currentBuyer ? ` · Buyer: ${currentBuyer.name}` : ""}`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scan Ticket</CardTitle></CardHeader>
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
                    placeholder="Scan or type"
                    className="pl-8 font-mono"
                  />
                </div>
              </div>

              {ticket ? (
                <>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{ticket.grower_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bale Mass</span><span className="font-mono">{ticket.mass} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lot</span><span className="font-mono">{ticket.lot_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Hessian</span><span className="font-mono">{ticket.hessian_code}</span></div>
                    {!ticket.is_editable && (
                      <div className="flex items-center gap-1 text-warning-foreground pt-1 border-t"><span>Sale date closed — read only</span></div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">TIMB Grade</Label>
                    <Input
                      ref={timbRef}
                      value={timb}
                      onChange={(e) => { setTimb(e.target.value.toUpperCase()); setTimbError(""); }}
                      onBlur={validateTimb}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (validateTimb()) buyerRef.current?.focus(); } }}
                      placeholder="e.g. L1G"
                      className="font-mono uppercase"
                      disabled={!ticket.is_editable}
                    />
                    {timbError && <p className="text-xs text-destructive">{timbError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Buyer Grade</Label>
                    <Input
                      ref={buyerRef}
                      value={buyerGrade}
                      onChange={(e) => { setBuyerGrade(e.target.value.toUpperCase()); setBuyerGradeError(""); }}
                      onBlur={validateBuyerGrade}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (validateBuyerGrade()) priceRef.current?.focus(); } }}
                      placeholder="e.g. A1"
                      className="font-mono uppercase"
                      disabled={!ticket.is_editable}
                    />
                    {buyerGradeError && <p className="text-xs text-destructive">{buyerGradeError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Price Allocated (USD/kg)</Label>
                    <Input
                      ref={priceRef}
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
                      placeholder="3.85"
                      className="font-mono"
                      disabled={!ticket.is_editable}
                    />
                  </div>

                  <Button onClick={save} className="w-full" disabled={!canSave || saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {ticket.existing ? "Update Pre-Processing" : "Save Pre-Processing"}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">Scan a ticket barcode to begin</div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Pre-Processed Today</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by grower" className="pl-8 h-8 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Ticket</TableHead><TableHead>Grower</TableHead>
                  <TableHead className="text-right">Mass</TableHead><TableHead>TIMB</TableHead>
                  <TableHead>Buyer Grade</TableHead><TableHead className="text-right">$/kg</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {todayList.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.ticket_number}</TableCell>
                      <TableCell className="font-mono text-xs">{row.grower_number}</TableCell>
                      <TableCell className="text-right font-mono">{row.mass}</TableCell>
                      <TableCell>{row.timb_grade}</TableCell>
                      <TableCell>{row.buyer_grade}</TableCell>
                      <TableCell className="text-right font-mono">${parseFloat(row.price_per_kg).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {todayList.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No tickets pre-processed yet</TableCell></TableRow>
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