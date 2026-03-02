
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog";

/**
 * Central provider stack — wraps the entire app.
 * MasterDataProvider and IssueProvider are in AppLayout only
 * (not needed for admin routes).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ConfirmDialogProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ConfirmDialogProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
