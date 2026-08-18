import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Printer, Search, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/delivery-notes")({
  head: () => ({ meta: [{ title: "Delivery Notes · TIMS" }] }),
  component: DeliveryNotes,
});

type ApiSaleDate = { id: number; date: string; exchange_rate: string; is_open: boolean };
type ApiGrowerLite = { id: number; grower_number: string; first_name: string; last_name: string };
type ApiTransporter = { id: number; transporter_number: string; first_name: string; last_name: string };
type ApiDeliveryNote = {
  id: number; dn_number: string; sale_date_display: string; date_received: string;
  grower: number; grower_name: string; grower_number: string;
  transporter: number | null; transporter_name: string | null;
  branch: string; number_of_bales: number; remarks: string | null; status: string;
};

function TransporterCombobox({ value, onSelect }: {
  value: ApiTransporter | null;
  onSelect: (t: ApiTransporter | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: results = [] } = useQuery<ApiTransporter[]>({
    queryKey: ["transporter-search", query],
    queryFn: () => api.searchTransporters(query),
    enabled: query.length > 0 && !value,
  });

  return (
    <div className="relative">
      <Input
        value={value ? `${value.first_name} ${value.last_name} (${value.transporter_number})` : query}
        onChange={(e) => { onSelect(null); setQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
        placeholder="Search name or transporter number…"
      />
      {showResults && query && !value && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
          {results.map((t) => (
            <button
              type="button"
              key={t.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onClick={() => { onSelect(t); setQuery(""); setShowResults(false); }}
            >
              {t.first_name} {t.last_name} <span className="text-muted-foreground font-mono text-xs">({t.transporter_number})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDeliveryNoteDialog({ open, onOpenChange, saleDate, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleDate: ApiSaleDate | null | undefined;
  onCreated: () => void;
}) {
  const [dateReceived, setDateReceived] = useState(saleDate?.date ?? "");
  const [growerNumber, setGrowerNumber] = useState("");
  const [grower, setGrower] = useState<ApiGrowerLite | null>(null);
  const [growerNotFound, setGrowerNotFound] = useState(false);
  const [transporter, setTransporter] = useState<ApiTransporter | null>(null);
  const [bales, setBales] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lookupGrower = async () => {
    if (!growerNumber.trim()) { setGrower(null); setGrowerNotFound(false); return; }
    try {
      const result = await api.lookupGrower(growerNumber.trim());
      if (result) { setGrower(result); setGrowerNotFound(false); }
      else { setGrower(null); setGrowerNotFound(true); }
    } catch {
      setGrower(null);
      setGrowerNotFound(true);
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.createDeliveryNote({
        date_received: dateReceived,
        grower: grower!.id,
        transporter: transporter?.id ?? null,
        number_of_bales: parseInt(bales, 10),
        remarks: remarks || null,
      }),
    onSuccess: () => {
      toast.success("Delivery Note created");
      onCreated();
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create Delivery Note"),
  });

  const canSubmit = !!grower && !!bales && parseInt(bales, 10) > 0 && !!dateReceived;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Delivery Note</DialogTitle>
            <DialogDescription>Record bales delivered. D-Note number is auto-generated.</DialogDescription>
          </DialogHeader>

          {!saleDate ? (
            <p className="text-sm text-destructive">No sale date is currently open. Ask an admin to open one before capturing Delivery Notes.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Sale Date</Label>
                <Input value={saleDate.date} disabled className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date Received</Label>
                <Input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grower Number *</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={growerNumber}
                    onChange={(e) => { setGrowerNumber(e.target.value); setGrower(null); setGrowerNotFound(false); }}
                    onBlur={lookupGrower}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupGrower(); } }}
                    placeholder="GR-2024-0142"
                    className="pl-8 font-mono"
                  />
                </div>
                {growerNotFound && <p className="text-xs text-destructive mt-1">Grower number not found</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grower Name</Label>
                <Input value={grower ? `${grower.first_name} ${grower.last_name}` : ""} disabled placeholder="Auto-filled" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transporter (optional)</Label>
                <TransporterCombobox value={transporter} onSelect={setTransporter} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number of Bales *</Label>
                <Input type="number" min={1} value={bales} onChange={(e) => setBales(e.target.value)} placeholder="0" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Remarks</Label>
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!saleDate || !canSubmit} onClick={() => setConfirmOpen(true)}>
              Create D-Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery Note</DialogTitle>
            <DialogDescription>Please confirm the details before creating.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grower</span>
              <span className="font-medium">{grower ? `${grower.first_name} ${grower.last_name}` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Number of Bales</span>
              <span className="font-medium font-mono">{bales}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}Confirm & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeliveryNotes() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const queryClient = useQueryClient();

  const { data: saleDate } = useQuery<ApiSaleDate | null>({ queryKey: ["sale-date-current"], queryFn: api.getCurrentSaleDate });
  const { data: notes = [], isLoading } = useQuery<ApiDeliveryNote[]>({
    queryKey: ["delivery-notes", q],
    queryFn: () => api.listDeliveryNotes(q),
  });

  const openCreate = () => { setFormSession((s) => s + 1); setOpen(true); };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Delivery Notes"
          description="Capture tobacco deliveries from transporters. One transporter may deliver for multiple growers."
          actions={<Button onClick={openCreate}><Plus className="size-4" />New Delivery Note</Button>}
        />

        <CreateDeliveryNoteDialog
          key={formSession}
          open={open}
          onOpenChange={setOpen}
          saleDate={saleDate}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["delivery-notes"] })}
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search D-Note, grower…" className="pl-8" />
              </div>
              <div className="text-xs text-muted-foreground">{notes.length} records</div>
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>D-Note</TableHead>
                    <TableHead>Grower #</TableHead>
                    <TableHead>Grower Name</TableHead>
                    <TableHead>Transporter</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Bales</TableHead>
                    <TableHead>Date Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  )}
                  {!isLoading && notes.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No delivery notes found.</TableCell></TableRow>
                  )}
                  {notes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.dn_number}</TableCell>
                      <TableCell className="font-mono text-xs">{d.grower_number}</TableCell>
                      <TableCell>{d.grower_name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.transporter_name ?? "—"}</TableCell>
                      <TableCell>{d.branch}</TableCell>
                      <TableCell className="text-right font-mono">{d.number_of_bales}</TableCell>
                      <TableCell className="font-mono text-xs">{d.date_received}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toast.success("Sent to printer")}>
                          <Printer className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}