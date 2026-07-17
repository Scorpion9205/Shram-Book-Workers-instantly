"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: [0, -4, 4, 0] }}
            transition={{ duration: 0.6 }}
            className="flex size-28 items-center justify-center rounded-3xl bg-destructive/10"
          >
            <AlertTriangle className="size-12 text-destructive" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              An unexpected error occurred. Please try again, or come back later.
            </p>
          </div>

          <Button size="lg" onClick={() => reset()}>
            <RefreshCcw className="size-4" /> Try Again
          </Button>
        </div>
      </body>
    </html>
  );
}
