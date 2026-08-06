import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Upload, MoreHorizontal, Loader2 } from "lucide-react";
import { BRANCHES, ROLES, EXCHANGE_RATE, SALE_DATE } from "@/lib/dummy-data";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · TIMS" }] }),
  component: Settings,
});

// ---------- Grades tab ----------

type ApiGrade = { id: number; code: string; description: string | null; is_active: boolean };

function GradesTab() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: "",});

  const { data: grades = [], isLoading } = useQuery<ApiGrade[]>({
    queryKey: ["grades"],
    queryFn: () => api.listGrades(),
  });

  const createGrade = useMutation({
    mutationFn: () => api.createGrade(form),
    onSuccess: () => {
      toast.success("Grade added");
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      setDialogOpen(false);
      setForm({ code: "",});
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add grade"),
  });

  const toggleActive = useMutation({
    mutationFn: (g: ApiGrade) => api.updateGrade(g.id, { is_active: !g.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grades"] }),
  });

  const deleteGrade = useMutation({
    mutationFn: (id: number) => api.deleteGrade(id),
    onSuccess: () => {
      toast.success("Grade deleted");
      queryClient.invalidateQueries({ queryKey: ["grades"] });
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.uploadGradesCsv(file);
      toast.success(`Imported: ${result.created} created, ${result.updated} updated`);
      queryClient.invalidateQueries({ queryKey: ["grades"] });
    } catch {
      toast.error("CSV upload failed");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">TIMB Grades</CardTitle>
        <div className="flex gap-2">
          <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="size-3.5" />Upload CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="size-3.5" />Add Grade</Button>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Grade</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => createGrade.mutate()} disabled={createGrade.isPending}>
                  {createGrade.isPending && <Loader2 className="size-4 animate-spin" />}Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
            {grades.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono">{g.code}</TableCell>
                <TableCell><Switch checked={g.is_active} onCheckedChange={() => toggleActive.mutate(g)} /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteGrade.mutate(g.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Buyers tab ----------

type ApiBuyer = {
  id: number; name: string; code: string; contact_person: string | null;
  contact: string | null; email: string | null; grade_list: string[];
  is_active: boolean; is_current: boolean;
};

function BuyerGradeTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const addGrade = () => {
    const code = draft.trim();
    if (code && !value.includes(code)) onChange([...value, code]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGrade(); } }}
          placeholder="e.g. A1"
          className="h-8 max-w-[140px]"
        />
        <Button type="button" size="sm" variant="outline" onClick={addGrade}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((code) => (
          <Badge key={code} variant="outline" className="gap-1">
            {code}
            <button type="button" onClick={() => onChange(value.filter((c) => c !== code))} className="text-muted-foreground hover:text-destructive">×</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function BuyerFormDialog({ open, onOpenChange, editingBuyer, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editingBuyer: ApiBuyer | null; onSaved: () => void;
}) {
  const isEdit = !!editingBuyer;
  const [form, setForm] = useState({
    name: editingBuyer?.name ?? "",
    code: editingBuyer?.code ?? "",
    contact_person: editingBuyer?.contact_person ?? "",
    contact: editingBuyer?.contact ?? "",
    email: editingBuyer?.email ?? "",
    grades: editingBuyer?.grade_list ?? [] as string[],
  });

  const mutation = useMutation({
    mutationFn: () => isEdit ? api.updateBuyer(editingBuyer!.id, form) : api.createBuyer(form),
    onSuccess: () => { toast.success(isEdit ? "Buyer updated" : "Buyer created"); onSaved(); onOpenChange(false); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Buyer" : "Add Buyer"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Buyer's Grades</Label>
            <BuyerGradeTagInput value={form.grades} onChange={(g) => setForm({ ...form, grades: g })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}{isEdit ? "Save Changes" : "Add Buyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BuyersTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<ApiBuyer | null>(null);
  const [formSession, setFormSession] = useState(0);

  const { data: buyers = [], isLoading } = useQuery<ApiBuyer[]>({ queryKey: ["buyers"], queryFn: () => api.listBuyers() });

  const deleteBuyer = useMutation({
    mutationFn: (id: number) => api.deleteBuyer(id),
    onSuccess: () => { toast.success("Buyer deleted"); queryClient.invalidateQueries({ queryKey: ["buyers"] }); },
  });

  const setCurrent = useMutation({
    mutationFn: (id: number) => api.setCurrentBuyer(id),
    onSuccess: () => { toast.success("Current buyer updated"); queryClient.invalidateQueries({ queryKey: ["buyers"] }); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to set current buyer"),
  });

  const openCreate = () => { setEditingBuyer(null); setFormSession((s) => s + 1); setDialogOpen(true); };
  const openEdit = (b: ApiBuyer) => { setEditingBuyer(b); setDialogOpen(true); };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Buyers</CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="size-3.5" />Add Buyer</Button>
      </CardHeader>
      <CardContent>
        <BuyerFormDialog
          key={editingBuyer?.id ?? `new-${formSession}`}
          open={dialogOpen} onOpenChange={setDialogOpen} editingBuyer={editingBuyer}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["buyers"] })}
        />
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Contact</TableHead><TableHead>Grades</TableHead><TableHead>Current</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
            {buyers.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="font-mono text-xs">{b.code}</TableCell>
                <TableCell className="text-sm">{b.contact_person ?? "—"}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{b.grade_list.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</div></TableCell>
                <TableCell>
                  {b.is_current
                    ? <Badge className="bg-success/15 text-success border-success/30">Current</Badge>
                    : <Button size="sm" variant="outline" onClick={() => setCurrent.mutate(b.id)}>Set Current</Button>}
                </TableCell>
                <TableCell><Badge variant={b.is_active ? "default" : "outline"}>{b.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(b)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteBuyer.mutate(b.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
// ---------- Deductions tab (permanent rules) ----------

type ApiDeductionRule = {
  id: number; name: string; calculation_type: string; rate: string;
  currency_treatment: string; is_permanent: boolean; is_active: boolean;
};

function DeductionsTab() {
  const queryClient = useQueryClient();
  const { data: rules = [], isLoading } = useQuery<ApiDeductionRule[]>({ queryKey: ["deduction-rules"], queryFn: api.listDeductionRules });

  const updateRule = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateDeductionRule(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deduction-rules"] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to update"),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Permanent Deduction Rules</CardTitle></CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          These 7 deductions always apply to every salesheet. Ad-hoc deductions are added per-transaction and aren't configured here.
        </p>
        <Table>
          <TableHeader><TableRow><TableHead>Deduction</TableHead><TableHead>Type</TableHead><TableHead>Rate</TableHead><TableHead>Currency</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.calculation_type === "percentage_of_value" ? "% of value" : "$ per bale"}
                </TableCell>
                <TableCell>
                  <Input
                    defaultValue={r.rate}
                    className="font-mono w-28 h-8"
                    onBlur={(e) => {
                      if (e.target.value !== r.rate) updateRule.mutate({ id: r.id, data: { rate: e.target.value } });
                    }}
                  />
                </TableCell>
                <TableCell className="uppercase text-xs">{r.currency_treatment}</TableCell>
                <TableCell>
                  <Switch checked={r.is_active} onCheckedChange={(v) => updateRule.mutate({ id: r.id, data: { is_active: v } })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Main Settings component ----------

function Settings() {
  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto">
        <PageHeader title="Settings" description="System-wide configuration. Changes are logged in the audit trail." />

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
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

          <TabsContent value="grades"><GradesTab /></TabsContent>
          <TabsContent value="buyers"><BuyersTab /></TabsContent>
          <TabsContent value="deductions"><DeductionsTab /></TabsContent>

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