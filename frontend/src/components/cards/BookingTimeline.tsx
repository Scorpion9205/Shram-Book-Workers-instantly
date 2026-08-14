"use client";

import { motion } from "framer-motion";
import { Check, Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

const steps = [
  {
    key: "CREATED",
    keys: ["CREATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"],
    label: "Created",
    icon: Clock
  },
  {
    key: "ASSIGNED",
    keys: ["WORKER_ASSIGNED", "WORKER_EN_ROUTE", "OTP_VERIFIED"],
    label: "Assigned",
    icon: Check
  },
  {
    key: "IN_PROGRESS",
    keys: ["WORK_STARTED"],
    label: "In Progress",
    icon: PlayCircle
  },
  {
    key: "COMPLETED",
    keys: ["WORK_COMPLETED", "PAYMENT_SETTLED", "REVIEWED", "CLOSED"],
    label: "Completed",
    icon: CheckCircle2
  }
];

export function BookingTimeline({ status }: { status: BookingStatus }) {
  if (["CANCELLED_BY_PROVIDER", "CANCELLED_BY_WORKER", "EXPIRED", "DISPUTED"].includes(status)) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
        <XCircle className="size-5" />
        <span className="font-medium">This booking was cancelled or expired</span>
      </div>
    );
  }

  const currentIdx = steps.findIndex((s) => s.keys.includes(status));

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => {
        const isComplete = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {idx > 0 && (
                <div className={cn("h-0.5 flex-1 transition-colors duration-500", idx <= currentIdx ? "bg-primary" : "bg-border")} />
              )}
              <motion.div
                animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.4, repeat: isCurrent ? Infinity : 0 }}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500",
                  isComplete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                )}
              >
                <step.icon className="size-4" />
              </motion.div>
              {idx < steps.length - 1 && (
                <div className={cn("h-0.5 flex-1 transition-colors duration-500", idx < currentIdx ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span className={cn("mt-2 text-[11px] font-medium", isComplete ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
