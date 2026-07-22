import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    try {
      const user = await api.me();
      return { user };
    } catch {
      throw redirect({
        to: "/",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});