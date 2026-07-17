"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/utils/validation";
import { useForgotPasswordMutation } from "@/features/auth/authApi";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values).unwrap();
      setSubmitted(true);
    } catch {
      toast.error("Couldn't process your request. Please try again.");
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your inbox" subtitle="We've sent password reset instructions.">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success">
            <MailCheck className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists, you'll receive a link to reset your password shortly.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your phone or email and we'll send you reset instructions.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Phone or Email</Label>
          <Input id="identifier" placeholder="98765 43210 or you@example.com" {...register("identifier")} />
          {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Send Reset Link
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
