"use client";

import { ReduxProvider } from "./ReduxProvider";
import { ThemeProvider } from "./ThemeProvider";
import { AuthInitProvider } from "./AuthInitProvider";
import { SocketProvider } from "./SocketProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InstantRequestPopup } from "@/components/popups/InstantRequestPopup";
import { BiddingRequestPopup } from "@/components/popups/BiddingRequestPopup";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <ThemeProvider>
        <AuthInitProvider>
          <SocketProvider>
            <TooltipProvider delayDuration={150}>
              {children}
              <InstantRequestPopup />
              <BiddingRequestPopup />
              <Toaster position="top-right" />
            </TooltipProvider>
          </SocketProvider>
        </AuthInitProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
