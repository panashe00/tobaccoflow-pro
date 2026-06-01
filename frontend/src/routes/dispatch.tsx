import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Scan, Printer, Truck } from "lucide-react";
import { BALES, formatNum } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch · TIMS" }] }),
  component: Dispatch,
});

const initial = BALES.filter((b) => b.verified).slice(0, 6).map((b, i) => ({
  ...b,
  time: `08:${String(12 + i * 4).padStart(2, "0")}`,
}));

function Dispatch() {
  const [scanned, setScanned] = useState(initial);
  const [bc, setBc] = useState("");

  const add = () => {
    const b = BALES.find((x) => x.barcode === bc);
    if (!b) { toast.error("Barcode not found"); return; }
    if (scanned.some((s) => s.barcode === bc)) { toast.error("Already scanned"); return; }
    setScanned([...scanned, { ...b, time: new Date().toTimeString().slice(0, 5) }]);
    setBc("");
    toast.success("Bale loaded");
  };

  const totalMass = scanned.reduce((s, b) => s + b.mass, 0);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Dispatch"
          description="Scan barcodes while loading the truck. Generates printable dispatch manifest."
          actions={<Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print Manifest</Button>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <Card><CardContent className="p-4">
            <Label className="text-xs">Truck Registration</Label>
            <Input defaultValue="ABG 4521" className="font-mono mt-1.5" />
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Label className="text-xs">Driver Name</Label>
            <Input defaultValue="Joseph Madziva" className="mt-1.5" />
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Label className="text-xs">Destination</Label>
            <Input defaultValue="Boka Auction Floors, Harare" className="mt-1.5" />
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Label className="text-xs">Dispatch Date</Label>
            <Input type="date" defaultValue="2024-10-22" className="font-mono mt-1.5" />
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scan to Load</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={bc} onChange={(e) => setBc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Scan ticket" className="pl-8 font-mono" autoFocus />
                </div>
              </div>
              <Button onClick={add} className="w-full"><Truck className="size-4" />Load Bale</Button>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 bg-muted/40 rounded-md text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bales Loaded</div>
                  <div className="text-2xl font-semibold font-mono mt-1">{scanned.length}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded-md text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Mass</div>
                  <div className="text-2xl font-semibold font-mono mt-1">{formatNum(totalMass)}</div>
                  <div className="text-[10px] text-muted-foreground">kg</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 print-area">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Dispatch Manifest</CardTitle>
              <Badge variant="outline" className="font-mono">{scanned.length} bales · {formatNum(totalMass)} kg</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead>Barcode</TableHead><TableHead>Grower</TableHead>
                  <TableHead>Grade</TableHead><TableHead className="text-right">Mass (kg)</TableHead><TableHead>Time</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {scanned.map((b, i) => (
                    <TableRow key={b.barcode}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{b.barcode}</TableCell>
                      <TableCell className="font-mono text-xs">{b.grower}</TableCell>
                      <TableCell>{b.buyerGrade}</TableCell>
                      <TableCell className="text-right font-mono">{b.mass.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">{b.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
