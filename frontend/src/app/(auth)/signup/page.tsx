"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, HardHat, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { GuestRoute } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignupMutation } from "@/features/auth/authApi";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Identifier must be a valid phone number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  role: z.enum(["worker", "provider", "agent"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [signup, { isLoading }] = useSignupMutation();

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

  const role = watch("role");

  async function onSubmit(values: SignupFormValues) {
    try {
      await signup({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        role: values.role.toUpperCase() as any,
      }).unwrap();

      toast.success("OTP sent to your phone and email.");
      router.push(`/verify-otp?identifier=${encodeURIComponent(values.phone)}&channel=SMS&role=${values.role}`);
    } catch (err: any) {
      const msg = err?.data?.message || "Signup failed. Please try again.";
      toast.error(msg);
    }
  }

  return (
    <GuestRoute>
      <AuthLayout title="Create your account" subtitle="Join SHRAM as a worker or a hiring provider.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Role selection */}
          <div className="grid grid-cols-3 gap-3">
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
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-xs font-medium transition-all",
                      role === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {r === "worker" && <HardHat className="size-6" />}
                    {r === "provider" && <Building2 className="size-6" />}
                    {r === "agent" && <Users className="size-6" />}
                    {r === "worker" && "Worker"}
                    {r === "provider" && "Provider"}
                    {r === "agent" && "Agent"}
                  </button>
                )}
              />
            ))}
          </div>
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Ramesh Kumar" {...register("name")} required />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" placeholder="9876543210" {...register("phone")} required />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Send Registration OTP
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
