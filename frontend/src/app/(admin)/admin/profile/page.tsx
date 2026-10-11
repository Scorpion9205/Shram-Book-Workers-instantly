"use client";

import { useEffect, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPanel } from "@/components/forms/SettingsPanel";
import { useGetMeQuery, useUpdateMeMutation } from "@/features/users/usersApi";

export default function AdminProfilePage() {
  const { data: me, isLoading } = useGetMeQuery();
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();
  const [name, setName] = useState("");

  useEffect(() => {
    if (me) setName(me.name ?? "");
  }, [me]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name can't be empty.");
      return;
    }
    try {
      await updateMe({ name: name.trim() }).unwrap();
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't update profile.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Admin Profile</h1>
          <p className="text-sm text-muted-foreground">Your account details and security settings.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={me?.email ?? ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email can't be changed from here.</p>
          </div>
          <Button onClick={handleSave} loading={isSaving} disabled={isLoading}>
            <Save className="size-4" /> Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Password change, appearance, and logout — same shared panel other roles use. Account
          deletion is intentionally left out here: an Admin self-deleting their own account is a
          very different risk than a Worker/Provider doing so. */}
      <SettingsPanel allowDeleteAccount={false} showHeader={false} />
    </div>
  );
}
