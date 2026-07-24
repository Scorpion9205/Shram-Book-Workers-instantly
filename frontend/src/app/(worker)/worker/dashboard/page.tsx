"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  CheckCircle2,
  Star,
  Clock,
  MapPin,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/cards/StatCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { StatGridSkeleton, ListSkeleton } from "@/components/loaders/Skeletons";
import { useAppSelector } from "@/hooks/redux";
import { useGetWorkerDashboardQuery } from "@/features/dashboard/dashboardApi";
import {
  useGetMyWorkerProfileQuery,
  useUpdateAvailabilityMutation,
} from "@/features/worker/workerApi";
import {
  useGetNearbyInstantRequestsQuery,
  useAcceptInstantRequestItemMutation,
  type NearbyInstantRequest,
} from "@/features/instantRequests/instantRequestApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WorkerDashboardPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const { data: dashboard, isLoading, isError, refetch } = useGetWorkerDashboardQuery();
  const { data: profile } = useGetMyWorkerProfileQuery();
  const [updateAvailability, { isLoading: isToggling }] = useUpdateAvailabilityMutation();

  
  const {
    data: nearbyRequests,
    isLoading: isNearbyLoading,
  } = useGetNearbyInstantRequestsQuery(undefined, {
    skip: !profile?.isAvailable,
    pollingInterval: 15000,
  });
  const [acceptItem, { isLoading: isAccepting }] = useAcceptInstantRequestItemMutation();

  async function handleAcceptNearby(itemId: string) {
    try {
      const result = await acceptItem(itemId).unwrap();
      toast.success("Request accepted!");
      router.push(`/worker/booking/${result.bookingId}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Couldn't accept this request — it may already be filled.");
    }
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  async function handleToggleAvailability(checked: boolean) {
    try {
      await updateAvailability({ isAvailable: checked }).unwrap();
      toast.success(checked ? "You're now online and visible to providers" : "You're now offline");
    } catch {
      toast.error("Couldn't update availability — please try again");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Avatar className="size-12 ring-2 ring-primary/20">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback className="text-base">{user?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-xl font-bold tracking-tight">{user?.name?.split(" ")[0] || "Worker"}</h1>
          </div>
        </div>

        <Card className="flex items-center gap-3 px-4 py-3">
          <div
            className={`size-2.5 rounded-full ${profile?.isAvailable ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`}
          />
          <span className="text-sm font-medium">
            {profile?.isAvailable ? "Online — Receiving Requests" : "Offline"}
          </span>
          <Switch
            checked={Boolean(profile?.isAvailable)}
            onCheckedChange={handleToggleAvailability}
            disabled={isToggling}
          />
        </Card>
      </motion.div>

      {/* Stats */}
      {isLoading ? (
        <StatGridSkeleton />
      ) : isError ? (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Couldn't load your dashboard.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Today's Earnings"
            value={`₹${dashboard?.todaysEarnings ?? 0}`}
            icon={Wallet}
            accent="accent"
            delay={0}
          />
          <StatCard
            label="Completed Jobs"
            value={dashboard?.completedJobs ?? 0}
            icon={CheckCircle2}
            accent="success"
            delay={0.05}
          />
          <StatCard
            label="Rating"
            value={(dashboard?.rating ?? 0).toFixed(1)}
            suffix="/ 5"
            icon={Star}
            accent="primary"
            delay={0.1}
          />
          <StatCard
            label="Pending Requests"
            value={dashboard?.pendingRequests ?? 0}
            icon={Clock}
            accent="destructive"
            delay={0.15}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Booking */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Booking</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton count={1} />
            ) : dashboard?.currentBooking ? (
              <div className="flex items-center gap-4 rounded-2xl border border-border p-4">
                <Avatar className="size-12">
                  <AvatarImage src={dashboard.currentBooking.provider?.profileImage} />
                  <AvatarFallback>{dashboard.currentBooking.provider?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{dashboard.currentBooking.provider?.name}</p>
                  <Badge variant="default" className="mt-1 capitalize">
                    {dashboard.currentBooking.status}
                  </Badge>
                </div>
                <Button asChild size="sm">
                  <Link href={`/worker/booking/${dashboard.currentBooking.id}`}>
                    View <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No active booking"
                description="Go online to start receiving instant requests, or apply to jobs in the feed."
              />
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s.id} variant="outline">
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No skills added"
                description="Add skills so providers can find you faster."
                actionLabel="Add Skills"
                onAction={() => (window.location.href = "/worker/profile")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nearby Instant Requests (REST fallback alongside the live socket popup) */}
      {profile?.isAvailable && (
        <Card>
          <CardHeader>
            <CardTitle>Instant Requests Near You</CardTitle>
          </CardHeader>
          <CardContent>
            {isNearbyLoading ? (
              <ListSkeleton count={2} />
            ) : nearbyRequests?.length ? (
              <div className="space-y-3">
                {nearbyRequests.map((req: NearbyInstantRequest) =>
                  req.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.skill.name} · {req.title}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {req.address || "Location shared on accept"} ·{" "}
                          {req.distanceKm.toFixed(1)} km away
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.acceptedWorkers}/{item.requiredWorkers} workers accepted
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-primary">₹{req.amount}</span>
                        <Button
                          size="sm"
                          disabled={isAccepting || item.acceptedWorkers >= item.requiredWorkers}
                          onClick={() => handleAcceptNearby(item.id)}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No instant requests right now"
                description="You'll be notified here and via popup when a nearby provider needs your skill."
              />
            )}
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton count={2} />
            ) : dashboard?.upcomingJobs?.length ? (
              <div className="space-y-3">
                {dashboard.upcomingJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/worker/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-secondary"
                  >
                    <div>
                      <p className="text-sm font-medium">{job.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {job.address}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">₹{job.budget}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No upcoming jobs" description="Your accepted jobs will show up here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListSkeleton count={2} />
            ) : dashboard?.recentReviews?.length ? (
              <div className="space-y-3">
                {dashboard.recentReviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.provider?.name || "Anonymous"}</p>
                      <div className="flex items-center gap-0.5 text-accent">
                        <Star className="size-3.5 fill-current" />
                        <span className="text-xs font-semibold">{r.rating}</span>
                      </div>
                    </div>
                    {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Star} title="No reviews yet" description="Complete jobs to start getting reviews." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
