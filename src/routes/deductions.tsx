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
import { Trash2, Plus } from "lucide-react";
import { GROWERS, formatUSD } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/deductions")({
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

function Deductions() {
  const [items, setItems] = useState(initial);
  const [grower, setGrower] = useState("GR-2024-0142");
  const [type, setType] = useState(TYPES[0]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const filtered = items.filter((i) => i.grower === grower);
  const total = filtered.reduce((s, i) => s + i.amount, 0);

  const add = () => {
    if (!amount) { toast.error("Amount required"); return; }
    setItems([...items, { id: Date.now(), grower, type, amount: parseFloat(amount), desc, date: "2024-10-22" }]);
    setAmount(""); setDesc("");
    toast.success("Deduction added");
  };

  const remove = (id: number) => { setItems(items.filter((i) => i.id !== id)); toast.success("Deduction removed"); };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Deductions" description="Capture deductions to be removed from farmer payment. Linked automatically to Salesheet." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Deduction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grower</Label>
                <Select value={grower} onValueChange={setGrower}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROWERS.map((g) => <SelectItem key={g.number} value={g.number}>{g.number} · {g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief note" />
              </div>
              <Button onClick={add} className="w-full"><Plus className="size-4" />Add Deduction</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Deductions for {grower}</CardTitle>
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
                  {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No deductions for this grower</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
