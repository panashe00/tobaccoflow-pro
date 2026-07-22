import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scan, Search } from "lucide-react";
import { BALES, SALE_DATE } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pre-processing")({
  head: () => ({ meta: [{ title: "Ticket Pre-Processing · TIMS" }] }),
  component: PreProcessing,
});

const GRADES = ["L1G", "L2L", "L3K", "X3K", "C1L", "C2L", "C3L", "B1L", "B2L"];

function PreProcessing() {
  const [barcode, setBarcode] = useState("");
  const [bale, setBale] = useState<typeof BALES[0] | null>(null);
  const [timb, setTimb] = useState("");
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState("");
  const [q, setQ] = useState("");

  const scan = (v: string) => {
    setBarcode(v);
    const b = BALES.find((x) => x.barcode === v);
    if (b) { setBale(b); setTimb(b.timbGrade); }
  };

  const save = () => {
    if (!bale || !timb || !buyer || !price) { toast.error("All fields required"); return; }
    toast.success(`Ticket ${barcode} pre-processed`);
    setBarcode(""); setBale(null); setTimb(""); setBuyer(""); setPrice("");
  };

  const list = BALES.filter((b) => b.preProcessed && (q ? b.grower.toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Ticket Pre-Processing" description={`Capture buyer's information from tickets · Sale Date ${SALE_DATE}`} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Scan Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={barcode} onChange={(e) => scan(e.target.value)} placeholder="Scan or type" className="pl-8 font-mono" autoFocus />
                </div>
              </div>
              {bale ? (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{bale.grower}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bale Mass</span><span className="font-mono">{bale.mass.toFixed(2)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lot</span><span className="font-mono">{bale.lot}</span></div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">Try BC8801234500</div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">TIMB Grade</Label>
                <Select value={timb} onValueChange={setTimb}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer Grade</Label>
                <Select value={buyer} onValueChange={setBuyer}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price Allocated (USD/kg)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3.85" className="font-mono" />
              </div>
              <Button onClick={save} className="w-full">Save Pre-Processing</Button>
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
                  <TableHead>Barcode</TableHead><TableHead>Grower</TableHead>
                  <TableHead className="text-right">Mass</TableHead><TableHead>TIMB</TableHead>
                  <TableHead>Buyer</TableHead><TableHead className="text-right">$/kg</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {list.map((b) => (
                    <TableRow key={b.barcode}>
                      <TableCell className="font-mono text-xs">{b.barcode}</TableCell>
                      <TableCell className="font-mono text-xs">{b.grower}</TableCell>
                      <TableCell className="text-right font-mono">{b.mass.toFixed(2)}</TableCell>
                      <TableCell>{b.timbGrade}</TableCell>
                      <TableCell>{b.buyerGrade}</TableCell>
                      <TableCell className="text-right font-mono">${b.pricePerKg.toFixed(2)}</TableCell>
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
