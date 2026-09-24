import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Printer, FileDown, AlertTriangle, RefreshCw, Leaf, Loader2, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/salesheet")({
  head: () => ({ meta: [{ title: "Salesheet Generation · TIMS" }] }),
  component: Salesheet,
});

function fUSD(v: string | number) { return `$${parseFloat(String(v)).toFixed(2)}`; }
function fNum(v: string | number) { return parseFloat(String(v)).toLocaleString(undefined, { maximumFractionDigits: 2 }); }

type ReadyDN = {
  delivery_note: number; dn_number: string; grower_name: string; grower_number: string;
  bales_expected: number; bales_captured: number; bales_processed: number;
};

type Mismatch = {
  id: number; lot_number: number; ticket_number: string; buyer_grade: string; price_per_kg: string;
  grade_mismatch: boolean; price_mismatch: boolean; resolved_buyer_grade: string | null;
  resolved_price_per_kg: string | null; is_resolved: boolean;
};

type PreviewRow = { bale_id: number; group_number: number; lot_number: number; mass: number; buyer_grade: string; price_per_kg: string; value: string };
type Preview = {
  delivery_note: number; grower_name: string; grower_number: string; national_id: string | null; branch: string;
  rows: PreviewRow[]; total_mass: number; gross_value: string;
  statutory_lines: { label: string; amount: string }[]; farmer_lines: { label: string; amount: string }[];
  total_deductions: string; net_value: string; usd_portion: string; zig_portion: string;
  bales_incomplete: boolean; bales_expected: number; bales_captured: number;
  unresolved_mismatches: { bale_id: number; lot_number: number }[];
};

type SalesheetRecord = {
  id: number; reference_number: string; delivery_note: number; dn_number: string;
  grower: number; grower_name: string; grower_number: string; national_id: string | null;
  branch: string; sale_date_display: string; exchange_rate: string; usd_split_percent: string;
  total_mass: number; gross_value: string; statutory_deductions_total: string; farmer_deductions_total: string;
  total_deductions: string; net_value: string; usd_portion: string; zig_portion: string; bales_incomplete: boolean;
  deduction_lines: { id: number; label: string; amount: string; category: string }[];
  generated_at: string; recalculated_at: string | null;
};

function Salesheet() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDN, setSelectedDN] = useState<ReadyDN | null>(null);
  const [existingSalesheet, setExistingSalesheet] = useState<SalesheetRecord | null>(null);
  const [usdSplit, setUsdSplit] = useState("70");
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [resolveDraft, setResolveDraft] = useState<Record<number, { grade: string; price: string }>>({});

  const { data: readyList = [] } = useQuery<ReadyDN[]>({
    queryKey: ["ready-salesheets", search],
    queryFn: () => api.listReadyForSalesheet(search),
  });

  const { data: todayList = [] } = useQuery<SalesheetRecord[]>({
    queryKey: ["today-salesheets"],
    queryFn: api.listTodaySalesheets,
  });

  const { data: preview, refetch: refetchPreview, isFetching: loadingPreview } = useQuery<Preview | null>({
    queryKey: ["salesheet-preview", selectedDN?.delivery_note, usdSplit],
    queryFn: () => api.previewSalesheet(selectedDN!.delivery_note, parseFloat(usdSplit) || 0),
    enabled: !!selectedDN && !existingSalesheet,
  });

  const { data: mismatches = [], refetch: refetchMismatches } = useQuery<Mismatch[]>({
    queryKey: ["mismatches", selectedDN?.delivery_note],
    queryFn: () => api.listMismatches(selectedDN!.delivery_note),
    enabled: !!selectedDN,
  });

  const { data: lifetime } = useQuery<{ total_mass: number; total_value: string }>({
    queryKey: ["grower-lifetime", existingSalesheet?.grower ?? selectedDN?.grower_number],
    queryFn: () => api.getGrowerLifetime(existingSalesheet ? existingSalesheet.grower : 0),
    enabled: !!existingSalesheet,
  });

  useEffect(() => setConfirmIncomplete(false), [selectedDN]);

  const unresolvedCount = mismatches.filter((m) => !m.is_resolved).length;

  const resolveMismatch = useMutation({
    mutationFn: ({ id, grade, price }: { id: number; grade: string; price: string }) =>
      api.resolveMismatch(id, grade, parseFloat(price)),
    onSuccess: () => {
      toast.success("Mismatch resolved");
      refetchMismatches();
      refetchPreview();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to resolve mismatch"),
  });

  const generate = useMutation({
    mutationFn: () =>
      api.generateSalesheet({
        delivery_note: selectedDN!.delivery_note,
        usd_split_percent: parseFloat(usdSplit),
        confirm_incomplete: confirmIncomplete,
      }),
    onSuccess: (data: SalesheetRecord) => {
      toast.success(`Salesheet ${data.reference_number} generated`);
      setExistingSalesheet(data);
      queryClient.invalidateQueries({ queryKey: ["ready-salesheets"] });
      queryClient.invalidateQueries({ queryKey: ["today-salesheets"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.body?.incomplete_bales) {
        setConfirmIncomplete(true);
        toast.warning(err.message);
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Failed to generate salesheet");
    },
  });

  const recalculate = useMutation({
    mutationFn: () => api.recalculateSalesheet(existingSalesheet!.id, parseFloat(usdSplit)),
    onSuccess: (data: SalesheetRecord) => {
      toast.success("Salesheet recalculated");
      setExistingSalesheet(data);
      queryClient.invalidateQueries({ queryKey: ["today-salesheets"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to recalculate"),
  });

  const selectReady = (dn: ReadyDN) => {
    setSelectedDN(dn);
    setExistingSalesheet(null);
    setUsdSplit("70");
  };

  const selectExisting = (s: SalesheetRecord) => {
    setExistingSalesheet(s);
    setSelectedDN(null);
    setUsdSplit(s.usd_split_percent);
  };

  const statutoryLines = existingSalesheet?.deduction_lines.filter((l) => l.category === "statutory")
    ?? preview?.statutory_lines.map((l, i) => ({ id: i, label: l.label, amount: l.amount })) ?? [];
  const farmerLines = existingSalesheet?.deduction_lines.filter((l) => l.category === "farmer")
    ?? preview?.farmer_lines.map((l, i) => ({ id: i, label: l.label, amount: l.amount })) ?? [];

  const display = existingSalesheet
    ? {
        grower_name: existingSalesheet.grower_name, grower_number: existingSalesheet.grower_number,
        national_id: existingSalesheet.national_id, sale_date: existingSalesheet.sale_date_display,
        exchange_rate: existingSalesheet.exchange_rate, reference_number: existingSalesheet.reference_number,
        total_mass: existingSalesheet.total_mass, gross_value: existingSalesheet.gross_value,
        total_deductions: existingSalesheet.total_deductions, net_value: existingSalesheet.net_value,
        usd_portion: existingSalesheet.usd_portion, zig_portion: existingSalesheet.zig_portion,
        rows: null as PreviewRow[] | null,
      }
    : preview
    ? {
        grower_name: preview.grower_name, grower_number: preview.grower_number, national_id: preview.national_id,
        sale_date: "—", exchange_rate: "—", reference_number: "Not yet generated",
        total_mass: preview.total_mass, gross_value: preview.gross_value, total_deductions: preview.total_deductions,
        net_value: preview.net_value, usd_portion: preview.usd_portion, zig_portion: preview.zig_portion,
        rows: preview.rows,
      }
    : null;

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Salesheet Generation"
          description="Generate farmer payment summary. USD/ZIG split is set per salesheet at the day's exchange rate."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 no-print">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ready for Salesheet</CardTitle>
              <div className="relative mt-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search grower…" className="h-8 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Grower</TableHead><TableHead className="text-right">Bales</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {readyList.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">Nothing ready yet</TableCell></TableRow>}
                  {readyList.map((dn) => (
                    <TableRow key={dn.delivery_note} className={selectedDN?.delivery_note === dn.delivery_note ? "bg-muted/40" : ""}>
                      <TableCell>
                        <div className="text-sm">{dn.grower_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{dn.grower_number}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{dn.bales_processed}/{dn.bales_expected}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => selectReady(dn)}>Select <ArrowRight className="size-3 ml-1" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Generated Today</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Grower</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {todayList.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">None generated yet</TableCell></TableRow>}
                  {todayList.map((s) => (
                    <TableRow key={s.id} className={existingSalesheet?.id === s.id ? "bg-muted/40" : ""}>
                      <TableCell className="font-mono text-xs">{s.reference_number}</TableCell>
                      <TableCell className="text-sm">{s.grower_name}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => selectExisting(s)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {selectedDN && !existingSalesheet && unresolvedCount > 0 && (
          <Alert className="mb-4 border-destructive/40 bg-destructive/5 no-print">
            <AlertTriangle className="size-4 text-destructive" />
            <AlertTitle className="text-destructive">{unresolvedCount} mismatched ticket{unresolvedCount === 1 ? "" : "s"} need resolving</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                {mismatches.filter((m) => !m.is_resolved).map((m) => (
                  <div key={m.id} className="flex items-end gap-2 p-2 rounded-md bg-card border">
                    <div className="text-xs">
                      <div className="font-mono">Lot {m.lot_number} · Ticket {m.ticket_number}</div>
                      <div className="text-muted-foreground">Was: {m.buyer_grade} @ ${m.price_per_kg}</div>
                    </div>
                    <div className="flex-1" />
                    <div className="space-y-1">
                      <Label className="text-[10px]">Correct Grade</Label>
                      <Input
                        className="h-7 w-20 font-mono text-xs uppercase"
                        value={resolveDraft[m.id]?.grade ?? ""}
                        onChange={(e) => setResolveDraft({ ...resolveDraft, [m.id]: { grade: e.target.value.toUpperCase(), price: resolveDraft[m.id]?.price ?? m.price_per_kg } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Correct Price</Label>
                      <Input
                        type="number" step="0.01"
                        className="h-7 w-24 font-mono text-xs"
                        value={resolveDraft[m.id]?.price ?? m.price_per_kg}
                        onChange={(e) => setResolveDraft({ ...resolveDraft, [m.id]: { grade: resolveDraft[m.id]?.grade ?? m.buyer_grade, price: e.target.value } })}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolveMismatch.mutate({ id: m.id, grade: resolveDraft[m.id]?.grade ?? m.buyer_grade, price: resolveDraft[m.id]?.price ?? m.price_per_kg })}
                      disabled={resolveMismatch.isPending}
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {selectedDN && !existingSalesheet && preview?.bales_incomplete && (
          <Alert className="mb-4 border-warning/40 bg-warning/5 no-print">
            <AlertTriangle className="size-4 text-warning-foreground" />
            <AlertTitle>Not all bales captured</AlertTitle>
            <AlertDescription>
              Only {preview.bales_captured} of {preview.bales_expected} bales have been captured for this Delivery Note.
              {confirmIncomplete ? " Proceeding with a partial capture." : " You can still generate, but confirm first."}
            </AlertDescription>
          </Alert>
        )}

        {selectedDN && !existingSalesheet && (
          <div className="flex items-end gap-3 mb-4 no-print">
            <div className="space-y-1.5 w-40">
              <Label className="text-xs">USD Split %</Label>
              <Input type="number" min={0} max={100} value={usdSplit} onChange={(e) => setUsdSplit(e.target.value)} className="font-mono" />
            </div>
            <Button variant="outline" onClick={() => refetchPreview()} disabled={loadingPreview}>
              {loadingPreview && <Loader2 className="size-4 animate-spin" />}Refresh Preview
            </Button>
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || unresolvedCount > 0}
            >
              {generate.isPending && <Loader2 className="size-4 animate-spin" />}
              {preview?.bales_incomplete && !confirmIncomplete ? "Generate (will prompt to confirm)" : "Generate Salesheet"}
            </Button>
          </div>
        )}

        {existingSalesheet && (
          <div className="flex items-center gap-3 mb-4 no-print">
            <div className="space-y-1.5 w-40">
              <Label className="text-xs">USD Split %</Label>
              <Input type="number" min={0} max={100} value={usdSplit} onChange={(e) => setUsdSplit(e.target.value)} className="font-mono" />
            </div>
            <Button variant="outline" onClick={() => recalculate.mutate()} disabled={recalculate.isPending}>
              {recalculate.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Recalculate
            </Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
            <Button variant="outline" onClick={() => toast.success("PDF exported")}><FileDown className="size-4" />Export PDF</Button>
          </div>
        )}

        {display && (
          <Card className="print-area">
            <CardContent className="p-8">
              <div className="flex items-start justify-between border-b pb-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-md bg-primary flex items-center justify-center"><Leaf className="size-6 text-primary-foreground" /></div>
                  <div>
                    <div className="font-semibold text-lg">TIMS · Salesheet</div>
                    <div className="text-xs text-muted-foreground">{display.reference_number}</div>
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div className="flex gap-4"><span className="text-muted-foreground">Sale Date:</span><span className="font-mono font-medium">{display.sale_date}</span></div>
                  <div className="flex gap-4"><span className="text-muted-foreground">Exchange Rate:</span><span className="font-mono font-medium">{display.exchange_rate === "—" ? "—" : `USD 1 = ZIG ${display.exchange_rate}`}</span></div>
                  <div className="flex gap-4"><span className="text-muted-foreground">Grower #:</span><span className="font-mono font-medium">{display.grower_number}</span></div>
                  <div className="flex gap-4"><span className="text-muted-foreground">Grower:</span><span className="font-medium">{display.grower_name}</span></div>
                  <div className="flex gap-4"><span className="text-muted-foreground">National ID:</span><span>{display.national_id ?? "—"}</span></div>
                </div>
              </div>

              {display.rows && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Group</TableHead><TableHead>Lot</TableHead>
                    <TableHead className="text-right">Mass (kg)</TableHead><TableHead>Buyer Grade</TableHead>
                    <TableHead className="text-right">Price/kg (USD)</TableHead><TableHead className="text-right">Bale Value (USD)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {display.rows.map((r) => (
                      <TableRow key={r.bale_id}>
                        <TableCell>{r.group_number}</TableCell>
                        <TableCell>{r.lot_number}</TableCell>
                        <TableCell className="text-right font-mono">{r.mass}</TableCell>
                        <TableCell>{r.buyer_grade}</TableCell>
                        <TableCell className="text-right font-mono">${parseFloat(r.price_per_kg).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fUSD(r.value)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell colSpan={2}>TOTAL ({display.rows.length} bales)</TableCell>
                      <TableCell className="text-right font-mono">{display.total_mass}</TableCell>
                      <TableCell></TableCell><TableCell></TableCell>
                      <TableCell className="text-right font-mono">{fUSD(display.gross_value)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              <div className="grid grid-cols-2 gap-8 mt-8">
                <Card className="border-dashed">
                  <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Deductions</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {statutoryLines.map((d) => (
                      <div key={`s-${d.id}`} className="flex justify-between"><span className="text-muted-foreground">{d.label}</span><span className="font-mono">{fUSD(d.amount)}</span></div>
                    ))}
                    {farmerLines.length > 0 && <div className="border-t pt-2 mt-2 font-medium">Farmer Deductions</div>}
                    {farmerLines.map((d) => (
                      <div key={`f-${d.id}`} className="flex justify-between"><span className="text-muted-foreground">{d.label}</span><span className="font-mono">{fUSD(d.amount)}</span></div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                      <span>Total Deductions</span><span className="font-mono text-destructive">−{fUSD(display.total_deductions)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Net Payable</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Gross Sale Value</span><span className="font-mono">{fUSD(display.gross_value)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Less Deductions</span><span className="font-mono">−{fUSD(display.total_deductions)}</span></div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-base"><span>Net Amount</span><span className="font-mono text-primary">{fUSD(display.net_value)}</span></div>
                    <div className="border-t pt-3 mt-3 space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Payment Split ({usdSplit}/{100 - parseFloat(usdSplit || "0")})</div>
                      <div className="flex justify-between p-2 bg-card rounded"><span>USD Portion</span><span className="font-mono font-semibold">{fUSD(display.usd_portion)}</span></div>
                      <div className="flex justify-between p-2 bg-card rounded"><span>ZIG Portion</span><span className="font-mono font-semibold">ZIG {fNum(display.zig_portion)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {lifetime && (
                <div className="mt-6 p-3 rounded-md border bg-muted/30 text-xs flex justify-between">
                  <span className="text-muted-foreground">Total ever brought to floor (for valuation)</span>
                  <span className="font-mono">{fNum(lifetime.total_mass)} kg · {fUSD(lifetime.total_value)}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t">
                {["Sales Clerk", "Branch Manager", "Grower"].map((s) => (
                  <div key={s}><div className="border-b border-foreground/40 h-10" /><div className="text-xs text-muted-foreground mt-1">{s} · Signature & Date</div></div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}