
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ============================================================
// Centralized confirmation dialog — replaces window.confirm()
// Usage: const confirm = useConfirm();
//        const ok = await confirm({ title: "...", description: "..." });
// ============================================================

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { title: "", description: "" },
    resolve: null,
  });

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, open: false, resolve: null }));
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state.options.title}</DialogTitle>
            <DialogDescription>{state.options.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {state.options.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={state.options.variant ?? "default"}
              onClick={() => handleClose(true)}
            >
              {state.options.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error("useConfirm must be used within <ConfirmDialogProvider>");
  return context;
}
