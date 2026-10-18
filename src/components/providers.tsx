import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilitySettings } from "@/components/cannify/accessibility-settings";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={250}>
        <AccessibilitySettings />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: "border-border bg-surface text-fg shadow-[var(--shadow-border)]",
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
