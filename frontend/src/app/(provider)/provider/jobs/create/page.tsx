"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { X, Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createJobSchema, type CreateJobFormValues } from "@/lib/utils/job-validation";
import { useCreateJobMutation } from "@/features/jobs/jobsApi";
import { useGetSkillsQuery } from "@/features/skills/skillsApi";
import { geocodeAddress } from "@/lib/utils/geocode";

export default function CreateJobPage() {
  const router = useRouter();
  const [createJob, { isLoading }] = useCreateJobMutation();
  const { data: availableSkills = [] } = useGetSkillsQuery();


  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema) as never,
    defaultValues: {
      skillId: "",
      workersRequired: 1,
    }
  });

  async function onSubmit(values: CreateJobFormValues) {
    try {
      const coordinates = await geocodeAddress(values.address);
      await createJob({
        title: values.title,
        description: values.description,
        skillId: values.skillId,
        address: values.address,
        salary: values.salary,
        workersRequired: values.workersRequired,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
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
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Job location" {...register("address")} />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" {...register("date")} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
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
