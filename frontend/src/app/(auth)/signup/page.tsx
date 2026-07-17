"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, HardHat, Users } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { GuestRoute } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/forms/PasswordStrengthMeter";
import { signupSchema, type SignupFormValues } from "@/lib/utils/validation";
import { useSignupMutation } from "@/features/auth/authApi";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [signup, { isLoading }] = useSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "worker", email: "" },
  });

  const password = watch("password") || "";
  const role = watch("role");

  async function onSubmit(values: SignupFormValues) {
    try {
      await signup({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        password: values.password,
        role: values.role,
      }).unwrap();
      const identifier = values.email || values.phone;
      toast.success("OTP sent to your email.");
      router.push(`/verify-otp?identifier=${encodeURIComponent(identifier)}`);
    } catch (err: unknown) {
      const data = (err as {
        data?: {
          message?: string;
          errors?: { message?: string }[] | Record<string, string[]>;
        };
      })?.data;

      const validationMessage = Array.isArray(data?.errors)
        ? data.errors[0]?.message
        : data?.errors
          ? Object.values(data.errors)[0]?.[0]
          : undefined;

      const message =
        data?.message ||
        validationMessage ||
        "Signup failed. Please try again.";
      toast.error(message);
    }
  }

  return (
    <GuestRoute>
      <AuthLayout title="Create your account" subtitle="Join SHRAM as a worker or a hiring provider.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Role selection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["worker", "provider", "agent"] as const).map((r) => (
              <Controller
                key={r}
                name="role"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(r)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-all",
                      role === r
                        ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {r === "worker" && <HardHat className="size-6" />}
                    {r === "provider" && <Building2 className="size-6" />}
                    {r === "agent" && <Users className="size-6" />}
                    {r === "worker" && "I'm a Worker"}
                    {r === "provider" && "I'm a Provider"}
                    {r === "agent" && "I'm an Agent"}
                  </button>
                )}
              />
            ))}
          </div>
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Ramesh Kumar" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" placeholder="98765 43210" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Create Account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </AuthLayout>
    </GuestRoute>
  );
}
