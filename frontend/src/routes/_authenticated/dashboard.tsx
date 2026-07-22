import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, Legend,
} from "recharts";
import {
  Users, Package, Scale, FileSpreadsheet, Truck, AlertTriangle,
  AlertCircle, DollarSign, ArrowUpRight, FileText, ScanLine, CheckCircle2,
} from "lucide-react";
import { KPI, INTAKE_DAILY, BRANCH_PERF, MONTHLY_SALES, DELIVERY_NOTES, BALES, formatUSD } from "@/lib/dummy-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · TIMS" }] }),
  component: Dashboard,
});

const KPIS = [
  { label: "Growers Today", value: KPI.growersToday, icon: Users, hint: "+8 vs yesterday" },
  { label: "Bales Received", value: KPI.balesReceived.toLocaleString(), icon: Package, hint: "across 6 branches" },
  { label: "Bales Weighed", value: KPI.balesWeighed.toLocaleString(), icon: Scale, hint: "90% of received" },
  { label: "Salesheets Generated", value: KPI.salesheets, icon: FileSpreadsheet, hint: "today" },
  { label: "Dispatches", value: KPI.dispatches, icon: Truck, hint: "trucks loaded" },
  { label: "Pending Verifications", value: KPI.pendingVerification, icon: AlertTriangle, hint: "needs attention", warn: true },
  { label: "Salesheet Issues", value: KPI.pendingSalesheet, icon: AlertCircle, hint: "price mismatch", warn: true },
  { label: "Value Purchased Today", value: formatUSD(KPI.valueToday), icon: DollarSign, hint: "+12.4% WoW", primary: true },
];

const QUICK = [
  { to: "/delivery-notes", label: "Create Delivery Note", icon: FileText },
  { to: "/weighing", label: "Start Weighing", icon: Scale },
  { to: "/pre-processing", label: "Process Tickets", icon: ScanLine },
  { to: "/salesheet", label: "Generate Salesheet", icon: FileSpreadsheet },
  { to: "/dispatch", label: "Dispatch Bales", icon: Truck },
];

function Dashboard() {
  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Operations Dashboard"
          description="Real-time view of tobacco intake, processing, and dispatch across all branches."
          actions={<Button variant="outline" size="sm">Export Snapshot</Button>}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {KPIS.map((k) => (
            <Card key={k.label} className={k.primary ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</div>
                  <k.icon className={`size-4 ${k.warn ? "text-warning" : k.primary ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-2xl font-semibold mt-2 font-mono">{k.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{k.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground self-center mr-2">Quick Actions</span>
            {QUICK.map((q) => (
              <Button key={q.to} asChild variant="outline" size="sm">
                <Link to={q.to}><q.icon className="size-3.5" />{q.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Daily Tobacco Intake (Bales)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={INTAKE_DAILY}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.36 0.06 155)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.36 0.06 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.5 0.015 240)" fontSize={11} />
                  <YAxis stroke="oklch(0.5 0.015 240)" fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  <Area type="monotone" dataKey="bales" stroke="oklch(0.36 0.06 155)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Branch Performance (USD)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={BRANCH_PERF} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.5 0.015 240)" fontSize={10} />
                  <YAxis dataKey="branch" type="category" stroke="oklch(0.5 0.015 240)" fontSize={11} width={70} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => formatUSD(v)} />
                  <Bar dataKey="value" fill="oklch(0.55 0.12 235)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Sales Comparison (USD)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={MONTHLY_SALES}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.5 0.015 240)" fontSize={11} />
                <YAxis stroke="oklch(0.5 0.015 240)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => formatUSD(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="current" stroke="oklch(0.36 0.06 155)" strokeWidth={2} name="Current Year" />
                <Line type="monotone" dataKey="previous" stroke="oklch(0.65 0.13 75)" strokeWidth={2} strokeDasharray="4 4" name="Previous Year" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent activity tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Delivery Notes</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link to="/delivery-notes">View all <ArrowUpRight className="size-3" /></Link></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>D-Note</TableHead><TableHead>Grower</TableHead><TableHead className="text-right">Bales</TableHead></TableRow></TableHeader>
                <TableBody>
                  {DELIVERY_NOTES.slice(0, 5).map((d) => (
                    <TableRow key={d.dn}>
                      <TableCell className="font-mono text-xs">{d.dn}</TableCell>
                      <TableCell className="text-xs">{d.growerName}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.bales}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Processed Tickets</CardTitle>
              <CheckCircle2 className="size-4 text-success" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Barcode</TableHead><TableHead>Grade</TableHead><TableHead className="text-right">$/kg</TableHead></TableRow></TableHeader>
                <TableBody>
                  {BALES.filter((b) => b.processed).slice(0, 5).map((b) => (
                    <TableRow key={b.barcode}>
                      <TableCell className="font-mono text-xs">{b.barcode}</TableCell>
                      <TableCell className="text-xs">{b.buyerGrade}</TableCell>
                      <TableCell className="text-right font-mono text-xs">${b.pricePerKg.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Dispatch Activity</CardTitle>
              <Truck className="size-4 text-primary" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>D-Note</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {DELIVERY_NOTES.slice(0, 5).map((d) => (
                    <TableRow key={d.dn}>
                      <TableCell className="font-mono text-xs">{d.dn}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
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
