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

type ApiBuyer = {
  id: number; name: string; code: string; contact_person: string | null;
  contact: string | null; email: string | null; grade_count: number;
  is_active: boolean; is_current: boolean;
};

type ApiBuyerGrade = { id: number; buyer: number; code: string; is_active: boolean };

// ---------- Buyer create/edit — name/code/contact only ----------

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
  });

  const mutation = useMutation({
    mutationFn: () => isEdit ? api.updateBuyer(editingBuyer!.id, form) : api.createBuyer(form),
    onSuccess: () => { toast.success(isEdit ? "Buyer updated" : "Buyer created"); onSaved(); onOpenChange(false); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit Buyer" : "Add Buyer"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        {!isEdit && (
          <p className="text-xs text-muted-foreground">Grades are added afterwards from the buyer's row in the table.</p>
        )}
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

// ---------- Buyer grades manager — add form + table, scoped to one buyer ----------

function BuyerGradesDialog({ buyer, open, onOpenChange }: {
  buyer: ApiBuyer; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState("");

  const { data: grades = [], isLoading } = useQuery<ApiBuyerGrade[]>({
    queryKey: ["buyer-grades", buyer.id],
    queryFn: () => api.listBuyerGrades(buyer.id),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["buyer-grades", buyer.id] });
    queryClient.invalidateQueries({ queryKey: ["buyers"] }); // refresh grade_count
  };

  const addGrade = useMutation({
    mutationFn: () => api.createBuyerGrade(buyer.id, newCode.trim()),
    onSuccess: () => { setNewCode(""); invalidate(); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add grade"),
  });

  const toggleActive = useMutation({
    mutationFn: (g: ApiBuyerGrade) => api.updateBuyerGrade(g.id, { is_active: !g.is_active }),
    onSuccess: invalidate,
  });

  const deleteGrade = useMutation({
    mutationFn: (id: number) => api.deleteBuyerGrade(id),
    onSuccess: invalidate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{buyer.name} — Grades</DialogTitle></DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCode.trim()) { e.preventDefault(); addGrade.mutate(); }
            }}
            placeholder="e.g. A1"
            className="h-9"
          />
          <Button size="sm" onClick={() => addGrade.mutate()} disabled={!newCode.trim() || addGrade.isPending}>
            {addGrade.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Add
          </Button>
        </div>

        <div className="border rounded-md max-h-80 overflow-y-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
              {!isLoading && grades.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No grades added yet.</TableCell></TableRow>
              )}
              {grades.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono">{g.code}</TableCell>
                  <TableCell><Switch checked={g.is_active} onCheckedChange={() => toggleActive.mutate(g)} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteGrade.mutate(g.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Buyers tab ----------

function BuyersTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<ApiBuyer | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [gradesDialogBuyer, setGradesDialogBuyer] = useState<ApiBuyer | null>(null);

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
        {gradesDialogBuyer && (
          <BuyerGradesDialog
            buyer={gradesDialogBuyer}
            open={!!gradesDialogBuyer}
            onOpenChange={(v) => !v && setGradesDialogBuyer(null)}
          />
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Contact</TableHead><TableHead>Grades</TableHead><TableHead>Current</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Loading…</TableCell></TableRow>}
            {buyers.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="font-mono text-xs">{b.code}</TableCell>
                <TableCell className="text-sm">{b.contact_person ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setGradesDialogBuyer(b)}>
                    {b.grade_count} {b.grade_count === 1 ? "grade" : "grades"}
                  </Button>
                </TableCell>
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


// ---------- Sale Date and Exchange Rate tab (single values) ----------

type ApiSaleDate = { id: number; date: string; exchange_rate: string; is_open: boolean };

function SaleDateCard() {
  const queryClient = useQueryClient();
  const { data: current, isLoading } = useQuery<ApiSaleDate | null>({
    queryKey: ["sale-date-current"],
    queryFn: api.getCurrentSaleDate,
  });
  const [date, setDate] = useState("");
  const [rate, setRate] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sale-date-current"] });

  const openMutation = useMutation({
    mutationFn: () => api.openSaleDate(date, parseFloat(rate)),
    onSuccess: () => { toast.success("Sale date opened"); invalidate(); setDate(""); setRate(""); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to open sale date"),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.closeSaleDate(),
    onSuccess: () => { toast.success("Sale date closed"); invalidate(); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to close sale date"),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Sale Date</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : current ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium font-mono">{current.date}</div>
              <div className="text-xs text-muted-foreground">Exchange Rate: {current.exchange_rate}</div>
            </div>
            <Badge className="bg-success/15 text-success border-success/30">Open</Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sale date is currently open.</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">USD/ZIG Exchange Rate</Label>
            <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="font-mono" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openMutation.mutate()} disabled={!date || !rate || openMutation.isPending}>
            {current ? "Open New Sale Date" : "Open Sale Date"}
          </Button>
          {current && (
            <Button variant="outline" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              Close Sale Date
            </Button>
          )}
        </div>
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
            <SaleDateCard />
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