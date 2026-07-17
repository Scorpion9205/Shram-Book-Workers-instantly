"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";

export function SearchingNearbyAnimation() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => (c < 12 ? c + Math.ceil(Math.random() * 2) : c));
    }, 450);
    return () => clearInterval(interval);
  }, []);

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
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" />
          <motion.span key={count} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="font-semibold text-primary tabular-nums">
            {count}
          </motion.span>
          workers notified
        </p>
      </div>
    </div>
  );
}
