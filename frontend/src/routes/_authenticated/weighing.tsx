import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Scan, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Gauge, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/weighing")({
  head: () => ({ meta: [{ title: "Bale Weighing · TIMS" }] }),
  component: Weighing,
});

type ApiScale = { id: number; name: string; branch: string; is_active: boolean };
type ApiHessianCode = { id: number; code: string; is_active: boolean };
type ApiTicketBook = { id: number; next_number: number; end_number: number } | null;
type ApiWeighingDN = {
  id: number; dn_number: string; grower_name: string; grower_number: string;
  transporter_name: string | null; branch: string; number_of_bales: number;
  bales_captured: number; date_received: string; status: string;
};
type ApiBale = {
  id: number; group_number: number; lot_number: number; hessian_code: string;
  mass: number; ticket_number: number; created_at: string;
};


function ScaleSelector({ selectedScale, onSelect }: { selectedScale: ApiScale | null; onSelect: (s: ApiScale) => void }) {
  const { data: scales = [] } = useQuery<ApiScale[]>({ queryKey: ["scales"], queryFn: api.listScales });
  const activeScales = scales.filter((s) => s.is_active);

  return (
    <Card className={!selectedScale ? "border-warning/40" : "border-success/40"}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`size-10 rounded-md flex items-center justify-center shrink-0 ${selectedScale ? "bg-success/10" : "bg-warning/10"}`}>
          <Gauge className={`size-5 ${selectedScale ? "text-success" : "text-warning-foreground"}`} />
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Scale</div>
          <Select
            value={selectedScale ? String(selectedScale.id) : ""}
            onValueChange={(v) => {
              const s = activeScales.find((x) => String(x.id) === v);
              if (s) onSelect(s);
            }}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select a scale to begin" /></SelectTrigger>
            <SelectContent>
              {activeScales.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!selectedScale && (
          <div className="flex items-center gap-1.5 text-xs text-warning-foreground">
            <AlertTriangle className="size-3.5" />Select a scale to start weighing
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Weighing() {
  const queryClient = useQueryClient();
  const [selectedScale, setSelectedScale] = useState<ApiScale | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDN, setSelectedDN] = useState<ApiWeighingDN | null>(null);

  const [groupNumber, setGroupNumber] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [hessian, setHessian] = useState("MUN");
  const [mass, setMass] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  const { data: pendingData, isLoading: loadingPending } = useQuery<{ count: number; results: ApiWeighingDN[] }>({
    queryKey: ["pending-dns-weighing", search],
    queryFn: () => api.listPendingDeliveryNotesForWeighing(search),
  });

  const { data: bales = [] } = useQuery<ApiBale[]>({
    queryKey: ["bales", selectedDN?.id],
    queryFn: () => api.listBalesForDeliveryNote(selectedDN!.id),
    enabled: !!selectedDN,
  });

  const { data: hessianCodes = [] } = useQuery<ApiHessianCode[]>({ queryKey: ["hessian-codes"], queryFn: api.listHessianCodes });
  const { data: ticketBook } = useQuery<ApiTicketBook>({ queryKey: ["ticket-book-current"], queryFn: api.getCurrentTicketBook });

  const isClosed = selectedDN ? bales.length >= selectedDN.number_of_bales : false;
  const remaining = selectedDN ? selectedDN.number_of_bales - bales.length : 0;
  const totalMass = bales.reduce((s, b) => s + b.mass, 0);

  const invalidateAfterCapture = () => {
    queryClient.invalidateQueries({ queryKey: ["bales", selectedDN?.id] });
    queryClient.invalidateQueries({ queryKey: ["pending-dns-weighing"] });
    queryClient.invalidateQueries({ queryKey: ["ticket-book-current"] });
    queryClient.invalidateQueries({ queryKey: ["daily-bale-summary"] });
  };

  const getMass = useMutation({
    mutationFn: () => api.getScaleMass(selectedScale!.id),
    onSuccess: (data) => setMass(String(data.mass)),
    onError: () => toast.error("Failed to read mass from scale"),
  });

 const [pendingSkip, setPendingSkip] = useState<{ from: string; to: string } | null>(null);

  const buildBalePayload = (confirmSkip = false) => ({
    delivery_note: selectedDN!.id,
    group_number: parseInt(groupNumber, 10),
    lot_number: parseInt(lotNumber, 10),
    hessian_code: hessian,
    mass: parseInt(mass, 10),
    barcode: ticketNumber,
    scale: selectedScale!.id,
    confirm_skip: confirmSkip,
  });

  const addBale = useMutation({
    mutationFn: (confirmSkip: boolean = false) => api.createBale(buildBalePayload(confirmSkip)),
    onSuccess: () => {
      toast.success(`Bale registered · ${bales.length + 1} of ${selectedDN!.number_of_bales}`);
      setGroupNumber(""); setLotNumber(""); setHessian("MUN"); setMass(""); setTicketNumber("");
      invalidateAfterCapture();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.body?.skip_required) {
        setPendingSkip({ from: err.body.skipped_from, to: err.body.skipped_to });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Failed to register bale");
    },
  });

  const canCapture = !!selectedScale && !!selectedDN && !isClosed;
  const canSubmit = canCapture && groupNumber && lotNumber && hessian && mass && ticketNumber;

  const startDN = (d: ApiWeighingDN) => {
    setSelectedDN(d);
    toast.success(`Started weighing ${d.dn_number} · ${d.number_of_bales} bales expected`);
  };

  const { data: dailySummary } = useQuery<{ count: number; total_mass: number }>({
    queryKey: ["daily-bale-summary"],
    queryFn: api.getDailyBaleSummary,
  });

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Bale Weighing" description="Register weights for bales tied to a Delivery Note. System enforces D-Note bale count." />

        <div className="mb-4">
          <ScaleSelector selectedScale={selectedScale} onSelect={setSelectedScale} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Note</div>
              {selectedDN ? (
                <>
                  <div className="font-mono text-lg font-semibold mt-1">{selectedDN.dn_number}</div>
                  <div className="text-xs text-muted-foreground">{selectedDN.grower_name} · {selectedDN.grower_number}</div>
                  {isClosed && (
                    <div className="flex items-center gap-1.5 text-xs text-success mt-1">
                      <CheckCircle2 className="size-3.5" />All bales captured — select another D-Note to continue
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground mt-1">No Delivery Note selected. Choose one from the table below.</div>
              )}
            </CardContent>
          </Card>
          <Card className={selectedDN && remaining === 0 ? "border-success/40" : "border-warning/30"}>
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Progress</div>
              <div className="font-mono text-lg font-semibold mt-1">
                {selectedDN ? `${bales.length} / ${selectedDN.number_of_bales} bales` : "— / —"}
              </div>
              {selectedDN && (
                <div className="text-xs text-muted-foreground">Total mass: {totalMass} kg</div>
              )}
              <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
                {dailySummary?.count ?? 0} bales weighed today ({dailySummary?.total_mass ?? 0} kg) · {pendingData?.count ?? 0} D-Note{pendingData?.count === 1 ? "" : "s"} left
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Notes Ready for Weighing</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Search by grower to find D-Notes beyond the first 5 shown.</p>
            <div className="relative max-w-sm mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search grower name or number…" className="pl-8" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>D-Note</TableHead><TableHead>Grower</TableHead><TableHead>Transporter</TableHead>
                <TableHead>Date</TableHead><TableHead className="text-right">Bales</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingPending && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">Loading…</TableCell></TableRow>}
                {!loadingPending && (pendingData?.results.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No pending delivery notes</TableCell></TableRow>
                )}
                {pendingData?.results.map((d) => {
                  const isActive = selectedDN?.id === d.id;
                  return (
                    <TableRow key={d.id} className={isActive ? "bg-muted/40" : ""}>
                      <TableCell className="font-mono text-xs">{d.dn_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">{d.grower_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{d.grower_number}</div>
                      </TableCell>
                      <TableCell className="text-sm">{d.transporter_name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.date_received}</TableCell>
                      <TableCell className="text-right font-mono">{d.bales_captured} / {d.number_of_bales}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={isActive ? "secondary" : "default"} disabled={!selectedScale} onClick={() => startDN(d)}>
                          {isActive ? "Selected" : <>Start <ArrowRight className="size-3 ml-1" /></>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Capture Bale</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!canCapture && (
                <p className="text-xs text-muted-foreground">
                  {!selectedScale ? "Select a scale to begin." : !selectedDN ? "Select a Delivery Note to begin." : "This D-Note is fully captured. Select another to continue."}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-xs">Group Number</Label><Input value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} placeholder="1" disabled={!canCapture} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Lot Number</Label><Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="123" disabled={!canCapture} /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hessian</Label>
                <Select value={hessian} onValueChange={setHessian} disabled={!canCapture}>
                  <SelectTrigger><SelectValue placeholder="Select hessian" /></SelectTrigger>
                  <SelectContent>
                    {hessianCodes.filter((h) => h.is_active).map((h) => <SelectItem key={h.id} value={h.code}>{h.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bale Mass (kg)</Label>
                <div className="flex gap-2">
                  <Input type="number" step="1" value={mass} onChange={(e) => setMass(e.target.value)} placeholder="80" className="font-mono" disabled={!canCapture} />
                  <Button type="button" variant="outline" onClick={() => getMass.mutate()} disabled={!canCapture || getMass.isPending}>
                    {getMass.isPending ? <Loader2 className="size-4 animate-spin" /> : "Get Mass"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ticket Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (canSubmit) addBale.mutate(false);
                      }
                    }}
                    placeholder="Scan after printing"
                    className="pl-8 font-mono"
                    disabled={!canCapture}
                  />
                </div>
                {ticketBook && <p className="text-[11px] text-muted-foreground mt-1">Expected next ticket: {ticketBook.next_number}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" disabled={!canSubmit || addBale.isPending} onClick={() => addBale.mutate(false)}>
                  {addBale.isPending && <Loader2 className="size-4 animate-spin" />}Register Bale
                </Button>
                <Dialog open={!!pendingSkip} onOpenChange={(v) => !v && setPendingSkip(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Skipped Tickets</DialogTitle>
                      <DialogDescription>
                        Tickets {pendingSkip?.from} to {pendingSkip?.to} will be marked as skipped. This ticket will be recorded as the next one used.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPendingSkip(null)}>Cancel</Button>
                      <Button onClick={() => addBale.mutate(true)} disabled={addBale.isPending}>
                        {addBale.isPending && <Loader2 className="size-4 animate-spin" />}Confirm & Register
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" disabled={!canCapture} onClick={() => toast.success("Ticket printed")}><Printer className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Weighed Bales</CardTitle>
              <Badge variant="outline" className="font-mono">{totalMass} kg total</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Group</TableHead><TableHead>Lot</TableHead>
                  <TableHead>Hessian</TableHead><TableHead className="text-right">Mass (kg)</TableHead><TableHead>Ticket</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bales.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>{b.group_number}</TableCell>
                      <TableCell>{b.lot_number}</TableCell>
                      <TableCell>{b.hessian_code}</TableCell>
                      <TableCell className="text-right font-mono">{b.mass}</TableCell>
                      <TableCell className="font-mono text-xs">{b.ticket_number}</TableCell>
                    </TableRow>
                  ))}
                  {bales.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No bales weighed yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}