import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Rows4, FileText, Printer, BarChart3, AlertTriangle, Truck, Receipt, DollarSign } from "lucide-react";
import { BRANCHES } from "@/lib/dummy-data";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports · TIMS" }] }),
  component: Reports,
});

const REPORTS = [
  { name: "Daily Intake Report", desc: "Bales received per branch per day", icon: BarChart3 },
  { name: "Grower Sales Report", desc: "Per-grower sales totals and deductions", icon: FileText },
  { name: "Branch Performance Report", desc: "Branch comparison across key metrics", icon: BarChart3 },
  { name: "Deductions Report", desc: "Breakdown by deduction type and grower", icon: Receipt },
  { name: "Dispatch Report", desc: "Truck loads, destinations, and timing", icon: Truck },
  { name: "Outstanding Verification Report", desc: "Tickets pending verification", icon: AlertTriangle },
  { name: "Financial Summary", desc: "Gross, net, USD/ZIG payout summary", icon: DollarSign },
  { name: "Growers List", desc: "Active and inactive growers with contact info", icon: Rows4 },
];

function Reports() {

  const nav = useNavigate();

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader title="Reports" description="Generate operational and financial reports. Filter by date range and branch." />

        <Card className="mb-4">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5"><Label className="text-xs">From</Label><Input type="date" defaultValue="2024-10-01" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">To</Label><Input type="date" defaultValue="2024-10-22" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Branch</Label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => toast.success("Filters applied")}>Apply Filters</Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REPORTS.map((r) => (
            <Card key={r.name} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <r.icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                  {r.name === "Growers List" ? (
                    <Button size="sm" className="mt-3" onClick={() => nav({ to: "/growers" })}>
                      View Growers List
                    </Button>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => toast.success(`${r.name} exported to Excel`)}>
                        <FileSpreadsheet className="size-3.5" />Excel
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success(`${r.name} exported to PDF`)}>
                        <FileText className="size-3.5" />PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success(`${r.name} sent to printer`)}>
                        <Printer className="size-3.5" />Print
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
