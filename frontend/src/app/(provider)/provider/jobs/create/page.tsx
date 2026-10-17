"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Briefcase, CalendarClock, Zap } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createJobSchema, type CreateJobFormValues } from "@/lib/utils/job-validation";
import { useCreateJobMutation } from "@/features/jobs/jobsApi";
import { useGetSkillsQuery } from "@/features/skills/skillsApi";
import { AddressSearch } from "@/components/ui/AddressSearch";

export default function CreateJobPage() {
  const router = useRouter();
  const [createJob, { isLoading }] = useCreateJobMutation();
  const { data: availableSkills = [] } = useGetSkillsQuery();

  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  // "now" = as soon as possible; "later" = the provider picks a date and time.
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the user's own time zone.
  function toLocalInputValue(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema) as never,
    defaultValues: {
      skillId: "",
      workersRequired: 1,
      address: "",
    }
  });

  async function onSubmit(values: CreateJobFormValues) {
    // For a scheduled job, a date and time in the future is required.
    let scheduledIso: string | undefined;
    if (when === "later") {
      const picked = scheduledAt ? new Date(scheduledAt) : null;
      if (!picked || Number.isNaN(picked.getTime())) {
        setScheduleError("Please choose a date and time.");
        return;
      }
      if (picked.getTime() <= Date.now()) {
        setScheduleError("The date and time must be in the future.");
        return;
      }
      scheduledIso = picked.toISOString();
    }
    setScheduleError("");

    try {
      await createJob({
        title: values.title,
        description: values.description,
        skillId: values.skillId,
        address: values.address,
        salary: values.salary,
        workersRequired: values.workersRequired,
        scheduledAt: scheduledIso,
        latitude,
        longitude,
      }).unwrap();
      toast.success("Job posted successfully!");
      router.push("/provider/jobs");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Couldn't create job. Please try again.";
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Create Job</h1>
          <p className="text-sm text-muted-foreground">Post a job and let workers apply.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Fill in the details below. You can preview before publishing.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" placeholder="e.g. Experienced Plumber Needed" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Required Skill</Label>
                <Controller
                  name="skillId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSkills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.skillId && <p className="text-xs text-destructive">{errors.skillId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Describe the job requirements…"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  {...register("description")}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Work Location Address</Label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <AddressSearch
                      value={field.value}
                      onChange={(details) => {
                        field.onChange(details.address);
                        setLatitude(details.lat);
                        setLongitude(details.lng);
                      }}
                      placeholder="Search job location address..."
                    />
                  )}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>When is the work?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWhen("now");
                      setScheduleError("");
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                      when === "now" ? "border-primary bg-primary/10 text-primary" : "border-input bg-card hover:bg-secondary"
                    }`}
                  >
                    <Zap className="size-4" />
                    <span>
                      <span className="block font-medium">As soon as possible</span>
                      <span className="block text-xs text-muted-foreground">Today / right away</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhen("later")}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                      when === "later" ? "border-primary bg-primary/10 text-primary" : "border-input bg-card hover:bg-secondary"
                    }`}
                  >
                    <CalendarClock className="size-4" />
                    <span>
                      <span className="block font-medium">Schedule for later</span>
                      <span className="block text-xs text-muted-foreground">Pick a date and time</span>
                    </span>
                  </button>
                </div>
                {when === "later" && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    min={toLocalInputValue(new Date())}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      setScheduleError("");
                    }}
                  />
                )}
                {scheduleError && <p className="text-xs text-destructive">{scheduleError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="salary">Budget (₹)</Label>
                  <Input id="salary" type="number" placeholder="800" {...register("salary")} />
                  {errors.salary && <p className="text-xs text-destructive">{errors.salary.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workersRequired">Workers</Label>
                  <Input id="workersRequired" type="number" placeholder="1" {...register("workersRequired")} />
                  {errors.workersRequired && (
                    <p className="text-xs text-destructive">{errors.workersRequired.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" loading={isLoading}>
                Publish Job
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
