import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { getEdpPortalUrl } from "@/lib/config";
import { ShieldAlert, RefreshCw, Mail, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MasterDataProvider } from "@/hooks/use-master-data";
import { IssueProvider } from "@/hooks/use-issues";

export function AppLayout() {
  const { isLoading, isAuthenticated, isBlocked, isNotRegistered, authFailed } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Authentication Failed</h1>
                <p className="text-sm text-muted-foreground">
                  Your login session is invalid or has expired.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Please click below to return to the login portal and try again.
              </p>
              <Button
                className="w-full gap-2"
                onClick={async () => {
                  const url = await getEdpPortalUrl();
                  window.location.href = url;
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Retry Login
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>
                Need help?{" "}
                <a
                  href="mailto:ITSupportDesk@ali-sons.com"
                  className="font-medium text-primary hover:underline"
                >
                  ITSupportDesk@ali-sons.com
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isNotRegistered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <UserX className="h-10 w-10 text-orange-600" />
              </div>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Access Not Granted</h1>
                <p className="text-sm text-muted-foreground">
                  Your account has not been registered for this application.
                </p>
              </div>
            </div>

            <Separator />

            <p className="text-sm text-muted-foreground text-center">
              Please contact your administrator to request access to the DMS Issue Tracker portal.
            </p>

            <Separator />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>
                Need help?{" "}
                <a
                  href="mailto:ITSupportDesk@ali-sons.com"
                  className="font-medium text-primary hover:underline"
                >
                  ITSupportDesk@ali-sons.com
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Account Blocked</h1>
                <p className="text-sm text-muted-foreground">
                  Your account has been blocked by an administrator.
                </p>
              </div>
            </div>

            <Separator />

            <p className="text-sm text-muted-foreground text-center">
              Please contact your administrator for assistance.
            </p>

            <Separator />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>
                Need help?{" "}
                <a
                  href="mailto:ITSupportDesk@ali-sons.com"
                  className="font-medium text-primary hover:underline"
                >
                  ITSupportDesk@ali-sons.com
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <MasterDataProvider>
      <IssueProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Header />
            <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
              <Outlet />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </IssueProvider>
    </MasterDataProvider>
  );
}
