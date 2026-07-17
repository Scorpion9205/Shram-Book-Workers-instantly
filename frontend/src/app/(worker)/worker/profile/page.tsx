"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Star, Briefcase, MapPin, Edit3, Save, Plus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks/redux";
import { useGetMyWorkerProfileQuery, useUpdateMyWorkerProfileMutation } from "@/features/worker/workerApi";
import { useGetSkillsQuery, useAddWorkerSkillMutation } from "@/features/skills/skillsApi";

export default function WorkerProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading } = useGetMyWorkerProfileQuery();
  const { data: allSkills } = useGetSkillsQuery();
  const [updateProfile] = useUpdateMyWorkerProfileMutation();
  const [addSkill] = useAddWorkerSkillMutation();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio || "");

  async function handleSave() {
    try {
      await updateProfile({ bio }).unwrap();
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Couldn't update profile.");
    }
  }
    console.log("All Skills", allSkills);
  console.log("Profile Skills", profile?.skills);

  const existingSkillIds = new Set((profile?.skills || []).map((s) => s.id));
    
  console.log("Existing Skill Ids", existingSkillIds);

  const availableSkills = (allSkills || []).filter((s) => !existingSkillIds.has(s.id));

   console.log("Available Skills", availableSkills);
  async function handleAddSkill(skillId: string) {
    try {
      await addSkill({
        skillIds: [
          ...Array.from(existingSkillIds),
          skillId,
        ],
      }).unwrap();
      toast.success("Skill added!");
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Couldn't add skill.";
      toast.error(message);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-28 bg-linear-to-r from-primary to-emerald-700" />
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

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-secondary p-3">
                <Star className="mx-auto mb-1 size-4 fill-accent text-accent" />
                <p className="font-semibold">{profile?.rating?.toFixed(1) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <Briefcase className="mx-auto mb-1 size-4 text-primary" />
                <p className="font-semibold">{profile?.completedJobs ?? 0}</p>
                <p className="text-xs text-muted-foreground">Jobs Done</p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <MapPin className="mx-auto mb-1 size-4 text-primary" />
                <p className="font-semibold">{profile?.experienceYears ?? 0}y</p>
                <p className="text-xs text-muted-foreground">Experience</p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <Label>Bio</Label>
              {editing ? (
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{profile?.bio || "No bio added yet."}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile?.skills?.map((s) => (
              <Badge key={s.id} variant="default">
                {s.name}
              </Badge>
            ))}
            {!profile?.skills?.length && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
          </div>
          {availableSkills.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Add a skill</p>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAddSkill(s.id)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Plus className="size-3" /> {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
