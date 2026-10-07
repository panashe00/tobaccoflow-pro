import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type PrintSettingsData = {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
  footer_text: string;
};

export function usePrintSettings() {
  return useQuery<PrintSettingsData>({ queryKey: ["print-settings"], queryFn: api.getPrintSettings });
}

export function PrintHeader({ documentTitle, reference }: { documentTitle: string; reference?: string }) {
  const { data } = usePrintSettings();
  return (
    <div className="flex items-start justify-between border-b pb-4 mb-6">
      <div className="flex items-start gap-3">
        {data?.logo ? (
          <img src={data.logo} alt="Company logo" className="size-12 rounded-md object-contain border" />
        ) : (
          <div className="size-12 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            {data?.company_name?.[0] ?? "T"}
          </div>
        )}
        <div>
          <div className="font-semibold text-lg">{data?.company_name || "Company Name"}</div>
          {data?.address && <div className="text-xs text-muted-foreground">{data.address}</div>}
          {(data?.phone || data?.email) && (
            <div className="text-xs text-muted-foreground">{[data?.phone, data?.email].filter(Boolean).join(" · ")}</div>
          )}
        </div>
      </div>
      <div className="text-right text-xs space-y-0.5">
        <div className="font-medium text-sm">{documentTitle}</div>
        {reference && <div className="font-mono text-muted-foreground">{reference}</div>}
      </div>
    </div>
  );
}

export function PrintFooter() {
  const { data } = usePrintSettings();
  if (!data?.footer_text) return null;
  return (
    <div className="mt-10 pt-3 border-t text-[10px] text-muted-foreground text-center">
      {data.footer_text}
    </div>
  );
}