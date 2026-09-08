"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Building2, Eye, EyeOff, HardHat, ShieldCheck, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { GuestRoute } from "@/components/layout/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminLoginMutation, useSendOtpMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/hooks/redux";
import { setCredentials } from "@/store/authSlice";
import { dashboardPathForRole } from "@/lib/utils/role-routing";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");
  
  // OTP Form State
  const [identifier, setIdentifier] = useState("");
  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();

  // Password Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminLogin, { isLoading: isLoggingIn }] = useAdminLoginMutation();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) {
      toast.error("Please enter a valid phone or email.");
      return;
    }

    // Determine channel based on format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const channel = isEmail ? "EMAIL" : "SMS";

    try {
      await sendOtp({
        channel,
        identifier,
      }).unwrap();

      toast.success(`OTP successfully sent to your ${isEmail ? "email" : "phone number"}.`);
      router.push(`/verify-otp?identifier=${encodeURIComponent(identifier)}&channel=${channel}`);
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to send OTP. Please try again.";
      toast.error(msg);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and Password are required.");
      return;
    }

    try {
      const result = await adminLogin({ email, password }).unwrap();
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
        })
      );
      toast.success(`Welcome back, ${result.user.name}!`);
      router.push(dashboardPathForRole(result.user.role));
    } catch (err: any) {
      const msg = err?.data?.message || "Invalid email or password.";
      toast.error(msg);
    }
  }

  return (
    <GuestRoute>
      <AuthLayout title="Log in to Shram" subtitle="Select your role to access your portal.">
        
        {/* Toggle Mode Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMode("otp")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
              loginMode === "otp"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            OTP Login (User)
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("password")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
              loginMode === "password"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Password Login (Admin)
          </button>
        </div>

        {loginMode === "otp" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">


            <div className="space-y-1.5">
              <Label htmlFor="identifier">Phone or Email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 98765 43210 or user@shram.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isSendingOtp}>
              Send Verification OTP
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shram.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isLoggingIn}>
              Log In
            </Button>
          </form>
        )}
      </AuthLayout>
    </GuestRoute>
  );
}
