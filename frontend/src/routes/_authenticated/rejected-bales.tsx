import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Scan, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rejected-bales")({
  head: () => ({ meta: [{ title: "Rejected Bales · TIMS" }] }),
  component: RejectedBales,
});

type ApiRejectionCode = { id: number; code: string; description: string; is_active: boolean };
type TicketLookup = { bale_id: number; ticket_number: string; grower_name: string; grower_number: string; mass: number; lot_number: number; hessian_code: string };
type RejectedRow = { id: number; ticket_number: string; grower_number: string; rejection_code_display: string; rejection_description: string; rejected_at: string };

function RejectedBales() {
  const [barcode, setBarcode] = useState("");
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [codeId, setCodeId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: codes = [] } = useQuery<ApiRejectionCode[]>({ queryKey: ["rejection-codes"], queryFn: api.listRejectionCodes });
  const { data: todayList = [], refetch } = useQuery<RejectedRow[]>({ queryKey: ["rejected-today"], queryFn: api.listRejectedToday });

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const reset = () => {
    setBarcode(""); setTicket(null); setCodeId("");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const doLookup = async () => {
    if (!barcode.trim()) return;
    try {
      const result = await api.lookupRejectedBale(barcode.trim());
      setTicket(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ticket not found");
      setTicket(null);
    }
  };

  const confirmReject = async () => {
    if (!ticket || !codeId) return;
    setSaving(true);
    try {
      await api.rejectBale(ticket.bale_id, parseInt(codeId, 10));
      toast.success(`Ticket ${ticket.ticket_number} rejected`);
      refetch();
      setConfirmOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject bale");
    } finally {
      setSaving(false);
    }
  };

  const selectedCode = codes.find((c) => String(c.id) === codeId);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Rejected Bales" description="Reject bales that cannot be sold. This action is permanent and cannot be undone." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Reject Ticket</CardTitle></CardHeader>
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

              {ticket && (
                <>
                  <div className="space-y-2 p-3 bg-muted/50 rounded-md text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{ticket.grower_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mass</span><span className="font-mono">{ticket.mass} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lot</span><span className="font-mono">{ticket.lot_number}</span></div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Rejection Code</Label>
                    <Select value={codeId} onValueChange={setCodeId}>
                      <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {codes.filter((c) => c.is_active).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.code} — {c.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="destructive" className="w-full" disabled={!codeId} onClick={() => setConfirmOpen(true)}>
                    <XCircle className="size-4" />Reject Bale
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rejected Today</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Grower</TableHead><TableHead>Code</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {todayList.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No bales rejected yet</TableCell></TableRow>}
                  {todayList.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.ticket_number}</TableCell>
                      <TableCell className="font-mono text-xs">{r.grower_number}</TableCell>
                      <TableCell>{r.rejection_code_display}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.rejection_description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Rejection</DialogTitle>
              <DialogDescription>This cannot be undone once confirmed.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Ticket</span><span className="font-mono">{ticket?.ticket_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{ticket?.grower_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span>{selectedCode?.code} — {selectedCode?.description}</span></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={saving}>Confirm Rejection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}