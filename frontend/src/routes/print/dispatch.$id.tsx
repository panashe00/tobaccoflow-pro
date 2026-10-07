import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { PrintHeader, PrintFooter } from "@/components/print/PrintBranding";

export const Route = createFileRoute("/print/dispatch/$id")({
  component: PrintDispatch,
});

type LoadItem = { id: number; ticket_number: string; grower_number: string; buyer_grade: string | null; mass: number; scanned_at: string };
type Load = {
  id: number; truck_registration: string; driver_name: string; destination: string; dispatch_date: string;
  items: LoadItem[]; bale_count: number; total_mass: number;
};

function fNum(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

function PrintDispatch() {
  const { id } = useParams({ from: "/print/dispatch/$id" });
  const hasPrinted = useRef(false);

  const { data, isLoading } = useQuery<Load>({
    queryKey: ["print-dispatch", id],
    queryFn: () => api.getDispatchLoad(Number(id)),
  });

  useEffect(() => {
    if (data && !hasPrinted.current) {
      hasPrinted.current = true;
      setTimeout(() => window.print(), 300);
    }
  }, [data]);

  if (isLoading || !data) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="print-area max-w-2xl mx-auto p-8 print-compact">
      <PrintHeader documentTitle="Dispatch Manifest" reference={data.truck_registration} />
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="flex justify-between"><span className="text-muted-foreground">Truck Registration</span><span className="font-mono">{data.truck_registration}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Driver</span><span>{data.driver_name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span>{data.destination}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Dispatch Date</span><span className="font-mono">{data.dispatch_date}</span></div>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>#</TableHead><TableHead>Ticket</TableHead><TableHead>Grower</TableHead>
          <TableHead>Grade</TableHead><TableHead className="text-right">Mass (kg)</TableHead><TableHead>Time</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.items.map((item, i) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
              <TableCell className="font-mono text-xs">{item.ticket_number}</TableCell>
              <TableCell className="font-mono text-xs">{item.grower_number}</TableCell>
              <TableCell>{item.buyer_grade ?? "—"}</TableCell>
              <TableCell className="text-right font-mono">{item.mass}</TableCell>
              <TableCell className="font-mono text-xs">{new Date(item.scanned_at).toTimeString().slice(0, 5)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/40 font-medium">
            <TableCell colSpan={4}>TOTAL ({data.bale_count} bales)</TableCell>
            <TableCell className="text-right font-mono">{fNum(data.total_mass)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <PrintFooter />
      <div className="no-print flex justify-center mt-6">
        <Button onClick={() => window.print()}><Printer className="size-4" />Print</Button>
      </div>
    </div>
  );
}