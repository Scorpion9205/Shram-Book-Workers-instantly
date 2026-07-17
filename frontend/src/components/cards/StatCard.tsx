"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  suffix,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "destructive";
  suffix?: string;
  delay?: number;
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight">
              {value}
              {suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>}
            </p>
          </div>
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
