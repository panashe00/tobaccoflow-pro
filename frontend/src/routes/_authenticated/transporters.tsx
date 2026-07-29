import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Loader2, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transporters")({
  head: () => ({ meta: [{ title: "Transporters · TIMS" }] }),
  component: Transporters,
});

type ApiTransporter = {
  id: number;
  transporter_number: string;
  first_name: string;
  last_name: string;
  address: string | null;
  bank_name: string | null;
  account_number: string | null;
  is_active: boolean;
};

type FormState = {
  transporter_number: string;
  first_name: string;
  last_name: string;
  address: string;
  bank_name: string;
  account_number: string;
};

const emptyForm: FormState = {
  transporter_number: "", first_name: "", last_name: "",
  address: "", bank_name: "", account_number: "",
};

function TransporterFormDialog({
  open, onOpenChange, editingTransporter, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingTransporter: ApiTransporter | null;
  onSaved: () => void;
}) {
  const isEdit = !!editingTransporter;
  const [form, setForm] = useState<FormState>(
    editingTransporter
      ? {
          transporter_number: editingTransporter.transporter_number,
          first_name: editingTransporter.first_name,
          last_name: editingTransporter.last_name,
          address: editingTransporter.address ?? "",
          bank_name: editingTransporter.bank_name ?? "",
          account_number: editingTransporter.account_number ?? "",
        }
      : emptyForm
  );

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? api.updateTransporter(editingTransporter!.id, form) : api.createTransporter(form),
    onSuccess: () => {
      toast.success(isEdit ? "Transporter updated" : "Transporter created");
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
        <DialogHeader><DialogTitle>{isEdit ? "Edit Transporter" : "Register Transporter"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Transporter Number (5 digits)</Label>
            <Input
              value={form.transporter_number}
              maxLength={5}
              onChange={(e) => setForm({ ...form, transporter_number: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">First Name</Label>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || form.transporter_number.length !== 5}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Register Transporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Transporters() {
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<ApiTransporter | null>(null);
  const [formSession, setFormSession] = useState(0); 
  const queryClient = useQueryClient();

  const { data: transporters = [], isLoading } = useQuery<ApiTransporter[]>({
    queryKey: ["transporters", q],
    queryFn: () => api.listTransporters(q),
  });

  const deleteTransporter = useMutation({
    mutationFn: (id: number) => api.deleteTransporter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transporters"] });
      toast.success("Transporter deleted");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete transporter"),
  });

  const openCreate = () => { setEditingTransporter(null); setFormSession((s) => s + 1); setDialogOpen(true); };
  const openEdit = (t: ApiTransporter) => { setEditingTransporter(t); setDialogOpen(true); };

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="Transporters"
          description="Registered transporters and their bank details."
          actions={<Button onClick={openCreate}><Plus className="size-4" />Register Transporter</Button>}
        />

        <TransporterFormDialog
          key={editingTransporter?.id ?? `new-${formSession}`} 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingTransporter={editingTransporter}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["transporters"] })}
        />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transporter number, name…" className="pl-8" />
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.success("Transporters list exported to Excel")}>
                <FileSpreadsheet className="size-3.5" />Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.success("Transporters list exported to PDF")}>
                <FileText className="size-3.5" />PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.success("Transporters list sent to printer")}>
                <Printer className="size-3.5" />Print
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Transporter #</TableHead><TableHead>Name</TableHead>
                  <TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Loading transporters…</TableCell></TableRow>
                  )}
                  {!isLoading && transporters.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No transporters found.</TableCell></TableRow>
                  )}
                  {transporters.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.transporter_number}</TableCell>
                      <TableCell className="font-medium text-sm">{t.first_name} {t.last_name}</TableCell>
                      <TableCell className="text-sm">{t.address ?? "—"}</TableCell>
                      <TableCell><Badge variant={t.is_active ? "default" : "outline"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteTransporter.mutate(t.id)}
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