import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BRANCHES, ROLES, EXCHANGE_RATE, SALE_DATE } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · TIMS" }] }),
  component: Settings,
});

function Settings() {
  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader title="Settings" description="System-wide configuration. Changes are logged in the audit trail." />

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="barcode">Barcode</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle className="text-sm">Daily Operations</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-1.5"><Label className="text-xs">Sale Date</Label><Input type="date" defaultValue={SALE_DATE} className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs">USD/ZIG Exchange Rate</Label><Input type="number" step="0.01" defaultValue={EXCHANGE_RATE} className="font-mono" /></div>
                <div className="col-span-2"><Button onClick={() => toast.success("Settings saved")}>Save Changes</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deductions">
            <Card>
              <CardHeader><CardTitle className="text-sm">Default Deduction Configuration</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Deduction</TableHead><TableHead>Default Amount (USD)</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[
                      ["Service Charges", "38.50"],
                      ["Afforestation Fees", "12.00"],
                      ["Bank Charges", "6.50"],
                      ["Selling Cost", "22.00"],
                      ["Weighing Cost", "14.00"],
                    ].map(([n, v]) => (
                      <TableRow key={n}>
                        <TableCell>{n}</TableCell>
                        <TableCell><Input defaultValue={v} className="font-mono w-32 h-8" /></TableCell>
                        <TableCell><Switch defaultChecked /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches">
            <Card>
              <CardHeader><CardTitle className="text-sm">Branches</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Branch</TableHead><TableHead>Region</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {BRANCHES.map((b, i) => (
                      <TableRow key={b}>
                        <TableCell className="font-mono">BR-{String(i + 1).padStart(3, "0")}</TableCell>
                        <TableCell>{b}</TableCell>
                        <TableCell className="text-muted-foreground">Zimbabwe</TableCell>
                        <TableCell><Badge variant="outline" className="bg-success/15 text-success border-success/30">Active</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader><CardTitle className="text-sm">Role Permissions Matrix</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>D-Notes</TableHead><TableHead>Weighing</TableHead><TableHead>Processing</TableHead>
                      <TableHead>Salesheet</TableHead><TableHead>Dispatch</TableHead><TableHead>Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROLES.map((r) => (
                      <TableRow key={r}>
                        <TableCell className="font-medium">{r}</TableCell>
                        {[true, true, true, r === "Admin" || r === "Sales Clerk", r === "Admin" || r === "Dispatch Clerk", true].map((on, i) => (
                          <TableCell key={i}><Switch defaultChecked={on} /></TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="barcode">
            <Card>
              <CardHeader><CardTitle className="text-sm">Barcode Generation</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-1.5"><Label className="text-xs">Prefix</Label><Input defaultValue="BC" className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Sequence Start</Label><Input defaultValue="8801234500" className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Symbology</Label><Input defaultValue="Code 128" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Length</Label><Input type="number" defaultValue={12} className="font-mono" /></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
