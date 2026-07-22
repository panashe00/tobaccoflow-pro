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
import { Trash2, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { GROWERS, DELIVERY_NOTES, formatUSD } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deductions")({
  head: () => ({ meta: [{ title: "Deductions · TIMS" }] }),
  component: Deductions,
});

const TYPES = ["Hessian Cost", "Transporter Cost", "Canteen", "Loans", "Miscellaneous"];

const initial = [
  { id: 1, grower: "GR-2024-0142", type: "Hessian Cost", amount: 42.5, desc: "42 hessian wraps @ $1.01", date: "2024-10-21" },
  { id: 2, grower: "GR-2024-0142", type: "Transporter Cost", amount: 180, desc: "Highway Logistics", date: "2024-10-21" },
  { id: 3, grower: "GR-2024-0142", type: "Loans", amount: 320, desc: "Seasonal input loan repayment", date: "2024-10-15" },
  { id: 4, grower: "GR-2024-0391", type: "Canteen", amount: 25, desc: "Meals during weighing", date: "2024-10-22" },
];

// Growers pending deductions capture (after weighing/processing, before salesheet)
const pendingInitial = [
  { grower: "GR-2024-0142", name: "Tendai Moyo", dn: "DN-2410-00231", branch: "Harare", bales: 42, readyAt: "2024-10-22 09:14" },
  { grower: "GR-2024-0287", name: "Chipo Mukasa", dn: "DN-2410-00232", branch: "Karoi", bales: 28, readyAt: "2024-10-22 10:02" },
  { grower: "GR-2024-0391", name: "Farai Ncube", dn: "DN-2410-00233", branch: "Rusape", bales: 56, readyAt: "2024-10-22 10:48" },
  { grower: "GR-2024-0455", name: "Rumbidzai Sibanda", dn: "DN-2410-00234", branch: "Marondera", bales: 19, readyAt: "2024-10-22 11:30" },
  { grower: "GR-2024-0512", name: "Tafadzwa Chirwa", dn: "DN-2410-00235", branch: "Bindura", bales: 73, readyAt: "2024-10-22 12:05" },
  { grower: "GR-2024-0633", name: "Memory Dube", dn: "DN-2410-00236", branch: "Mvurwi", bales: 34, readyAt: "2024-10-22 12:41" },
];

function Deductions() {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState(pendingInitial);
  const [grower, setGrower] = useState<string | null>(null);
  const [type, setType] = useState(TYPES[0]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const filtered = grower ? items.filter((i) => i.grower === grower) : [];
  const total = filtered.reduce((s, i) => s + i.amount, 0);
  const selected = pending.find((p) => p.grower === grower);

  const add = () => {
    if (!grower) { toast.error("Select a grower first"); return; }
    if (!amount) { toast.error("Amount required"); return; }
    setItems([...items, { id: Date.now(), grower, type, amount: parseFloat(amount), desc, date: "2024-10-22" }]);
    setAmount(""); setDesc("");
    toast.success("Deduction added");
  };

  const remove = (id: number) => { setItems(items.filter((i) => i.id !== id)); toast.success("Deduction removed"); };

  const completeGrower = () => {
    if (!grower) return;
    setPending(pending.filter((p) => p.grower !== grower));
    toast.success(`Deductions finalised for ${selected?.name}. Forwarded to Salesheet.`);
    setGrower(null);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Deductions" description="Capture deductions to be removed from farmer payment. Linked automatically to Salesheet." />

        <Card className="mb-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Growers Pending Deductions</CardTitle>
            <Badge variant="outline" className="font-mono">{pending.length} pending</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Grower #</TableHead><TableHead>Name</TableHead><TableHead>D-Note</TableHead>
                <TableHead>Branch</TableHead><TableHead className="text-right">Bales</TableHead>
                <TableHead>Ready Since</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pending.map((p) => {
                  const active = p.grower === grower;
                  return (
                    <TableRow key={p.grower} className={active ? "bg-muted/50" : ""}>
                      <TableCell className="font-mono text-xs">{p.grower}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.dn}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{p.branch}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{p.bales}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.readyAt}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={active ? "secondary" : "default"} onClick={() => { setGrower(p.grower); toast.success(`Capturing deductions for ${p.name}`); }}>
                          {active ? "Selected" : <>Start <ArrowRight className="size-3 ml-1" /></>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pending.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">No growers pending deductions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Deduction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grower</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/30 text-sm font-mono">
                  {grower ? `${grower} · ${selected?.name ?? GROWERS.find(g => g.number === grower)?.name ?? ""}` : <span className="text-muted-foreground font-sans">Select from table above</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType} disabled={!grower}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" placeholder="0.00" disabled={!grower} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief note" disabled={!grower} />
              </div>
              <Button onClick={add} className="w-full" disabled={!grower}><Plus className="size-4" />Add Deduction</Button>
              <Button onClick={completeGrower} variant="outline" className="w-full" disabled={!grower}><CheckCircle2 className="size-4" />Complete & Forward</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Deductions for {grower ?? "—"}</CardTitle>
              <Badge variant="outline" className="font-mono">Total: {formatUSD(total)}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.date}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{i.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{i.desc}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(i.amount)}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => remove(i.id)}><Trash2 className="size-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">{grower ? "No deductions for this grower" : "Select a grower from the pending table"}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// keep referenced imports used
void DELIVERY_NOTES;
