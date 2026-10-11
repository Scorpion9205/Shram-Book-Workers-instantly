"use client";

import { useState, useEffect } from "react";
import { Sliders, Save, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useGetSettingsQuery, useUpdateSettingMutation } from "@/features/admin/adminApi";

export default function AdminSettingsPage() {
  const { data, isLoading, refetch } = useGetSettingsQuery();
  const [updateSetting, { isLoading: isUpdating }] = useUpdateSettingMutation();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const settings = data?.data ?? [];

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {};
      settings.forEach((s) => {
        initial[s.key] = Array.isArray(s.value) ? s.value.join(",") : String(s.value);
      });
      setEditValues(initial);
    }
  }, [settings]);

  // Settings are stored as real JSON (number, array of numbers, etc) — the <Input> only ever
  // gives back a string, so we convert back to the original value's shape before sending.
  // Sending the raw string (the previous behavior) always failed backend validation, since
  // e.g. "14" (string) !== 14 (number) even though 14 is perfectly in range.
  function parseEditedValue(key: string, raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
    const original = settings.find((s) => s.key === key)?.value;

    if (Array.isArray(original)) {
      const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
      const numbers = parts.map(Number);
      if (numbers.length === 0 || numbers.some((n) => !Number.isFinite(n))) {
        return { ok: false, error: `"${key}" must be a comma-separated list of numbers (e.g. 2,5,10).` };
      }
      return { ok: true, value: numbers };
    }

    if (typeof original === "number") {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        return { ok: false, error: `"${key}" must be a number.` };
      }
      return { ok: true, value: num };
    }

    return { ok: true, value: raw };
  }

  async function handleSaveSetting(key: string) {
    const raw = editValues[key];
    if (raw === undefined || raw === "") {
      toast.error("Value cannot be empty.");
      return;
    }

    const parsed = parseEditedValue(key, raw);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    try {
      const res = await updateSetting({ key, value: parsed.value }).unwrap();
      toast.success(res.message || `Setting "${key}" updated successfully.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update setting.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Adjust commissions, matching radius parameters, and system limits in real-time.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="size-5 text-primary" /> Configurations Panel
          </CardTitle>
          <CardDescription>
            Changes take effect immediately and invalidate target caches in Redis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">Loading configurations...</p>
          ) : settings.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No configuration variables found in the database.</p>
          ) : (
            <div className="divide-y divide-border">
              {settings.map((setting) => (
                <div key={setting.key} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 md:max-w-xl">
                    <h4 className="font-semibold text-foreground font-mono text-sm">{setting.key}</h4>
                    <p className="text-xs text-muted-foreground">{setting.description || "No description provided."}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editValues[setting.key] ?? ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [setting.key]: e.target.value,
                        }))
                      }
                      className="w-full md:w-48 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting(setting.key)}
                      disabled={
                        isUpdating ||
                        editValues[setting.key] ===
                          (Array.isArray(setting.value) ? setting.value.join(",") : String(setting.value))
                      }
                      className="shrink-0"
                    >
                      <Save className="size-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
