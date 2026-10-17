"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Save, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/cards/EmptyState";
import { ListSkeleton } from "@/components/loaders/Skeletons";
import { useGetSkillRatesQuery, useUpdateSkillBaseRateMutation } from "@/features/admin/adminApi";

export default function AdminSkillRatesPage() {
  const { data, isLoading } = useGetSkillRatesQuery();
  const [updateRate, { isLoading: isSaving }] = useUpdateSkillBaseRateMutation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const skills = data?.data?.skills ?? [];

  useEffect(() => {
    const initial: Record<string, string> = {};
    skills.forEach((s) => {
      initial[s.id] = String(s.baseRate);
    });
    setValues(initial);
  }, [data]);

  async function handleSave(id: string) {
    const baseRate = Number(values[id]);
    if (!Number.isFinite(baseRate) || baseRate <= 0) {
      toast.error("Enter a rate above ₹0.");
      return;
    }
    setSavingId(id);
    try {
      await updateRate({ skillId: id, baseRate }).unwrap();
      toast.success("Base rate updated.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't update the rate.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Skill Rates</h1>
        <p className="text-sm text-muted-foreground">
          The market price for each skill, per worker. It sets the price of instant requests, and keeps provider
          budgets and worker bids within sensible limits (set the limits in Settings:{" "}
          <code>budgetMinPercentOfBase</code>, <code>budgetMaxPercentOfBase</code>, <code>bidMinPercent</code>,{" "}
          <code>bidMaxPercent</code>).
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton count={5} />
      ) : !skills.length ? (
        <EmptyState icon={Wrench} title="No skills yet" description="Skills will show up here once they are added." />
      ) : (
        <div className="space-y-3">
          {skills.map((s) => {
            const changed = values[s.id] !== undefined && Number(values[s.id]) !== s.baseRate;
            return (
              <Card key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.category ?? "No category"} · per {s.rateUnit.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="w-32 pl-9"
                      value={values[s.id] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    />
                  </div>
                  <Button size="sm" onClick={() => handleSave(s.id)} disabled={!changed} loading={isSaving && savingId === s.id}>
                    <Save className="size-4" /> Save
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
