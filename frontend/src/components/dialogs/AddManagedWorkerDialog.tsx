"use client";

import { useState } from "react";
import { IndianRupee, Loader2, MapPin, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetSkillsQuery } from "@/features/skills/skillsApi";
import { useCreateManagedWorkerMutation } from "@/features/agent/agentWorkerApi";

interface AddManagedWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddManagedWorkerDialog({ open, onOpenChange }: AddManagedWorkerDialogProps) {
  const { data: skills = [] } = useGetSkillsQuery();
  const [createWorker, { isLoading }] = useCreateManagedWorkerMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function reset() {
    setName("");
    setPhone("");
    setDailyRate("");
    setSkillIds([]);
    setLocation(null);
  }

  function toggleSkill(skillId: string) {
    setSkillIds((prev) => (prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]));
  }

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation isn't supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error("Couldn't get your location. Please allow location access and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Please enter the worker's name.");
      return;
    }
    if (skillIds.length === 0) {
      toast.error("Select at least one skill.");
      return;
    }
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      toast.error("Phone number must be exactly 10 digits, or leave it blank.");
      return;
    }

    try {
      await createWorker({
        name: name.trim(),
        phone: phone || null,
        skillIds,
        dailyRate: dailyRate ? Number(dailyRate) : null,
        ...(location && { latitude: location.latitude, longitude: location.longitude }),
      }).unwrap();

      toast.success(`${name} added to your roster.`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't add worker.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> Add Worker
          </DialogTitle>
          <DialogDescription>
            For a worker without a smartphone — you'll manage their availability and job assignments on their behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
          </div>

          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit number, if they have one"
              maxLength={10}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Daily Rate (optional)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                className="pl-9"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Skills</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 max-h-40 overflow-y-auto">
              {skills.map((skill) => (
                <label key={skill.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={skillIds.includes(skill.id)} onCheckedChange={() => toggleSkill(skill.id)} />
                  {skill.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Button type="button" variant="outline" className="w-full" onClick={handleUseCurrentLocation} loading={locating}>
              <MapPin className="size-4" />
              {location ? "Location set — tap to update" : "Use my current location"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Used to match this worker to nearby requests. You can set it now or later from the roster.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Add Worker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
