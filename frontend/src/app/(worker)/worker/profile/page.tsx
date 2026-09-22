"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Star, Briefcase, MapPin, Edit3, Save, Plus, Eye, Trash2, X } from "lucide-react";
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
import { useUpdateMeMutation, useUploadProfileImageMutation, useDeleteProfileImageMutation } from "@/features/users/usersApi";

export default function WorkerProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading } = useGetMyWorkerProfileQuery();
  const { data: allSkills } = useGetSkillsQuery();
  const [updateProfile, { isLoading: isProfileSaving }] = useUpdateMyWorkerProfileMutation();
  const [updateMe, { isLoading: isMeSaving }] = useUpdateMeMutation();
  const [addSkill] = useAddWorkerSkillMutation();
  const [uploadProfileImage, { isLoading: isUploading }] = useUploadProfileImageMutation();
  const [deleteProfileImage] = useDeleteProfileImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
 
  async function handleDeleteAvatar() {
    try {
      await deleteProfileImage().unwrap();
      toast.success("Profile picture deleted!");
    } catch (err) {
      console.error("Failed to delete profile picture:", err);
      toast.error("Failed to delete profile picture.");
    }
  }
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
 
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.address) setAddress(user.address);
    if (user?.city) setCity(user.city);
    if (user?.state) setState(user.state);
    if (user?.pincode) setPincode(user.pincode);
  }, [user]);
 
  useEffect(() => {
    if (profile?.bio) setBio(profile.bio);
  }, [profile]);
 
  async function handleSave() {
    try {
      await Promise.all([
        updateProfile({ bio }).unwrap(),
        updateMe({ name, address, city, state, pincode }).unwrap(),
      ]);
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err) {
      console.error("Couldn't update profile:", err);
      toast.error("Couldn't update profile.");
    }
  }
 
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
 
    try {
      await uploadProfileImage(file).unwrap();
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      toast.error("Failed to upload profile picture.");
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
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback className="text-2xl">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="absolute bottom-0 right-0 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105"
                >
                  <Camera className="size-3.5" />
                </button>

                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                    <div className="absolute top-26 left-0 z-50 w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-md">
                      {user?.profileImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowViewer(true);
                            setShowOptions(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <Eye className="size-4" /> See profile picture
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowOptions(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Camera className="size-4" /> Change profile picture
                      </button>
                      {user?.profileImage && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteAvatar();
                            setShowOptions(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" /> Delete profile picture
                        </button>
                      )}
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={isUploading}
                />
              </div>
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => (editing ? handleSave() : setEditing(true))}
                loading={editing && (isProfileSaving || isMeSaving || isUploading)}
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

            <div className="mt-4 space-y-1.5">
              {editing ? (
                <div className="space-y-1">
                  <Label htmlFor="profile-name">Name</Label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full max-w-md rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
              ) : (
                <h1 className="text-xl font-bold">{user?.name}</h1>
              )}
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

            <div className="mt-6 border-t pt-5 space-y-4">
              <h3 className="text-sm font-semibold">Address Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  {editing ? (
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user?.address || "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  {editing ? (
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user?.city || "—"}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  {editing ? (
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user?.state || "—"}</p>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Pincode</Label>
                  {editing ? (
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user?.pincode || "—"}</p>
                  )}
                </div>
              </div>
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

      {showViewer && user?.profileImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="relative max-w-3xl p-4">
            <button
              type="button"
              onClick={() => setShowViewer(false)}
              className="absolute -top-12 right-0 rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
            >
              <X className="size-5" />
            </button>
            <img
              src={user.profileImage}
              alt={user.name}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
