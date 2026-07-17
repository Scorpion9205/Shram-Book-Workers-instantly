"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  MapPinned,
  CreditCard,
  Wrench,
  Bolt,
  PaintRoller,
  Hammer,
  Bath,
  Sparkles,
  Wind,
  Flame,
  Car,
  Cog,
  Trees,
  ArrowRight,
  PersonStanding
} from "lucide-react";

import { LandingNavbar } from "@/components/layout/LandingNavbar";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Zap, title: "Instant Hiring", desc: "Get a worker at your doorstep in minutes with our instant request system." },
  { icon: ShieldCheck, title: "Verified Workers", desc: "Every worker is verified and rated by real providers like you." },
  { icon: MapPinned, title: "Live Tracking", desc: "Track your worker's location in real-time once they accept the job." },
  { icon: CreditCard, title: "Secure Payments", desc: "Transparent pricing with secure, hassle-free payment flows." },
];

const categories = [
  { label: "Plumber", icon: Wrench },
  { label: "Electrician", icon: Bolt },
  { label: "Painter", icon: PaintRoller },
  { label: "Carpenter", icon: Hammer },
  { label: "Mason", icon: Bath },
  { label: "Cleaner", icon: Sparkles },
  { label: "AC Repair", icon: Wind },
  { label: "Welder", icon: Flame },
  { label: "Driver", icon: Car },
  { label: "Mechanic", icon: Cog },
  { label: "Gardener", icon: Trees },
  { label: "Daily wages Labour ", icon: PersonStanding },
  
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <LandingNavbar />

      {/* Hero */}
      <section className="noise-bg relative px-4 pb-20 pt-32 lg:px-8 lg:pt-44">
        <div className="absolute left-1/2 top-0 -z-10 h-160 w-275 -translate-x-1/2 rounded-full bg-linear-to-b from-primary/10 to-transparent blur-3xl" />
        <div className="absolute -right-32 top-40 -z-10 size-72 rounded-full bg-accent/10 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute -left-32 top-80 -z-10 size-72 rounded-full bg-primary/10 blur-3xl animate-[float_10s_ease-in-out_infinite]" />

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium shadow-soft"
          >
            <span className="flex size-1.5 rounded-full bg-success animate-pulse" />
            Now live across major Indian cities
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
          >
            Find Skilled Workers{" "}
            <span className="bg-linear-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              Instantly.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground"
          >
            Book trusted nearby workers in minutes — plumbers, electricians, painters, drivers,
            and more, all verified and rated.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/signup">Become a Worker</Link>
            </Button>
          </motion.div>
        </div>

        {/* Floating illustration cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            { title: "2.4k+", desc: "Verified Workers" },
            { title: "12k+", desc: "Jobs Completed" },
            { title: "4.8★", desc: "Average Rating" },
          ].map((stat, i) => (
            <Card key={stat.desc} className="animate-float p-6 text-center" style={{ animationDelay: `${i * 0.6}s` }}>
              <p className="text-3xl font-bold text-primary">{stat.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.desc}</p>
            </Card>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Built for speed and trust</h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to hire — or get hired — without the hassle.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="h-full p-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">{f.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="bg-secondary/50 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Hire across every category</h2>
            <p className="mt-3 text-muted-foreground">From quick fixes to full projects, find the right hands for the job.</p>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="flex flex-col items-center gap-2.5 p-5 text-center transition-transform hover:-translate-y-1">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <cat.icon className="size-5" />
                  </div>
                  <p className="text-sm font-medium">{cat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="how-it-works" className="px-4 py-20 lg:px-8">
        <Card className="mx-auto max-w-5xl overflow-hidden bg-linear-to-br from-primary to-emerald-700 p-10 text-center text-white sm:p-16">
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            Ready to get started with SHRAM?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-balance text-white/80">
            Join thousands of providers and workers already using SHRAM every day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </Card>
      </section>

      <LandingFooter />
    </div>
  );
}
