"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/forms/OtpInput";
import { useVerifyOtpMutation, useResendOtpMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux";
import { setCredentials } from "@/store/authSlice";
import { dashboardPathForRole } from "@/lib/utils/role-routing";

const RESEND_SECONDS = 30;

function VerifyOtpInner() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const identifier =
    searchParams.get("identifier") || "";

  const [otp, setOtp] = useState("");
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function handleVerify() {
    if (otp.length !== 6) {
      toast.error("Enter the complete 6-digit code");
      return;
    }
    try {
      const result = await verifyOtp({ identifier, otp }).unwrap();
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      );
      toast.success("Phone verified successfully!");
      router.push(dashboardPathForRole(result.user.role));
    } catch {
      toast.error("Invalid or expired code. Please try again.");
    }
  }

  async function handleResend() {
    try {
      await resendOtp({ identifier }).unwrap();
      setSecondsLeft(RESEND_SECONDS);
      toast.success("A new code has been sent");
    } catch {
      toast.error("Couldn't resend code. Please try again.");
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={identifier ? `Enter the 6-digit code sent to ${identifier}` : "Enter the 6-digit code sent to your phone"}
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-7" />
          </div>
        </div>

        <OtpInput value={otp} onChange={setOtp} />

        <Button onClick={handleVerify} className="w-full" size="lg" loading={isLoading}>
          Verify & Continue
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          {secondsLeft > 0 ? (
            <span className="font-medium">Resend in {secondsLeft}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpInner />
    </Suspense>
  );
}
