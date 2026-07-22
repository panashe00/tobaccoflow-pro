import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Printer, Search } from "lucide-react";
import { DELIVERY_NOTES, GROWERS, TRANSPORTERS, BRANCHES } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/delivery-notes")({
  head: () => ({ meta: [{ title: "Delivery Notes · TIMS" }] }),
  component: DeliveryNotes,
});

function DeliveryNotes() {
  const [q, setQ] = useState("");
  const [grower, setGrower] = useState("");
  const [growerName, setGrowerName] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = DELIVERY_NOTES.filter(
    (d) => d.dn.toLowerCase().includes(q.toLowerCase()) || d.growerName.toLowerCase().includes(q.toLowerCase()) || d.grower.toLowerCase().includes(q.toLowerCase())
  );

  const lookup = (n: string) => {
    setGrower(n);
    const g = GROWERS.find((x) => x.number.toLowerCase() === n.toLowerCase());
    setGrowerName(g?.name || "");
  };

  const submit = () => {
    if (!grower || !growerName) { toast.error("Grower number not found"); return; }
    toast.success("Delivery Note DN-2410-00237 created");
    setOpen(false);
    setGrower(""); setGrowerName("");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Delivery Notes"
          description="Capture tobacco deliveries from transporters. One transporter may deliver for multiple growers."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="size-4" />New Delivery Note</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Delivery Note</DialogTitle>
                  <DialogDescription>Record bales delivered. D-Note number is auto-generated.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">D-Note Number</Label>
                    <Input value="DN-2410-00237 (auto)" disabled className="font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date Received</Label>
                    <Input type="date" defaultValue="2024-10-22" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Grower Number *</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input value={grower} onChange={(e) => lookup(e.target.value)} placeholder="GR-2024-0142" className="pl-8 font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Grower Name</Label>
                    <Input value={growerName} disabled placeholder="Auto-filled" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Transporter</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select transporter" /></SelectTrigger>
                      <SelectContent>{TRANSPORTERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.id})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of Bales *</Label>
                    <Input type="number" placeholder="0" min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Branch</Label>
                    <Select defaultValue="Harare">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Remarks</Label>
                    <Textarea rows={2} placeholder="Optional notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit}>Create D-Note</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search D-Note, grower…" className="pl-8" />
              </div>
              <div className="text-xs text-muted-foreground">{filtered.length} of {DELIVERY_NOTES.length} records</div>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.dn}>
                      <TableCell className="font-mono text-xs">{d.dn}</TableCell>
                      <TableCell className="font-mono text-xs">{d.grower}</TableCell>
                      <TableCell>{d.growerName}</TableCell>
                      <TableCell className="text-muted-foreground">{d.transporter}</TableCell>
                      <TableCell>{d.branch}</TableCell>
                      <TableCell className="text-right font-mono">{d.bales}</TableCell>
                      <TableCell className="font-mono text-xs">{d.date}</TableCell>
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
