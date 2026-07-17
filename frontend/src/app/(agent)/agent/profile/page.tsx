"use client";

import { useEffect, useState } from "react";
import { Save, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateAgentProfileMutation,
  useGetMyAgentProfileQuery,
  useUpdateMyAgentProfileMutation,
} from "@/features/agent/agentApi";

export default function AgentProfilePage() {
  const { data: profile, isError } = useGetMyAgentProfileQuery();
  const [createProfile, { isLoading: isCreating }] = useCreateAgentProfileMutation();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateMyAgentProfileMutation();
  const [agencyName, setAgencyName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (profile) {
      setAgencyName(profile.agencyName ?? "");
      setDescription(profile.description ?? "");
    }
  }, [profile]);

  async function handleSave() {
    try {
      if (profile) {
        await updateProfile({ agencyName, description }).unwrap();
      } else {
        await createProfile({ agencyName, description }).unwrap();
      }
      toast.success("Agent profile saved");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Couldn't save agent profile.";
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserCog className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agent Profile</h1>
          <p className="text-sm text-muted-foreground">
            {isError ? "Create your agency profile." : "Manage your agency details."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="agencyName">Agency Name</Label>
            <Input
              id="agencyName"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Shram Workforce Agency"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Describe your agency and worker network"
            />
          </div>
          <Button onClick={handleSave} loading={isCreating || isUpdating}>
            <Save className="size-4" /> Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
