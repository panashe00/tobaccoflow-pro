import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scan, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BALES } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/processing")({
  head: () => ({ meta: [{ title: "Bale Processing · TIMS" }] }),
  component: Processing,
});

const GRADES = ["L1G", "L2L", "L3K", "X3K", "C1L", "C2L", "C3L", "B1L", "B2L"];

function Processing() {
  const [barcode, setBarcode] = useState("");
  const [bale, setBale] = useState<typeof BALES[0] | null>(null);
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState("");

  const scan = (v: string) => {
    setBarcode(v);
    const b = BALES.find((x) => x.barcode === v);
    setBale(b || null);
  };

  const save = () => {
    if (!bale) { toast.error("Scan a barcode first"); return; }
    const priceMatches = parseFloat(price) === bale.pricePerKg;
    const gradeMatches = buyer === bale.buyerGrade;
    if (!priceMatches || !gradeMatches) toast.warning("Mismatch flagged for verification");
    else toast.success("Ticket verified");
    setBarcode(""); setBale(null); setBuyer(""); setPrice("");
  };

  const processed = BALES.filter((b) => b.processed);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Bale Processing" description="Final ticket verification. Compares against pre-processing values and highlights mismatches." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Verify Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Barcode</Label>
                <div className="relative">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={barcode} onChange={(e) => scan(e.target.value)} placeholder="Scan ticket" className="pl-8 font-mono" autoFocus />
                </div>
              </div>
              {bale && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span className="font-mono">{bale.grower}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TIMB Grade</span><span>{bale.timbGrade}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pre-proc grade</span><span className="font-medium">{bale.buyerGrade}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pre-proc price</span><span className="font-mono">${bale.pricePerKg.toFixed(2)}</span></div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer Grade (re-capture)</Label>
                <Select value={buyer} onValueChange={setBuyer}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (USD/kg, re-capture)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="font-mono" />
              </div>
              <Button onClick={save} className="w-full">Verify & Save</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Processed Tickets · Verification Status</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Barcode</TableHead><TableHead>Grower</TableHead>
                  <TableHead>Pre-Grade</TableHead><TableHead>Final Grade</TableHead>
                  <TableHead className="text-right">Pre $/kg</TableHead><TableHead className="text-right">Final $/kg</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {processed.map((b, i) => {
                    const mismatch = i % 6 === 0;
                    const finalPrice = mismatch ? b.pricePerKg + 0.15 : b.pricePerKg;
                    return (
                      <TableRow key={b.barcode} className={mismatch ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-xs">{b.barcode}</TableCell>
                        <TableCell className="font-mono text-xs">{b.grower}</TableCell>
                        <TableCell>{b.buyerGrade}</TableCell>
                        <TableCell className={mismatch ? "text-destructive font-medium" : ""}>{b.buyerGrade}</TableCell>
                        <TableCell className="text-right font-mono">${b.pricePerKg.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-mono ${mismatch ? "text-destructive font-medium" : ""}`}>${finalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          {mismatch
                            ? <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" /><StatusBadge status="mismatch" /></span>
                            : <span className="inline-flex items-center gap-1 text-xs"><CheckCircle2 className="size-3 text-success" /><StatusBadge status="verified" /></span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
