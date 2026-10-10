"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";

export function SearchingNearbyAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="relative flex size-40 items-center justify-center">
        {[0, 0.4, 0.8].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay, ease: "easeOut" }}
          />
        ))}
        <div className="relative flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft-lg">
          <Search className="size-8" />
        </div>
      </div>

      <div className="text-center">
        <p className="font-semibold">Searching nearby workers…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll notify you as soon as a worker accepts.
        </p>
      </div>
    </div>
  );
}
