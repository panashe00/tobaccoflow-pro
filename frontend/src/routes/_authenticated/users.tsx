import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Loader2 } from "lucide-react";
import { BRANCHES } from "@/lib/dummy-data";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "User Management · TIMS" }] }),
  component: Users,
});

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "accounts", label: "Accounts" },
  { value: "data", label: "Data Capturing" },
  { value: "growers", label: "Growers Rep" },
];
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

type ApiUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  contact: string | null;
  role: string;
  branches: string[];
  is_active: boolean;
  date_joined: string;
};

const AUDIT = [
  { time: "2024-10-22 09:14", user: "tmoyo", action: "Generated Salesheet for GR-2024-0142", ip: "10.0.4.21" },
  { time: "2024-10-22 08:55", user: "pndlovu", action: "Weighed 42 bales for DN-2410-00231", ip: "10.0.4.18" },
  { time: "2024-10-22 08:31", user: "rchirwa", action: "Created Delivery Note DN-2410-00234", ip: "10.0.4.12" },
];

function BranchPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (b: string) =>
    onChange(value.includes(b) ? value.filter((x) => x !== b) : [...value, b]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {BRANCHES.map((b) => {
        const active = value.includes(b);
        return (
          <button
            type="button"
            key={b}
            onClick={() => toggle(b)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {b}
          </button>
        );
      })}
    </div>
  );
}

type FormState = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  contact: string;
  role: string;
  branches: string[];
  password: string;
};

const emptyForm: FormState = {
  first_name: "", last_name: "", username: "", email: "",
  contact: "", role: "data", branches: [], password: "",
};

function UserFormDialog({
  open, onOpenChange, editingUser, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingUser: ApiUser | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingUser;
  const [form, setForm] = useState<FormState>(
    editingUser
      ? {
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          username: editingUser.username,
          email: editingUser.email,
          contact: editingUser.contact ?? "",
          role: editingUser.role,
          branches: editingUser.branches,
          password: "",
        }
      : emptyForm
  );

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
        contact: form.contact,
        role: form.role,
        branches: form.branches,
        ...(isEdit ? {} : { password: form.password }),
      };
      return isEdit ? api.updateUser(editingUser!.id, payload) : api.createUser(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "User updated" : "User created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">First Name</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={isEdit} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact</Label>
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Branch Access</Label>
            <BranchPicker value={form.branches} onChange={(b) => setForm({ ...form, branches: b })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<ApiUser[]>({
    queryKey: ["users"],
    queryFn: api.listUsers,
  });

  const toggleActive = useMutation({
    mutationFn: (u: ApiUser) => api.updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to update status"),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete user"),
  });

  const filtered = users.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase())
  );

  const openCreate = () => { setEditingUser(null); setDialogOpen(true); };
  const openEdit = (u: ApiUser) => { setEditingUser(u); setDialogOpen(true); };

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="User Management"
          description="Manage system users, roles, and branch access."
          actions={<Button onClick={openCreate}><Plus className="size-4" />New User</Button>}
        />

        <UserFormDialog
          key={editingUser?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingUser={editingUser}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
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
                      <TableHead>Branches</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {isLoading && (
                        <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading users…</TableCell></TableRow>
                      )}
                      {!isLoading && filtered.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No users found.</TableCell></TableRow>
                      )}
                      {filtered.map((u) => {
                        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;
                        const initials = (u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") || u.username[0].toUpperCase();
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials.toUpperCase()}</AvatarFallback></Avatar>
                                <div><div className="font-medium text-sm">{fullName}</div><div className="text-xs text-muted-foreground font-mono">#{u.id}</div></div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{u.username}</TableCell>
                            <TableCell><span className="text-sm">{ROLE_LABELS[u.role] ?? u.role}</span></TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {u.branches.length > 0
                                  ? u.branches.map((b) => <Badge key={b} variant="outline" className="font-normal">{b}</Badge>)
                                  : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? "default" : "outline"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleActive.mutate(u)}>
                                    {u.is_active ? "Deactivate" : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteUser.mutate(u.id)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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