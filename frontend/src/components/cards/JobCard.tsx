"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, IndianRupee, Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/types";

export function JobCard({ job, index = 0, href }: { job: Job; index?: number; href: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link href={href}>
        <Card className="h-full p-5 transition-transform hover:-translate-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{job.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{job.provider?.name || "Provider"}</span>

                {job.city && (
                  <>
                    <span>•</span>
                    <span>{job.city}</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="default" className="shrink-0 capitalize">
              {job.skill?.name}
            </Badge>
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {job.city
                ? `${job.city}${job.state ? `, ${job.state}` : ""}`
                : job.address || "Location not specified"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {new Date(job.createdAt).toLocaleDateString("en-IN")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {job.requiredWorkers} needed
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="flex items-center gap-0.5 text-lg font-bold text-primary">
              <IndianRupee className="size-4" />
              {job.budget ?? 0}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {job.skill?.name}
              </Badge>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
