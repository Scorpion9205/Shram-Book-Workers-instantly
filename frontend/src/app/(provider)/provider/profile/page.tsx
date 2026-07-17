"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Briefcase, Building2, Edit3, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks/redux";
import { useGetMyProviderProfileQuery, useUpdateMyProviderProfileMutation } from "@/features/provider/providerApi";

export default function ProviderProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading } = useGetMyProviderProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyProviderProfileMutation();
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState(profile?.companyName || "");
  const [address, setAddress] = useState(profile?.address || "");

  async function handleSave() {
    try {
      await updateProfile({ companyName, address }).unwrap();
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Couldn't update profile.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-primary to-emerald-700" />
          <CardContent className="relative pt-0">
            <div className="-mt-12 flex items-end justify-between">
              <div className="relative">
                <Avatar className="size-24 border-4 border-card">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="text-2xl">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
                  <Camera className="size-3.5" />
                </button>
              </div>
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => (editing ? handleSave() : setEditing(true))}
                loading={editing && isSaving}
              >
                {editing ? (
                  <>
                    <Save className="size-3.5" /> Save
                  </>
                ) : (
                  <>
                    <Edit3 className="size-3.5" /> Edit Profile
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4">
              <h1 className="text-xl font-bold">{user?.name}</h1>
              <p className="text-sm text-muted-foreground">{user?.phone}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" /> Company Name
                </Label>
                {editing ? (
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium">{profile?.companyName || "—"}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase className="size-3.5" /> Jobs Posted
                </Label>
                <p className="text-sm font-medium">{profile?.totalJobsPosted ?? 0}</p>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Address</Label>
                {editing ? (
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium">{profile?.address || "—"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
