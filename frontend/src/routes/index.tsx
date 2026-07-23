import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Lock, User, Building2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRANCHES } from "@/lib/dummy-data";
import { api, ApiError } from "../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Login });

function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.login(username, password);
      const me = await api.me();
      toast.success(`Welcome back, ${me.first_name} ${me.last_name}`);
      nav({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: "linear-gradient(135deg, oklch(0.22 0.02 200) 0%, oklch(0.28 0.04 160) 100%)" }}>
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />
      <div className="w-full max-w-[420px] relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary/90 mb-4 shadow-lg">
            <Leaf className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-white text-xl font-semibold tracking-tight">Tobacco In-House Management</h1>
          <p className="text-white/60 text-sm mt-1">Secure Operations Portal · v2.4</p>
        </div>

        <div className="bg-card rounded-lg shadow-2xl border p-6">
          <div className="mb-5">
            <h2 className="font-semibold">Sign in to your account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter your credentials and select branch</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u" className="text-xs">Username</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="u"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="p"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            {/* <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select defaultValue="Harare">
                <SelectTrigger>
                  <Building2 className="size-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div> */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox defaultChecked /> <span>Remember me</span>
              </label>
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <div className="mt-5 pt-4 border-t text-[11px] text-muted-foreground text-center">
            Authorized personnel only. All activity is logged and audited.
          </div>
        </div>
        <div className="text-center mt-4 text-xs text-white/40">© 2024 TIMS · Zimbabwe Tobacco Operations</div>
      </div>
    </div>
  );
}