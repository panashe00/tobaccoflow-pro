import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ArrowRight, CheckCircle2, Search, Loader2, Truck, X} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/deductions")({
  head: () => ({ meta: [{ title: "Deductions · TIMS" }] }),
  component: Deductions,
});

type ApiPendingDN = {
  id: number; dn_number: string; grower_name: string; grower_number: string;
  transporter_id: number | null; transporter_name: string | null; requires_transporter_deduction: boolean;
  branch: string; number_of_bales: number; date_received: string; deduction_count: number;
  sale_date_display: string; is_editable: boolean; deductions_completed: boolean;
};

type ApiGrowerDeduction = {
  id: number; delivery_note: number; name: string; amount: string; note: string | null; is_transporter: boolean; created_at: string;
};

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function Deductions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDN, setSelectedDN] = useState<ApiPendingDN | null>(null);
  const [deleteDeduction, setDeleteDeduction] = useState<ApiGrowerDeduction | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [transporterAmount, setTransporterAmount] = useState("");
  

  const { data: pendingData, isLoading: loadingPending } = useQuery<{ count: number; results: ApiPendingDN[] }>({
    queryKey: ["pending-deductions", search],
    queryFn: () => api.listPendingDeductions(search),
  });

  const { data: deductions = [] } = useQuery<ApiGrowerDeduction[]>({
    queryKey: ["grower-deductions", selectedDN?.id],
    queryFn: () => api.listGrowerDeductions(selectedDN!.id),
    enabled: !!selectedDN,
  });

  const total = deductions.reduce((s, d) => s + parseFloat(d.amount), 0);
  const needsTransporterDeduction = !!selectedDN?.transporter_id && !deductions.some((d) => d.is_transporter);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["grower-deductions", selectedDN?.id] });
    queryClient.invalidateQueries({ queryKey: ["pending-deductions"] });
  };

  const addDeduction = useMutation({
    mutationFn: () => api.createGrowerDeduction({ delivery_note: selectedDN!.id, name, amount: parseFloat(amount), note: note || null }),
    onSuccess: () => {
      toast.success("Deduction added");
      setName(""); setAmount(""); setNote("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add deduction"),
  });

  const addTransporter = useMutation({
    mutationFn: () => api.addTransporterDeduction(selectedDN!.id, parseFloat(transporterAmount)),
    onSuccess: () => {
      toast.success("Transporter deduction added");
      setTransporterAmount("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to add transporter deduction"),
  });

  const removeDeduction = useMutation({
    mutationFn: (id: number) => api.deleteGrowerDeduction(id),
    onSuccess: () => { toast.success("Deduction removed"); invalidate(); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to remove deduction"),
  });

  const complete = useMutation({
    mutationFn: () => api.completeDeductions(selectedDN!.id),
    onSuccess: () => {
      toast.success(`Deductions finalised for ${selectedDN!.grower_name}. Forwarded to next stage.`);
      setSelectedDN(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to complete deductions"),
  });

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader title="Deductions" description="Capture internal deductions to be removed from farmer payment. Applies only where relevant, unlike preset deductions." />

        <Card className="mb-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Growers Pending Deductions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {search
                  ? "Searching all Delivery Notes that have been weighed. Only the open sale date can be edited."
                  : "Weighed D-Notes for the open sale date that haven't had deductions captured yet."}
              </p>
            </div>
            <Badge variant="outline" className="font-mono">{pendingData?.count ?? 0} {search ? "results" : "pending"}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative max-w-sm px-4 pt-2 pb-3">
              <Search className="absolute left-6.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search grower name or number…"
                className="pl-8 pr-10"
              />

              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-5 top-1/2 -translate-y-1/2 size-7"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Grower #</TableHead><TableHead>Name</TableHead><TableHead>D-Note</TableHead>
                <TableHead>Sale Date</TableHead><TableHead>Branch</TableHead><TableHead className="text-right">Bales</TableHead>
                <TableHead>Transporter</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingPending && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">Loading…</TableCell></TableRow>}
                {!loadingPending && (pendingData?.results.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">No growers found</TableCell></TableRow>
                )}
                {pendingData?.results.map((p) => {
                  const active = p.id === selectedDN?.id;
                  return (
                    <TableRow key={p.id} className={active ? "bg-muted/50" : ""}>
                      <TableCell className="font-mono text-xs">{p.grower_number}</TableCell>
                      <TableCell className="font-medium">{p.grower_name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.dn_number}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.sale_date_display}
                        {!p.is_editable && <Badge variant="outline" className="ml-2 font-normal">Read-only</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{p.branch}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{p.number_of_bales}</TableCell>
                      <TableCell className="text-sm">{p.transporter_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={active ? "secondary" : "default"}
                          onClick={() => { setSelectedDN(p); toast.success(p.is_editable ? `Capturing deductions for ${p.grower_name}` : `Viewing deductions for ${p.grower_name} (read-only)`); }}
                        >
                          {active ? "Selected" : <>{p.is_editable ? "Start" : "View"} <ArrowRight className="size-3 ml-1" /></>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Deduction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grower</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/30 text-sm font-mono">
                  {selectedDN ? `${selectedDN.grower_number} · ${selectedDN.grower_name}` : <span className="text-muted-foreground font-sans">Select from table above</span>}
                </div>
              </div>

              {selectedDN && !selectedDN.is_editable && (
                <p className="text-xs text-muted-foreground rounded-md border bg-muted/30 p-2">
                  This Delivery Note's sale date is closed. You can view its deductions but not edit them.
                </p>
              )}

              {selectedDN?.is_editable && selectedDN.transporter_id && needsTransporterDeduction && (
                <div className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Truck className="size-3.5" />Transporter Deduction Required
                  </div>
                  <div className="text-xs text-muted-foreground">{selectedDN.transporter_name}</div>
                  <div className="flex gap-2">
                    <Input type="number" step="0.01" value={transporterAmount} onChange={(e) => setTransporterAmount(e.target.value)} placeholder="Amount (USD)" className="font-mono h-8" />
                    <Button size="sm" onClick={() => addTransporter.mutate()} disabled={!transporterAmount || addTransporter.isPending}>
                      {addTransporter.isPending && <Loader2 className="size-3.5 animate-spin" />}Add
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Deduction Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canteen, Loan Repayment" disabled={!selectedDN?.is_editable} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" placeholder="0.00" disabled={!selectedDN?.is_editable} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Brief reason" disabled={!selectedDN?.is_editable} />
              </div>
              <Button onClick={() => addDeduction.mutate()} className="w-full" disabled={!selectedDN?.is_editable || !name || !amount || addDeduction.isPending}>
                {addDeduction.isPending && <Loader2 className="size-4 animate-spin" />}<Plus className="size-4" />Add Deduction
              </Button>
              <Button
                onClick={() => complete.mutate()}
                variant="outline"
                className="w-full"
                disabled={!selectedDN?.is_editable || needsTransporterDeduction || complete.isPending}
              >
                {complete.isPending && <Loader2 className="size-4 animate-spin" />}<CheckCircle2 className="size-4" />
                {selectedDN?.deductions_completed ? "Already Forwarded" : "Complete & Forward"}
              </Button>
              {selectedDN?.is_editable && needsTransporterDeduction && (
                <p className="text-xs text-warning-foreground text-center">Add the transporter deduction before completing.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm">Deductions for {selectedDN?.grower_name ?? "—"}</CardTitle>
              <Badge variant="outline" className="font-mono">Total: {formatUSD(total)}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {deductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.name}
                        {d.is_transporter && <Badge variant="secondary" className="ml-2 font-normal">Transporter</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{d.note ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(parseFloat(d.amount))}</TableCell>
                      <TableCell>
                        {selectedDN?.is_editable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDeduction(d)}
                            disabled={removeDeduction.isPending}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deductions.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                      {selectedDN ? "No deductions for this grower yet" : "Select a grower from the pending table"}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
       <Dialog
        open={!!deleteDeduction}
        onOpenChange={(open) => {
          if (!open && !removeDeduction.isPending) {
            setDeleteDeduction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete deduction?</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete this{" "}
              <span className="font-medium text-foreground">
                {deleteDeduction?.name}
              </span>{" "}
              deduction of{" "}
              <span className="font-medium text-foreground font-mono">
                {deleteDeduction
                  ? formatUSD(parseFloat(deleteDeduction.amount))
                  : ""}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDeduction(null)}
              disabled={removeDeduction.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteDeduction) {
                  removeDeduction.mutate(deleteDeduction.id, {
                    onSuccess: () => setDeleteDeduction(null),
                  });
                }
              }}
              disabled={removeDeduction.isPending}
            >
              {removeDeduction.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}