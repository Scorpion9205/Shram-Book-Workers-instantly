"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { LogOut, Trash2, Lock, Moon, Bell, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDeleteMeMutation } from "@/features/users/usersApi";
import { useChangePasswordMutation } from "@/features/auth/authApi";
import { useLogoutMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux";
import { clearAuth } from "@/store/authSlice";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
}

export function SettingsPanel() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const [changePassword, { isLoading: isChangingPw }] = useChangePasswordMutation();
  const [deleteMe, { isLoading: isDeleting }] = useDeleteMeMutation();
  const [logout] = useLogoutMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const { register, handleSubmit, reset } = useForm<PasswordForm>();

  async function onChangePassword(values: PasswordForm) {
  try {
    const result = await changePassword(values).unwrap();

    toast.success(result.message);

    reset();

    await logout().unwrap().catch(() => {});

    dispatch(clearAuth());

    router.replace("/login");

  } catch (err: any) {

    toast.error(
      err?.data?.message ??
      "Couldn't change password."
    );

  }
}

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      
    }
    dispatch(clearAuth());
    router.push("/login");
  }

  async function handleDelete() {
    try {
      await deleteMe().unwrap();
      dispatch(clearAuth());
      toast.success("Account deleted.");
      router.push("/");
    } catch {
      toast.error("Couldn't delete account. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" {...register("currentPassword", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...register("newPassword", { required: true, minLength: 8 })} />
            </div>
            <Button type="submit" loading={isChangingPw}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="size-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Dark mode</p>
          <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Push notifications</p>
          <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4" /> Privacy & Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="size-4" /> Logout
          </Button>
          <Separator />
          <Button
            variant="outline"
            className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" /> Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={isDeleting}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
