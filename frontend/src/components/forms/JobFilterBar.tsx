"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORKER_CATEGORIES } from "@/lib/constants";
import type { JobFilters } from "@/features/jobs/jobsApi";

export function JobFilterBar({
  filters,
  onChange,
}: {
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search jobs by title or skill…"
          className="pl-9"
          defaultValue={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
        />
      </div>
      <Select
        value={filters.category || "all"}
        onValueChange={(v) => onChange({ ...filters, category: v === "all" ? undefined : v, page: 1 })}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {WORKER_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.sort || "latest"}
        onValueChange={(v) => onChange({ ...filters, sort: v as JobFilters["sort"], page: 1 })}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latest">Latest</SelectItem>
          <SelectItem value="nearest">Nearest</SelectItem>
          <SelectItem value="highest_salary">Highest Salary</SelectItem>
          <SelectItem value="highest_rated">Highest Rated</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
