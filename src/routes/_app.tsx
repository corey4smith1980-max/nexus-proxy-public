import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Local UI preview only. Never set VITE_LOCAL_PREVIEW on a deployed service.
    if (import.meta.env.VITE_LOCAL_PREVIEW === "true") {
      return { user: null };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => (
    <TooltipProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster />
    </TooltipProvider>
  ),
});