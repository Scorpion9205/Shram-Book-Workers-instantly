"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, ShieldCheck, Zap, Star } from "lucide-react";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left illustration panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-primary via-emerald-700 to-emerald-900 p-10 text-white lg:flex">
        <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-24 -right-10 size-96 rounded-full bg-accent/20 blur-3xl animate-[float_10s_ease-in-out_infinite]" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white text-primary font-bold text-lg">
            S
          </div>
          <span className="text-xl font-bold">SHRAM</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 space-y-6"
        >
          <h2 className="max-w-md text-balance text-3xl font-bold leading-tight">
            India's smart labour hiring platform.
          </h2>
          <p className="max-w-sm text-balance text-white/80">
            Instantly hire trusted nearby workers, or find skilled jobs near you — in minutes.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            {[
              { icon: Zap, text: "Instant hiring with live tracking" },
              { icon: ShieldCheck, text: "Verified, rated workers" },
              { icon: Star, text: "Secure, transparent payments" },
            ].map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                  <f.icon className="size-4" />
                </div>
                <span className="text-sm text-white/90">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/60">
          <Briefcase className="size-3.5" />
          Trusted by thousands of providers & workers across India
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
              S
            </div>
            <span className="text-lg font-bold">SHRAM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
