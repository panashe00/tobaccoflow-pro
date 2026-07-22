import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Printer, FileDown, AlertTriangle, ShieldCheck, Leaf } from "lucide-react";
import { GROWERS, BALES, EXCHANGE_RATE, SALE_DATE, formatUSD, formatNum } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/salesheet")({
  head: () => ({ meta: [{ title: "Salesheet Generation · TIMS" }] }),
  component: Salesheet,
});

const STATUTORY = [
  { label: "Service Charges", amount: 38.5 },
  { label: "Afforestation Fees", amount: 12.0 },
  { label: "Bank Charges", amount: 6.5 },
  { label: "Selling Cost", amount: 22.0 },
  { label: "Weighing Cost", amount: 14.0 },
];

const FARMER_DEDUCTIONS = [
  { label: "Hessian Cost", amount: 42.5 },
  { label: "Transporter Cost", amount: 180 },
  { label: "Loans", amount: 320 },
];

function Salesheet() {
  const [grower, setGrower] = useState("GR-2024-0142");
  const [verified, setVerified] = useState(false);
  const g = GROWERS.find((x) => x.number === grower)!;
  const bales = BALES.filter((b) => b.grower === grower && b.processed);
  const hasMismatch = bales.some((_, i) => i % 6 === 0);

  const rows = bales.map((b) => ({ ...b, value: b.pricePerKg * b.mass }));
  const gross = rows.reduce((s, r) => s + r.value, 0);
  const totalDeductions = [...STATUTORY, ...FARMER_DEDUCTIONS].reduce((s, x) => s + x.amount, 0);
  const net = gross - totalDeductions;
  const usdPortion = net * 0.7;
  const zigPortion = net * 0.3 * EXCHANGE_RATE;

  const generate = () => {
    if (hasMismatch && !verified) { toast.error("Resolve verification mismatches first"); return; }
    toast.success("Salesheet generated and queued for approval");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Salesheet Generation"
          description="Generate farmer payment summary. 70% USD / 30% ZIG split applied at the day's exchange rate."
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
              <Button variant="outline" onClick={() => toast.success("PDF exported")}><FileDown className="size-4" />Export PDF</Button>
              <Button onClick={generate}>Generate Salesheet</Button>
            </>
          }
        />

        <div className="flex items-end gap-3 mb-4 no-print">
          <div className="space-y-1.5 max-w-sm flex-1">
            <Label className="text-xs">Select Grower</Label>
            <Select value={grower} onValueChange={(v) => { setGrower(v); setVerified(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GROWERS.map((g) => <SelectItem key={g.number} value={g.number}>{g.number} · {g.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="font-mono">Sale Date: {SALE_DATE}</Badge>
          <Badge variant="outline" className="font-mono">USD/ZIG: {EXCHANGE_RATE.toFixed(2)}</Badge>
        </div>

        {hasMismatch && !verified && (
          <Alert className="mb-4 border-destructive/40 bg-destructive/5 no-print">
            <AlertTriangle className="size-4 text-destructive" />
            <AlertTitle className="text-destructive">Verification mismatch detected</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>One or more tickets have price discrepancies between pre-processing and processing. Salesheet generation is blocked until resolved.</span>
              <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="border-destructive/40">Review</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Verification Approval</DialogTitle>
                    <DialogDescription>Approving overrides flagged mismatches with your audit signature.</DialogDescription>
                  </DialogHeader>
                  <div className="text-sm text-muted-foreground py-2">All mismatches will be marked as <strong>verified-by-supervisor</strong> in the audit log.</div>
                  <DialogFooter>
                    <Button onClick={() => { setVerified(true); toast.success("Mismatches verified"); }}>Approve & Continue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </AlertDescription>
          </Alert>
        )}

        {/* Salesheet card */}
        <Card className="print-area">
          <CardContent className="p-8">
            {/* Salesheet Header */}
            <div className="flex items-start justify-between border-b pb-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-md bg-primary flex items-center justify-center"><Leaf className="size-6 text-primary-foreground" /></div>
                <div>
                  <div className="font-semibold text-lg">TIMS · Salesheet</div>
                  <div className="text-xs text-muted-foreground">Tobacco In-House Management System</div>
                </div>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="flex gap-4"><span className="text-muted-foreground">Sale Date:</span><span className="font-mono font-medium">{SALE_DATE}</span></div>
                <div className="flex gap-4"><span className="text-muted-foreground">Exchange Rate:</span><span className="font-mono font-medium">USD 1 = ZIG {EXCHANGE_RATE.toFixed(2)}</span></div>
                <div className="flex gap-4"><span className="text-muted-foreground">Grower #:</span><span className="font-mono font-medium">{g.number}</span></div>
                <div className="flex gap-4"><span className="text-muted-foreground">Grower:</span><span className="font-medium">{g.name}</span></div>
                <div className="flex gap-4"><span className="text-muted-foreground">Region:</span><span>{g.region}</span></div>
              </div>
            </div>

            {/* Bales Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead><TableHead>Lot</TableHead>
                  <TableHead className="text-right">Mass (kg)</TableHead>
                  <TableHead>Buyer Grade</TableHead>
                  <TableHead className="text-right">Price/kg (USD)</TableHead>
                  <TableHead className="text-right">Bale Value (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.barcode}>
                    <TableCell>{r.group}</TableCell>
                    <TableCell>{r.lot}</TableCell>
                    <TableCell className="text-right font-mono">{r.mass.toFixed(2)}</TableCell>
                    <TableCell>{r.buyerGrade}</TableCell>
                    <TableCell className="text-right font-mono">${r.pricePerKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatUSD(r.value)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell colSpan={2}>TOTAL ({rows.length} bales)</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(rows.reduce((s, r) => s + r.mass, 0))}</TableCell>
                  <TableCell></TableCell><TableCell></TableCell>
                  <TableCell className="text-right font-mono">{formatUSD(gross)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-8 mt-8">
              <Card className="border-dashed">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Statutory Deductions</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {STATUTORY.map((d) => (
                    <div key={d.label} className="flex justify-between">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-mono">{formatUSD(d.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                    <span>Farmer Deductions</span><span></span>
                  </div>
                  {FARMER_DEDUCTIONS.map((d) => (
                    <div key={d.label} className="flex justify-between">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-mono">{formatUSD(d.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total Deductions</span>
                    <span className="font-mono text-destructive">−{formatUSD(totalDeductions)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Net Payable</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Gross Sale Value</span><span className="font-mono">{formatUSD(gross)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Less Deductions</span><span className="font-mono">−{formatUSD(totalDeductions)}</span></div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-base">
                    <span>Net Amount</span><span className="font-mono text-primary">{formatUSD(net)}</span>
                  </div>
                  <div className="border-t pt-3 mt-3 space-y-1.5">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Payment Split (70/30)</div>
                    <div className="flex justify-between p-2 bg-card rounded">
                      <span>USD Portion (70%)</span>
                      <span className="font-mono font-semibold">{formatUSD(usdPortion)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-card rounded">
                      <span>ZIG Portion (30%)</span>
                      <span className="font-mono font-semibold">ZIG {formatNum(zigPortion)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t">
              {["Sales Clerk", "Branch Manager", "Grower"].map((s) => (
                <div key={s}>
                  <div className="border-b border-foreground/40 h-10" />
                  <div className="text-xs text-muted-foreground mt-1">{s} · Signature & Date</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
