
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog";
import { ThemeProvider, useTheme } from "@/hooks/use-theme";

/**
 * Central provider stack — wraps the entire app.
 * MasterDataProvider and IssueProvider are in AppLayout only
 * (not needed for admin routes).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProvidersInner>{children}</ProvidersInner>
    </ThemeProvider>
  );
}

function ProvidersInner({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <AuthProvider>
      <TooltipProvider>
        <ConfirmDialogProvider>
          {children}
          <Toaster position="top-right" richColors closeButton theme={theme} />
        </ConfirmDialogProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
