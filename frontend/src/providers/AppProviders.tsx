"use client";

import { ReduxProvider } from "./ReduxProvider";
import { ThemeProvider } from "./ThemeProvider";
import { AuthInitProvider } from "./AuthInitProvider";
import { SocketProvider } from "./SocketProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InstantRequestPopup } from "@/components/popups/InstantRequestPopup";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <AuthInitProvider>
          <SocketProvider>
            <TooltipProvider delayDuration={150}>
              {children}
              <InstantRequestPopup />
              <Toaster position="top-right" />
            </TooltipProvider>
          </SocketProvider>
        </AuthInitProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
