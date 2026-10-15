import { redirect } from "@tanstack/react-router";

export type AuthUser = {
  id: number; username: string; first_name: string; last_name: string;
  role: string; branches: string[]; is_superuser: boolean; permissions: string[];
};

export const isBranchAdmin = (u: AuthUser) => u.role === "admin" || u.is_superuser;

export function requireModule(user: AuthUser, module: string) {
  if (!isBranchAdmin(user) && !user.permissions.includes(module)) throw redirect({ to: "/dashboard" });
}

export function requireAdmin(user: AuthUser) {
  if (!isBranchAdmin(user)) throw redirect({ to: "/dashboard" });
}