import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LineChart, Line, Legend,
} from "recharts";
import {
  Users, Package, Scale, FileSpreadsheet, Truck, AlertTriangle,
  AlertCircle, DollarSign, ArrowUpRight, FileText, ScanLine, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { isBranchAdmin } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · TIMS" }] }),
  component: Dashboard,
});

type DashboardData = {
  scope: { season: {id: number; name: string} | null; branches: string[]; sale_dates: { branch: string; date: string; has_rate: boolean }[] };
  kpis: {
    growers_today: number; bales_received: number; bales_weighed: number; salesheets: number;
    dispatches: number; dispatch_bales: number; pending_verification: number;
    unresolved_mismatches: number; value_today: string;
  };
  intake: { day: string; bales: number }[];
  branch_performance: { branch: string; value: number }[];
  monthly: { month: string; current: number | null; previous: number }[];
  recent_notes: { id: number; dn_number: string; grower_name: string; bales: number }[];
  recent_tickets: { id: number; ticket_number: string; grade: string; price: string }[];
  recent_loads: { id: number; truck_registration: string; destination: string; bales: number; is_open: boolean }[];
};

const usd = (v: number | string) =>
  `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const QUICK = [
  { to: "/delivery-notes", label: "Create Delivery Note", icon: FileText, module: "delivery_notes" },
  { to: "/weighing", label: "Start Weighing", icon: Scale, module: "weighing" },
  { to: "/pre-processing", label: "Process Tickets", icon: ScanLine, module: "pre_processing" },
  { to: "/salesheet", label: "Generate Salesheet", icon: FileSpreadsheet, module: "salesheet" },
  { to: "/dispatch", label: "Dispatch Bales", icon: Truck, module: "dispatch" },
];

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
    refetchInterval: 30_000,
  });

  const k = data?.kpis;
  const dash = "—";
  const branchCount = data?.scope.branches.length ?? 0;
  const pct = k && k.bales_received > 0 ? Math.round((k.bales_weighed / k.bales_received) * 100) : 0;

  const KPIS = [
    { label: "Growers Today", value: k ? k.growers_today : dash, icon: Users, hint: "with deliveries this sale date" },
    { label: "Bales Received", value: k ? k.bales_received.toLocaleString() : dash, icon: Package, hint: `across ${branchCount} branch${branchCount === 1 ? "" : "es"}` },
    { label: "Bales Weighed", value: k ? k.bales_weighed.toLocaleString() : dash, icon: Scale, hint: `${pct}% of received` },
    { label: "Salesheets Generated", value: k ? k.salesheets : dash, icon: FileSpreadsheet, hint: "this sale date" },
    { label: "Dispatches", value: k ? k.dispatches : dash, icon: Truck, hint: k ? `${k.dispatch_bales} bales loaded today` : "" },
    { label: "Pending Verifications", value: k ? k.pending_verification : dash, icon: AlertTriangle, hint: "weighed, not yet verified", warn: !!k && k.pending_verification > 0 },
    { label: "Unresolved Mismatches", value: k ? k.unresolved_mismatches : dash, icon: AlertCircle, hint: "grade or price mismatch", warn: !!k && k.unresolved_mismatches > 0 },
    { label: "Value Purchased", value: k ? usd(k.value_today) : dash, icon: DollarSign, hint: "processed bales, this sale date", primary: true },
  ];

  const quick = QUICK.filter((q) => isBranchAdmin(user) || user.permissions.includes(q.module));
  const saleDates = data?.scope.sale_dates ?? [];
  const missingRate = saleDates.filter((s) => !s.has_rate);
  const showBranches = (data?.branch_performance.length ?? 0) > 1;

  const description = !data
    ? "Loading…"
    : !data.scope.season
    ? "No season is open"
    : `Season ${data.scope.season.name} · ${saleDates.length ? saleDates.map((s) => `${s.branch} ${s.date}`).join(" · ") : "no sale date open"}`;

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Operations Dashboard"
          description={description}
          actions={<Button variant="outline" size="sm">Export Snapshot</Button>}
        />

        {isError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Could not load dashboard data.
          </div>
        )}

        {missingRate.length > 0 && (
          <div className="mb-4 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
            Exchange rate not yet set for {missingRate.map((s) => s.branch).join(", ")}. Tickets cannot be processed until it is captured.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {KPIS.map((c) => (
            <Card key={c.label} className={c.primary ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{c.label}</div>
                  <c.icon className={`size-4 ${c.warn ? "text-warning" : c.primary ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-2xl font-semibold mt-2 font-mono">{c.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{c.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        {quick.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-wrap gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground self-center mr-2">Quick Actions</span>
              {quick.map((q) => (
                <Button key={q.to} asChild variant="outline" size="sm">
                  <Link to={q.to}><q.icon className="size-3.5" />{q.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className={showBranches ? "lg:col-span-2" : "lg:col-span-3"}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Daily Tobacco Intake (Bales, last 14 sale dates)</CardTitle></CardHeader>
            <CardContent>
              {data && data.intake.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No intake recorded yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data?.intake ?? []}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.36 0.06 155)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.36 0.06 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" vertical={false} />
                    <XAxis dataKey="day" stroke="oklch(0.5 0.015 240)" fontSize={11} />
                    <YAxis stroke="oklch(0.5 0.015 240)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Area type="monotone" dataKey="bales" stroke="oklch(0.36 0.06 155)" strokeWidth={2} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {showBranches && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Branch Performance (USD, this month)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.branch_performance ?? []} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" horizontal={false} />
                    <XAxis type="number" stroke="oklch(0.5 0.015 240)" fontSize={10} />
                    <YAxis dataKey="branch" type="category" stroke="oklch(0.5 0.015 240)" fontSize={11} width={70} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => usd(v)} />
                    <Bar dataKey="value" fill="oklch(0.55 0.12 235)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Branch Perfomance (USD, This Season)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.5 0.015 240)" fontSize={11} />
                <YAxis stroke="oklch(0.5 0.015 240)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => usd(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="current" stroke="oklch(0.36 0.06 155)" strokeWidth={2} name="This Season" connectNulls={false} />
                <Line type="monotone" dataKey="previous" stroke="oklch(0.65 0.13 75)" strokeWidth={2} strokeDasharray="4 4" name="Previous Season" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent activity */}
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
                  {(data?.recent_notes ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.dn_number}</TableCell>
                      <TableCell className="text-xs">{d.grower_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.bales}</TableCell>
                    </TableRow>
                  ))}
                  {data && data.recent_notes.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No delivery notes yet</TableCell></TableRow>
                  )}
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
                <TableHeader><TableRow><TableHead>Ticket</TableHead><TableHead>Grade</TableHead><TableHead className="text-right">$/kg</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(data?.recent_tickets ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.ticket_number}</TableCell>
                      <TableCell className="text-xs">{t.grade}</TableCell>
                      <TableCell className="text-right font-mono text-xs">${Number(t.price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {data && data.recent_tickets.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No tickets processed yet</TableCell></TableRow>
                  )}
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
                <TableHeader><TableRow><TableHead>Truck</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Bales</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(data?.recent_loads ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.truck_registration}</TableCell>
                      <TableCell className="text-xs">{l.destination}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.bales}</TableCell>
                      <TableCell><Badge variant={l.is_open ? "default" : "outline"}>{l.is_open ? "Open" : "Closed"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {data && data.recent_loads.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No loads yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}