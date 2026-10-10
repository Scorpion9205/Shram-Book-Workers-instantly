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
  
  const phoneIdentifier = searchParams.get("identifier") || "";
  const emailIdentifier = searchParams.get("email") || "";
  const roleParam = searchParams.get("role");
  const role = roleParam ? (roleParam.toUpperCase() as "WORKER" | "PROVIDER" | "AGENT") : undefined;

  const [channel, setChannel] = useState<"EMAIL" | "SMS">(
    (searchParams.get("channel") || "SMS") as "EMAIL" | "SMS"
  );
  const identifier = channel === "EMAIL" ? emailIdentifier : phoneIdentifier;

  const [otp, setOtp] = useState("");
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  async function switchChannel(next: "EMAIL" | "SMS") {
    setChannel(next);
    setOtp("");
    try {
      await resendOtp({ channel: next, identifier: next === "EMAIL" ? emailIdentifier : phoneIdentifier, role }).unwrap();
      setSecondsLeft(RESEND_SECONDS);
      toast.success(next === "EMAIL" ? "A code has been sent to your email" : "A code has been sent to your phone");
    } catch (err: any) {
      const msg = err?.data?.message || "Couldn't send code. Please try again.";
      toast.error(msg);
    }
  }

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
      const result = await verifyOtp({ channel, identifier, code: otp }).unwrap();
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
        })
      );
      toast.success("Verification successful!");
      router.push(dashboardPathForRole(result.user.role));
    } catch (err: any) {
      const msg = err?.data?.message || "Invalid or expired code. Please try again.";
      toast.error(msg);
    }
  }

  async function handleResend() {
    try {
      await resendOtp({ channel, identifier, role }).unwrap();
      setSecondsLeft(RESEND_SECONDS);
      toast.success("A new code has been sent");
    } catch (err: any) {
      const msg = err?.data?.message || "Couldn't resend code. Please try again.";
      toast.error(msg);
    }
  }

  return (
    <AuthLayout
      title="Verify your account"
      subtitle="Enter the 6-digit code sent to both email or mobile"
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-7" />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Code sent via {channel === "EMAIL" ? "email" : "SMS"} to{" "}
          <span className="font-medium text-foreground">{identifier}</span>
        </p>

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

        {emailIdentifier && phoneIdentifier && (
          <p className="text-center text-sm text-muted-foreground">
            {channel === "SMS" ? "Not getting the SMS?" : "Want to use your phone instead?"}{" "}
            <button
              onClick={() => switchChannel(channel === "SMS" ? "EMAIL" : "SMS")}
              disabled={isResending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              Verify via {channel === "SMS" ? "email" : "SMS"} instead
            </button>
          </p>
        )}
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
