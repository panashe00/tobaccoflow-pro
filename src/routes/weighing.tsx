import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Scan, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DELIVERY_NOTES, SALE_DATE, formatNum } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/weighing")({
  head: () => ({ meta: [{ title: "Bale Weighing · TIMS" }] }),
  component: Weighing,
});

const initial = [
  { group: "G01", lot: "L120", hessian: "HS-450", mass: 82.5, barcode: "BC8801234500" },
  { group: "G01", lot: "L121", hessian: "HS-451", mass: 79.0, barcode: "BC8801234501" },
  { group: "G02", lot: "L122", hessian: "HS-452", mass: 86.2, barcode: "BC8801234502" },
];

function Weighing() {
  const [dn, setDn] = useState("DN-2410-00231");
  const [bales, setBales] = useState(initial);
  const [mass, setMass] = useState("");
  const [group, setGroup] = useState("");
  const [lot, setLot] = useState("");
  const [hessian, setHessian] = useState("");
  const [barcode, setBarcode] = useState("");

  const note = DELIVERY_NOTES.find((d) => d.dn === dn);
  const limit = note?.bales || 0;
  const remaining = limit - bales.length;
  const totalMass = bales.reduce((s, b) => s + b.mass, 0);

  const add = () => {
    if (remaining <= 0) { toast.error(`Bale limit reached (${limit})`); return; }
    if (!mass || !group || !lot || !barcode) { toast.error("All fields required"); return; }
    setBales([...bales, { group, lot, hessian, mass: parseFloat(mass), barcode }]);
    setMass(""); setLot(""); setHessian(""); setBarcode("");
    toast.success(`Bale registered · ${bales.length + 1} of ${limit}`);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Bale Weighing" description="Register weights for bales tied to a Delivery Note. System enforces D-Note bale count." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card><CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Note</div>
            <div className="font-mono text-lg font-semibold mt-1">{dn}</div>
            <div className="text-xs text-muted-foreground">{note?.growerName} · {note?.grower}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sale Date</div>
            <div className="font-mono text-lg font-semibold mt-1">{SALE_DATE}</div>
            <div className="text-xs text-muted-foreground">From system settings</div>
          </CardContent></Card>
          <Card className={remaining === 0 ? "border-success/40" : "border-warning/30"}><CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Progress</div>
            <div className="font-mono text-lg font-semibold mt-1">{bales.length} / {limit} bales</div>
            <div className={`text-xs flex items-center gap-1 ${remaining === 0 ? "text-success" : "text-warning-foreground"}`}>
              {remaining === 0 ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              {remaining} remaining · Total mass: {formatNum(totalMass)} kg
            </div>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Capture Bale</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Note</Label>
                <Select value={dn} onValueChange={(v) => { setDn(v); setBales([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DELIVERY_NOTES.map((d) => <SelectItem key={d.dn} value={d.dn}>{d.dn} · {d.growerName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-xs">Group</Label><Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="G01" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Lot Number</Label><Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="L123" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Hessian Shortcode</Label><Input value={hessian} onChange={(e) => setHessian(e.target.value)} placeholder="HS-453" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bale Mass (kg)</Label>
                <Input type="number" step="0.01" value={mass} onChange={(e) => setMass(e.target.value)} placeholder="80.50" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ticket Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan after printing" className="pl-8 font-mono" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={add} className="flex-1" disabled={remaining <= 0}>Register Bale</Button>
                <Button variant="outline" onClick={() => toast.success("Ticket printed")}><Printer className="size-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Weighed Bales</CardTitle>
              <Badge variant="outline" className="font-mono">{formatNum(totalMass)} kg total</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Group</TableHead><TableHead>Lot</TableHead>
                  <TableHead>Hessian</TableHead><TableHead className="text-right">Mass (kg)</TableHead><TableHead>Barcode</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bales.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>{b.group}</TableCell>
                      <TableCell>{b.lot}</TableCell>
                      <TableCell>{b.hessian}</TableCell>
                      <TableCell className="text-right font-mono">{b.mass.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">{b.barcode}</TableCell>
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
