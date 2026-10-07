import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { PrintHeader, PrintFooter } from "@/components/print/PrintBranding";

export const Route = createFileRoute("/print/delivery-note/$id")({
  component: PrintDeliveryNote,
});

type ApiDeliveryNote = {
  id: number; dn_number: string; sale_date_display: string; date_received: string;
  grower_name: string; grower_number: string; transporter_name: string | null;
  branch: string; number_of_bales: number; remarks: string | null;
};

function PrintDeliveryNote() {
  const { id } = useParams({ from: "/print/delivery-note/$id" });
  const hasPrinted = useRef(false);

  const { data, isLoading } = useQuery<ApiDeliveryNote>({
    queryKey: ["print-delivery-note", id],
    queryFn: () => api.getDeliveryNote(Number(id)),
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
    <div className="print-area max-w-xl mx-auto p-8 print-compact">
      <PrintHeader documentTitle="Delivery Note" reference={data.dn_number} />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Sale Date</span><span className="font-mono">{data.sale_date_display}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Date Received</span><span className="font-mono">{data.date_received}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{data.branch}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Grower</span><span>{data.grower_name} ({data.grower_number})</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Transporter</span><span>{data.transporter_name ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Number of Bales</span><span className="font-mono">{data.number_of_bales}</span></div>
        {data.remarks && <div className="flex justify-between"><span className="text-muted-foreground">Remarks</span><span>{data.remarks}</span></div>}
      </div>
      <PrintFooter />
      <div className="no-print flex justify-center mt-6">
        <Button onClick={() => window.print()}><Printer className="size-4" />Print</Button>
      </div>
    </div>
  );
}