import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Loader2, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { BRANCHES } from "@/lib/dummy-data";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/growers")({
  head: () => ({ meta: [{ title: "Growers List · TIMS" }] }),
  component: Growers,
});

type ApiGrower = {
  id: number;
  grower_number: string;
  first_name: string;
  last_name: string;
  national_id: string | null;
  contact: string | null;
  address: string | null;
  bank_name: string | null;
  account_number: string | null;
  branch: string;
  is_active: boolean;
};

type FormState = {
  grower_number: string;
  first_name: string;
  last_name: string;
  national_id: string;
  contact: string;
  address: string;
  bank_name: string;
  account_number: string;
  branch: string;
};

const emptyForm: FormState = {
  grower_number: "", first_name: "", last_name: "", national_id: "",
  contact: "", address: "", bank_name: "", account_number: "", branch: BRANCHES[0],
};

function GrowerFormDialog({
  open, onOpenChange, editingGrower, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingGrower: ApiGrower | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingGrower;
  const [form, setForm] = useState<FormState>(
    editingGrower
      ? {
          grower_number: editingGrower.grower_number,
          first_name: editingGrower.first_name,
          last_name: editingGrower.last_name,
          national_id: editingGrower.national_id ?? "",
          contact: editingGrower.contact ?? "",
          address: editingGrower.address ?? "",
          bank_name: editingGrower.bank_name ?? "",
          account_number: editingGrower.account_number ?? "",
          branch: editingGrower.branch,
        }
      : emptyForm
  );

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? api.updateGrower(editingGrower!.id, form) : api.createGrower(form),
    onSuccess: () => {
      toast.success(isEdit ? "Grower updated" : "Grower created");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Grower" : "Register Grower"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Grower Number (TIMB)</Label>
            <Input value={form.grower_number} onChange={(e) => setForm({ ...form, grower_number: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">First Name</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">National ID</Label>
            <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact</Label>
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bank Name</Label>
            <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Number</Label>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Home Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Register Grower"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Growers() {
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrower, setEditingGrower] = useState<ApiGrower | null>(null);
  const queryClient = useQueryClient();

  const { data: growers = [], isLoading } = useQuery<ApiGrower[]>({
    queryKey: ["growers", q],
    queryFn: () => api.listGrowers(q),
  });

  const deleteGrower = useMutation({
    mutationFn: (id: number) => api.deleteGrower(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["growers"] });
      toast.success("Grower deleted");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete grower"),
  });

  const openCreate = () => { setEditingGrower(null); setDialogOpen(true); };
  const openEdit = (g: ApiGrower) => { setEditingGrower(g); setDialogOpen(true); };

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="Growers List"
          description="Active and inactive growers with contact info."
          actions={<Button onClick={openCreate}><Plus className="size-4" />Register Grower</Button>}
        />

        <GrowerFormDialog
          key={editingGrower?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingGrower={editingGrower}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["growers"] })}
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
            <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search grower number, name, national ID…" className="pl-8" />
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success("Growers list exported to Excel")}>
                <FileSpreadsheet className="size-3.5" />Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Growers list exported to PDF")}>
                <FileText className="size-3.5" />PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Growers list sent to printer")}>
                <Printer className="size-3.5" />Print
            </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Grower #</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead>
                  <TableHead>Branch</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading growers…</TableCell></TableRow>
                  )}
                  {!isLoading && growers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No growers found.</TableCell></TableRow>
                  )}
                  {growers.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.grower_number}</TableCell>
                      <TableCell className="font-medium text-sm">{g.first_name} {g.last_name}</TableCell>
                      <TableCell className="text-sm">{g.contact ?? "—"}</TableCell>
                      <TableCell>{g.branch}</TableCell>
                      <TableCell><Badge variant={g.is_active ? "default" : "outline"}>{g.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(g)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteGrower.mutate(g.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}