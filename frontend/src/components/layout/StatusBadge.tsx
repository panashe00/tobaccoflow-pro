import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  weighed: "bg-info/15 text-info border-info/30",
  processed: "bg-success/15 text-success border-success/30",
  dispatched: "bg-primary/15 text-primary border-primary/30",
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  verified: "bg-success/15 text-success border-success/30",
  unverified: "bg-warning/15 text-warning-foreground border-warning/30",
  mismatch: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: string }) {
  const k = status.toLowerCase();
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", map[k] || "")}>
      {status}
    </Badge>
  );
}
