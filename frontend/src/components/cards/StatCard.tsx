"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "destructive";
  suffix?: string;
  delay?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  suffix,
  delay = 0,
}: StatCardProps) {
  const accentClasses: Record<string, string> = {
    primary:
      "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/20",
    accent:
      "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20",
    success:
      "bg-green-500/15 text-green-400 ring-1 ring-green-500/20",
    destructive:
      "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay,
      }}
    >
      <Card
        className="
          group
          h-34.5
          rounded-3xl
          border
          border-border/70
          bg-card/80
          backdrop-blur-md
          p-6
          transition-all
          duration-300
          hover:-translate-y-1
          hover:border-primary/40
          hover:shadow-xl
          hover:shadow-primary/10
        "
      >
        <div className="flex h-full items-start justify-between">
          <div className="flex h-full flex-col justify-between">
            <p className="text-[15px] font-medium leading-6 text-muted-foreground">
              {label}
            </p>

            <h2 className="text-4xl font-bold tracking-tight">
              {value}

              {suffix && (
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  {suffix}
                </span>
              )}
            </h2>
          </div>

          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110",
              accentClasses[accent]
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}