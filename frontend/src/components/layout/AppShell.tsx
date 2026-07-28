import { Link, useLocation, useNavigate, useRouteContext } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Scale, Receipt, ScanLine, CheckCircle2,
  FileSpreadsheet, Truck, Settings, BarChart3, Users, LogOut, Search,
  Bell, ChevronDown, Leaf, Sprout,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SALE_DATE, EXCHANGE_RATE } from "@/lib/dummy-data";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  accounts: "Accounts",
  data: "Data Capturing",
  growers: "Growers Rep",
};

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/delivery-notes", label: "Delivery Notes", icon: FileText },
  { to: "/weighing", label: "Bale Weighing", icon: Scale },
  { to: "/deductions", label: "Deductions", icon: Receipt },
  { to: "/pre-processing", label: "Ticket Pre-Processing", icon: ScanLine },
  { to: "/processing", label: "Bale Processing", icon: CheckCircle2 },
  { to: "/salesheet", label: "Salesheet Generation", icon: FileSpreadsheet },
  { to: "/dispatch", label: "Dispatch", icon: Truck },
];

const NAV_ADMIN = [
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users", label: "User Management", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.username[0].toUpperCase();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  const handleSignOut = async () => {
    try {
      await api.logout();
    } finally {
      nav({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border no-print">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="size-9 rounded-md bg-primary/90 flex items-center justify-center">
            <Leaf className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight">TIMS</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">In-House Mgmt</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Operations</div>
            <div className="space-y-0.5">
              {NAV.map((n) => {
                const active = loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
                return (
                  <Link key={n.to} to={n.to}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                    }`}>
                    <n.icon className="size-4" />{n.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {user.role === "admin" && (
            <div>
              <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administration</div>
              <div className="space-y-0.5">
                {NAV_ADMIN.map((n) => {
                  const active = loc.pathname === n.to;
                  return (
                    <Link key={n.to} to={n.to}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                      }`}>
                      <n.icon className="size-4" />{n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
          <div className="flex justify-between"><span>Sale Date</span><span className="font-mono text-sidebar-foreground/90">{SALE_DATE}</span></div>
          <div className="flex justify-between mt-1"><span>USD/ZIG</span><span className="font-mono text-sidebar-foreground/90">{EXCHANGE_RATE.toFixed(2)}</span></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center px-6 gap-4 no-print">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search grower, ticket, delivery note…" className="pl-8 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span className="size-1.5 rounded-full bg-success" />Branch: Harare
            </Badge>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-1.5 bg-destructive rounded-full" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <Avatar className="size-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback></Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-medium leading-tight">{fullName}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</div>
                  </div>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Audit Log</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="size-4 mr-2" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 no-print">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}