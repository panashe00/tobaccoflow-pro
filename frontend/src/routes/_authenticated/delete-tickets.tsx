import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Scan, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/delete-tickets")({
  head: () => ({ meta: [{ title: "Delete Tickets · TIMS" }] }),
  component: DeleteTickets,
});

type TicketLookup = {
  bale_id: number; ticket_number: string; delivery_note: number; dn_number: string;
  grower_name: string; grower_number: string; group_number: number; lot_number: number;
  hessian_code: string; mass: number;
};

type DeletedRow = {
  id: number; dn_number: string; grower_number: string; ticket_number: string;
  lot_number: number; mass: number; reason: string; deleted_at: string;
};

function DeleteTickets() {
  const [barcode, setBarcode] = useState("");
  const [ticket, setTicket] = useState<TicketLookup | null>(null);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: todayList = [], refetch } = useQuery<DeletedRow[]>({ queryKey: ["deleted-today"], queryFn: api.listDeletedToday });

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const reset = () => {
    setBarcode(""); setTicket(null); setReason("");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  const doLookup = async () => {
    if (!barcode.trim()) return;
    try {
      const result = await api.lookupDeletableTicket(barcode.trim());
      setTicket(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ticket not found");
      setTicket(null);
    }
  };

  const confirmDelete = async () => {
    if (!ticket || !reason.trim()) return;
    setSaving(true);
    try {
      await api.deleteTicket(ticket.bale_id, reason.trim());
      toast.success(`Ticket ${ticket.ticket_number} deleted`);
      refetch();
      setConfirmOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Delete Tickets"
          description="Remove a bale captured in error (wrong barcode, wrong bale, bad data). The Delivery Note's bale count is freed up and can be re-captured."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Delete Ticket</CardTitle></CardHeader>
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
                    <div className="flex justify-between"><span className="text-muted-foreground">D-Note</span><span className="font-mono">{ticket.dn_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{ticket.grower_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lot</span><span className="font-mono">{ticket.lot_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mass</span><span className="font-mono">{ticket.mass} kg</span></div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reason for Deletion</Label>
                    <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong bale scanned by mistake" />
                  </div>

                  <Button variant="destructive" className="w-full" disabled={!reason.trim()} onClick={() => setConfirmOpen(true)}>
                    <Trash2 className="size-4" />Delete Ticket
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Deleted Today</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>D-Note</TableHead><TableHead>Grower</TableHead><TableHead>Ticket</TableHead>
                  <TableHead>Lot</TableHead><TableHead className="text-right">Mass</TableHead><TableHead>Reason</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {todayList.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No tickets deleted yet</TableCell></TableRow>}
                  {todayList.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.dn_number}</TableCell>
                      <TableCell className="font-mono text-xs">{d.grower_number}</TableCell>
                      <TableCell className="font-mono text-xs">{d.ticket_number}</TableCell>
                      <TableCell className="font-mono text-xs">{d.lot_number}</TableCell>
                      <TableCell className="text-right font-mono">{d.mass}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{d.reason}</TableCell>
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
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                This permanently removes ticket {ticket?.ticket_number} from {ticket?.dn_number}. The Delivery Note's captured bale count will drop by one, and this ticket number/lot can be re-used.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={saving}>Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}