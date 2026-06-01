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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { USERS, ROLES, BRANCHES } from "@/lib/dummy-data";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "User Management · TIMS" }] }),
  component: Users,
});

const AUDIT = [
  { time: "2024-10-22 09:14", user: "tmoyo", action: "Generated Salesheet for GR-2024-0142", ip: "10.0.4.21" },
  { time: "2024-10-22 08:55", user: "pndlovu", action: "Weighed 42 bales for DN-2410-00231", ip: "10.0.4.18" },
  { time: "2024-10-22 08:31", user: "rchirwa", action: "Created Delivery Note DN-2410-00234", ip: "10.0.4.12" },
  { time: "2024-10-21 17:02", user: "fchideya", action: "Approved verification mismatch on BC8801234507", ip: "10.0.4.04" },
  { time: "2024-10-21 16:48", user: "kbanda", action: "Dispatched 18 bales to Boka Auction Floors", ip: "10.0.4.31" },
  { time: "2024-10-21 14:22", user: "smatemba", action: "Exported Financial Summary report", ip: "10.0.4.07" },
];

function Users() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = USERS.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="User Management"
          description="Manage system users, roles, and branch access."
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="size-4" />New User</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2"><Label className="text-xs">Full Name</Label><Input placeholder="John Doe" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Username</Label><Input placeholder="jdoe" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" placeholder="user@tims.co.zw" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Branch</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => { toast.success("User created"); setOpen(false); }}>Create User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardContent className="p-4">
                <div className="relative max-w-sm mb-4">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="pl-8" />
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>User</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filtered.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{u.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                              <div><div className="font-medium text-sm">{u.name}</div><div className="text-xs text-muted-foreground font-mono">{u.id}</div></div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{u.username}</TableCell>
                          <TableCell><span className="text-sm">{u.role}</span></TableCell>
                          <TableCell>{u.branch}</TableCell>
                          <TableCell><StatusBadge status={u.status} /></TableCell>
                          <TableCell><Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">System Audit Log</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>IP Address</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {AUDIT.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{a.time}</TableCell>
                        <TableCell className="font-mono text-xs">{a.user}</TableCell>
                        <TableCell className="text-sm">{a.action}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.ip}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
