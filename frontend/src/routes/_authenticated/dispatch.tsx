import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Scan, Printer, Truck, X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch · TIMS" }] }),
  component: Dispatch,
});

type LoadItem = { id: number; bale: number; ticket_number: string; grower_number: string; buyer_grade: string | null; mass: number; scanned_at: string };
type Load = {
  id: number; truck_registration: string; driver_name: string; destination: string; dispatch_date: string;
  is_open: boolean; items: LoadItem[]; bale_count: number; total_mass: number;
};

function fNum(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function NewLoadForm({ onCreated }: { onCreated: (load: Load) => void }) {
  const [truckRegistration, setTruckRegistration] = useState("");
  const [driverName, setDriverName] = useState("");
  const [destination, setDestination] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: () => api.createDispatchLoad({
      truck_registration: truckRegistration, driver_name: driverName,
      destination, dispatch_date: dispatchDate,
    }),
    onSuccess: (data: Load) => { toast.success("New load opened"); onCreated(data); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to open load"),
  });

  const canCreate = truckRegistration && driverName && destination && dispatchDate;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Open New Load</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Truck Registration</Label><Input value={truckRegistration} onChange={(e) => setTruckRegistration(e.target.value)} className="font-mono" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Driver Name</Label><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Dispatch Date</Label><Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} className="font-mono" /></div>
        <div className="col-span-2">
          <Button className="w-full" onClick={() => create.mutate()} disabled={!canCreate || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}Open Load
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Dispatch() {
  const queryClient = useQueryClient();
  const [activeLoad, setActiveLoad] = useState<Load | null>(null);
  const [barcode, setBarcode] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: openLoads = [] } = useQuery<Load[]>({ queryKey: ["open-dispatch-loads"], queryFn: api.listOpenDispatchLoads });

  useEffect(() => { if (activeLoad?.is_open) barcodeRef.current?.focus(); }, [activeLoad]);

  const refreshActiveLoad = (load: Load) => {
    setActiveLoad(load);
    queryClient.invalidateQueries({ queryKey: ["open-dispatch-loads"] });
  };

  const addBale = useMutation({
    mutationFn: (code: string) => api.addBaleToLoad(activeLoad!.id, code),
    onSuccess: (data: Load) => {
      toast.success("Bale loaded");
      refreshActiveLoad(data);
      setBarcode("");
      barcodeRef.current?.focus();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bale");
      setBarcode("");
      barcodeRef.current?.focus();
    },
  });

  const removeBale = useMutation({
    mutationFn: (itemId: number) => api.removeBaleFromLoad(activeLoad!.id, itemId),
    onSuccess: (data: Load) => { toast.success("Bale removed"); refreshActiveLoad(data); },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to remove bale"),
  });

  const closeLoad = useMutation({
    mutationFn: () => api.closeDispatchLoad(activeLoad!.id),
    onSuccess: (data: Load) => {
      toast.success("Load closed");
      refreshActiveLoad(data);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to close load"),
  });

  // Auto-submit as soon as a full barcode has been scanned — no Enter required.
  // Scanners deliver keystrokes far faster than a human types, so a short pause-based
  // debounce distinguishes "still typing" from "scan finished" without needing Enter.
  useEffect(() => {
    if (!barcode || !activeLoad?.is_open) return;
    const timeout = setTimeout(() => {
      if (barcode.trim().length >= 2) addBale.mutate(barcode.trim());
    }, 120);
    return () => clearTimeout(timeout);
  }, [barcode]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="Dispatch"
          description="Scan barcodes while loading the truck. Generates printable dispatch manifest."
          actions={activeLoad ? <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print Manifest</Button> : undefined}
        />

        {!activeLoad && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NewLoadForm onCreated={setActiveLoad} />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Open Loads</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Truck</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Bales</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {openLoads.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">No open loads</TableCell></TableRow>}
                    {openLoads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{l.truck_registration}</TableCell>
                        <TableCell className="text-sm">{l.destination}</TableCell>
                        <TableCell className="text-right font-mono">{l.bale_count}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setActiveLoad(l)}>Continue</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeLoad && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <Card><CardContent className="p-4">
                <Label className="text-xs">Truck Registration</Label>
                <div className="font-mono mt-1.5 text-sm">{activeLoad.truck_registration}</div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <Label className="text-xs">Driver Name</Label>
                <div className="mt-1.5 text-sm">{activeLoad.driver_name}</div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <Label className="text-xs">Destination</Label>
                <div className="mt-1.5 text-sm">{activeLoad.destination}</div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <Label className="text-xs">Dispatch Date</Label>
                <div className="font-mono mt-1.5 text-sm">{activeLoad.dispatch_date}</div>
              </CardContent></Card>
            </div>

            <div className="flex items-center justify-between mb-3 no-print">
              <Badge variant={activeLoad.is_open ? "default" : "outline"}>{activeLoad.is_open ? "Open" : "Closed"}</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveLoad(null)}>Back to Loads</Button>
                {activeLoad.is_open && (
                  <Button variant="outline" size="sm" onClick={() => closeLoad.mutate()} disabled={closeLoad.isPending}>
                    {closeLoad.isPending && <Loader2 className="size-4 animate-spin" />}Close Load
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Scan to Load</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {activeLoad.is_open ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Barcode</Label>
                      <div className="relative">
                        <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input ref={barcodeRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan ticket" className="pl-8 font-mono" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">This load is closed. No further bales can be added or removed.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-3 bg-muted/40 rounded-md text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bales Loaded</div>
                      <div className="text-2xl font-semibold font-mono mt-1">{activeLoad.bale_count}</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-md text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Mass</div>
                      <div className="text-2xl font-semibold font-mono mt-1">{fNum(activeLoad.total_mass)}</div>
                      <div className="text-[10px] text-muted-foreground">kg</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 print-area">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm">Dispatch Manifest</CardTitle>
                  <Badge variant="outline" className="font-mono">{activeLoad.bale_count} bales · {fNum(activeLoad.total_mass)} kg</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>#</TableHead><TableHead>Ticket</TableHead><TableHead>Grower</TableHead>
                      <TableHead>Grade</TableHead><TableHead className="text-right">Mass (kg)</TableHead><TableHead>Time</TableHead>
                      <TableHead className="no-print"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {activeLoad.items.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">No bales scanned yet</TableCell></TableRow>
                      )}
                      {activeLoad.items.map((item, i) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{item.ticket_number}</TableCell>
                          <TableCell className="font-mono text-xs">{item.grower_number}</TableCell>
                          <TableCell>{item.buyer_grade ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{item.mass}</TableCell>
                          <TableCell className="font-mono text-xs">{new Date(item.scanned_at).toTimeString().slice(0, 5)}</TableCell>
                          <TableCell className="no-print">
                            {activeLoad.is_open && (
                              <Button variant="ghost" size="sm" onClick={() => removeBale.mutate(item.id)}>
                                <X className="size-3.5 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}