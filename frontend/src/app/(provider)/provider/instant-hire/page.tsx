"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, IndianRupee, Users, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchingNearbyAnimation } from "@/components/loaders/SearchingNearbyAnimation";
import { instantHireSchema, type InstantHireFormValues } from "@/lib/utils/job-validation";
import { useCreateInstantRequestMutation } from "@/features/instantRequests/instantRequestApi";
import { useGetSkillsQuery } from "@/features/skills/skillsApi";
import { geocodeAddress } from "@/lib/utils/geocode";

type FlowStep = "form" | "searching" | "sent";

export default function InstantHirePage() {
  const [step, setStep] = useState<FlowStep>("form");
  const [createInstantRequest] = useCreateInstantRequestMutation();
  const { data: skills = [] } = useGetSkillsQuery();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<InstantHireFormValues>({
    resolver: zodResolver(instantHireSchema) as never,
    defaultValues: { workersNeeded: 1 },
  });

  async function onSubmit(values: InstantHireFormValues) {
    setStep("searching");
    try {
      const selectedSkill = skills.find(
        (skill) => skill.id === values.workerType
      );
      const coordinates = await geocodeAddress(values.address);

      await createInstantRequest({
        ...values,
        lat: coordinates?.latitude,
        lng: coordinates?.longitude,
        title: selectedSkill
          ? `Instant ${selectedSkill.name} request`
          : "Instant hire request",
      }).unwrap();
      // Let the searching animation play for a moment before confirming —
      // matches the "ripple, count increasing" experience from the spec.
      setTimeout(() => setStep("sent"), 2200);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Couldn't send instant request. Please try again.";
      toast.error(message);
      setStep("form");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Zap className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Instant Hire</h1>
          <p className="text-sm text-muted-foreground">Get a worker at your doorstep within minutes.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
                <CardDescription>Nearby available workers will be notified instantly.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label>Worker Type</Label>
                    <Controller
                      name="workerType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {skills.map((skill) => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.workerType && <p className="text-xs text-destructive">{errors.workerType.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="address" className="pl-9" placeholder="Where do you need the worker?" {...register("address")} />
                    </div>
                    {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="amount" type="number" className="pl-9" placeholder="500" {...register("amount")} />
                      </div>
                      {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="workersNeeded">Workers Needed</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="workersNeeded" type="number" className="pl-9" placeholder="1" {...register("workersNeeded")} />
                      </div>
                      {errors.workersNeeded && (
                        <p className="text-xs text-destructive">{errors.workersNeeded.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                      <textarea
                        id="notes"
                        rows={3}
                        placeholder="Any specific instructions…"
                        className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        {...register("notes")}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" variant="accent" className="w-full">
                    <Zap className="size-4" /> Send Instant Request
                  </Button>
                </form>
              </CardContent>
            </motion.div>
          )}

          {step === "searching" && (
            <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CardContent>
                <SearchingNearbyAnimation />
              </CardContent>
            </motion.div>
          )}

          {step === "sent" && (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success"
                >
                  <CheckCircle2 className="size-8" />
                </motion.div>
                <div>
                  <p className="font-semibold">Request sent successfully!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll notify you the moment a worker accepts. Check your notifications for updates.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep("form")}>
                  Send Another Request
                </Button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
