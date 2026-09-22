"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Briefcase, Building2, Edit3, Save, Eye, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/hooks/redux";
import { useGetMyProviderProfileQuery, useUpdateMyProviderProfileMutation } from "@/features/provider/providerApi";
import { useUpdateMeMutation, useUploadProfileImageMutation, useDeleteProfileImageMutation } from "@/features/users/usersApi";

export default function ProviderProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading } = useGetMyProviderProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyProviderProfileMutation();
  const [updateMe, { isLoading: isMeSaving }] = useUpdateMeMutation();
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
  const [companyName, setCompanyName] = useState("");
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
    if (profile?.companyName) setCompanyName(profile.companyName);
  }, [profile]);

  async function handleSave() {
    try {
      await Promise.all([
        updateProfile({ companyName }).unwrap(),
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
                loading={editing && (isSaving || isMeSaving || isUploading)}
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
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              ) : (
                <h1 className="text-xl font-bold">{user?.name}</h1>
              )}
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
                  <p className="text-sm font-medium">{user?.address || "—"}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                {editing ? (
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium">{user?.city || "—"}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">State</Label>
                {editing ? (
                  <Input value={state} onChange={(e) => setState(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium">{user?.state || "—"}</p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pincode</Label>
                {editing ? (
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} />
                ) : (
                  <p className="text-sm font-medium">{user?.pincode || "—"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
