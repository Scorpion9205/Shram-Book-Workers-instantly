"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, IndianRupee, Users, FileText, CheckCircle2, Clock, Star, Award } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchingNearbyAnimation } from "@/components/loaders/SearchingNearbyAnimation";
import { instantHireSchema, type InstantHireFormValues } from "@/lib/utils/job-validation";
import { useCreateInstantRequestMutation, useCalculateFareMutation } from "@/features/instantRequests/instantRequestApi";
import { useGetSkillsQuery } from "@/features/skills/skillsApi";
import { useSocket } from "@/providers/SocketProvider";

type FlowStep = "form" | "searching" | "bidding" | "sent" | "no-worker" | "no-bids";

interface BidInfo {
  bidId: string;
  instantRequestId: string;
  bidAmount: number;
  workerName: string;
  rating: number;
  experience: number;
  totalJobs: number;
}

export default function InstantHirePage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("form");
  const [bookingMode, setBookingMode] = useState<"DIRECT" | "BIDDING">("DIRECT");
  const [quoteId, setQuoteId] = useState<string>("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [subtotal, setSubtotal] = useState<number | null>(null);
  const [platformFee, setPlatformFee] = useState<number | null>(null);

  // Bidding states
  const [bids, setBids] = useState<BidInfo[]>([]);
  const [sortBy, setSortBy] = useState<"recommended" | "price" | "rating">("recommended");
  const [biddingTimeLeft, setBiddingTimeLeft] = useState<number>(60);
  const [requestId, setRequestId] = useState<string>("");

  const [createInstantRequest] = useCreateInstantRequestMutation();
  const [calculateFare] = useCalculateFareMutation();
  const { data: skills = [] } = useGetSkillsQuery();
  const { socket } = useSocket();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InstantHireFormValues>({
    resolver: zodResolver(instantHireSchema) as never,
    defaultValues: { workersNeeded: 1, address: "Noida Sector 62, Uttar Pradesh" },
  });

  const watchWorkerType = watch("workerType");
  const watchWorkersNeeded = watch("workersNeeded");

  // Trigger fare calculation when skill or worker count changes
  useEffect(() => {
    if (!watchWorkerType) return;

    calculateFare({
      workerType: watchWorkerType,
      workersNeeded: watchWorkersNeeded,
      lat: 28.628848,
      lng: 77.488723,
    })
      .unwrap()
      .then((res) => {
        setEstimatedPrice(res.estimatedFare);
        setSubtotal(res.subtotal);
        setPlatformFee(res.platformFee);
        setQuoteId(res.quoteId);
      })
      .catch((err) => {
        console.error("Fare calculation error:", err);
      });
  }, [watchWorkerType, watchWorkersNeeded, calculateFare]);

  // Socket and countdown subscriptions
  useEffect(() => {
    if (!socket || !requestId) return;

    if (bookingMode === "DIRECT") {
      socket.on("bookingUpdated", (data: { id: string; status: string }) => {
        if (data.status === "accepted") {
          toast.success("Worker accepted! Redirecting to booking...");
          router.push(`/provider/booking/${data.id}`);
        }
      });

      socket.on("instant-request:no-worker", () => {
        setStep("no-worker");
      });
    } else {
      socket.on("instant-bidding:bid-submitted", (bid: BidInfo) => {
        setBids((prev) => {
          const filtered = prev.filter((b) => b.bidId !== bid.bidId);
          return [...filtered, bid];
        });
      });

      socket.on("instant-bidding:closed", () => {
        setStep("sent");
      });

      socket.on("instant-bidding:no-bids", () => {
        setStep("no-bids");
      });
    }

    return () => {
      socket.off("instant-request:matched");
      socket.off("instant-request:no-worker");
      socket.off("instant-bidding:bid-submitted");
      socket.off("instant-bidding:closed");
      socket.off("instant-bidding:no-bids");
    };
  }, [socket, requestId, bookingMode]);

  // Bidding countdown timer
  useEffect(() => {
    if (step !== "bidding" || biddingTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setBiddingTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, biddingTimeLeft]);

  console.log("Form Validation Errors:", errors);

  async function onSubmit(values: InstantHireFormValues) {
    console.log("Submitting values:", values);
    if (!quoteId || estimatedPrice === null) {
      toast.error("Estimated quote is missing. Please retry selecting parameters.");
      return;
    }

    try {
      if (bookingMode === "DIRECT") {
        setStep("searching");
      } else {
        setStep("bidding");
        setBids([]);
        setBiddingTimeLeft(60);
      }

      const reqRes = await createInstantRequest({
        workerType: values.workerType,
        address: values.address,
        amount: estimatedPrice,
        notes: values.notes,
        workersNeeded: values.workersNeeded,
        lat: 28.628848,
        lng: 77.488723,
        bookingMode,
        quoteId,
      }).unwrap();

      setRequestId(reqRes.id);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to submit instant request. Please check inputs.";
      toast.error(message);
      setStep("form");
    }
  }

  async function handleSelectBid(bidId: string) {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/v1/instant-requests/${requestId}/bids/${bidId}/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Worker bid selected successfully!");
        setStep("sent");
      } else {
        toast.error(data.message || "Failed to select bid.");
      }
    } catch (err) {
      toast.error("Network error selecting bid.");
    }
  }

  // Bids sorting helper
  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === "price") return a.bidAmount - b.bidAmount;
    if (sortBy === "rating") return b.rating - a.rating;
    return b.experience - a.experience; // Default: experience recommended
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Zap className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Instant Request</h1>
          <p className="text-sm text-muted-foreground">Hire verified workers near you instantly</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Hiring Requirements</CardTitle>
                <CardDescription>Select category, location, and preferred booking mode.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Worker Skill Needed</Label>
                    <Controller
                      name="workerType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select skill category" />
                          </SelectTrigger>
                          <SelectContent>
                            {skills.map((skill) => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.workerType && <p className="text-xs text-destructive">{errors.workerType.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">Work Address</Label>
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="Type your address"
                    />
                    {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="workersNeeded">Required Worker Count</Label>
                    <Input id="workersNeeded" type="number" {...register("workersNeeded", { valueAsNumber: true })} />
                    {errors.workersNeeded && <p className="text-xs text-destructive">{errors.workersNeeded.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Special Instructions (Optional)</Label>
                    <textarea
                      id="notes"
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...register("notes")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Booking Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingMode("DIRECT")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                          bookingMode === "DIRECT"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Zap className="size-5 mb-1" />
                        <span className="text-sm font-semibold">Direct Match</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMode("BIDDING")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                          bookingMode === "BIDDING"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <IndianRupee className="size-5 mb-1" />
                        <span className="text-sm font-semibold">With Bidding</span>
                      </button>
                    </div>
                  </div>

                  {estimatedPrice !== null && (
                    <div className="p-3 bg-muted rounded-lg space-y-2 border">
                      <div className="flex justify-between text-sm">
                        <span>Base Charge:</span>
                        <span>₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Platform & Instant Fees:</span>
                        <span>₹{platformFee}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                        <span>Authoritative Total:</span>
                        <span>₹{estimatedPrice}</span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold">
                    Request Worker
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-10">
            <Card className="w-full max-w-lg text-center p-6 space-y-4">
              <CardHeader>
                <CardTitle>Finding workers near you...</CardTitle>
                <CardDescription>Broadcasting request to nearby available workers.</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchingNearbyAnimation />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "bidding" && (
          <motion.div key="bidding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Nearby Live Bids</CardTitle>
                  <CardDescription>Workers are placing bids below or at your requested amount.</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-semibold">
                  <Clock className="size-4" /> {biddingTimeLeft}s
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm font-medium text-muted-foreground">Sort Bids By:</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant={sortBy === "recommended" ? "default" : "outline"} onClick={() => setSortBy("recommended")}>
                      Recommended
                    </Button>
                    <Button size="sm" variant={sortBy === "price" ? "default" : "outline"} onClick={() => setSortBy("price")}>
                      Lowest Price
                    </Button>
                    <Button size="sm" variant={sortBy === "rating" ? "default" : "outline"} onClick={() => setSortBy("rating")}>
                      Rating
                    </Button>
                  </div>
                </div>

                {sortedBids.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Waiting for workers to place bids...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedBids.map((bid) => (
                      <div key={bid.bidId} className="p-4 bg-muted border rounded-xl flex items-center justify-between hover:shadow-md transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{bid.workerName}</span>
                            <span className="flex items-center gap-0.5 text-yellow-500 text-xs font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
                              <Star className="size-3 fill-yellow-500" /> {bid.rating.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Award className="size-3" /> {bid.experience} Yrs Exp</span>
                            <span>• {bid.totalJobs} Jobs Completed</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground line-through">₹{estimatedPrice}</span>
                            <div className="text-lg font-extrabold text-foreground">₹{bid.bidAmount}</div>
                          </div>
                          <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold" onClick={() => handleSelectBid(bid.bidId)}>
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bidding Summary</CardTitle>
                <CardDescription>Details of the active request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Estimated Charge:</span>
                  <span className="font-semibold text-foreground">₹{estimatedPrice}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Bidding Range:</span>
                  <span className="font-semibold text-foreground">₹{estimatedPrice ? Math.round(estimatedPrice * 0.8) : 0} - ₹{estimatedPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Discount:</span>
                  <span className="font-semibold text-success">20% Off</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "sent" && (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-10">
            <Card className="w-full max-w-md text-center p-6 space-y-4">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
                  <CheckCircle2 className="size-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Booking Confirmed!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your request was matched successfully. The worker is on their way!
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep("form")} className="w-full">
                  Request Another Worker
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "no-worker" && (
          <motion.div key="no-worker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-10">
            <Card className="w-full max-w-md text-center p-6 space-y-4">
              <CardContent className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">No Worker Found</h3>
                <p className="text-sm text-muted-foreground">
                  No workers accepted the request within the matching radius stages.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setStep("form")}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "no-bids" && (
          <motion.div key="no-bids" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-10">
            <Card className="w-full max-w-md text-center p-6 space-y-4">
              <CardContent className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">No Bids Placed</h3>
                <p className="text-sm text-muted-foreground">
                  No workers placed a bid within the bidding duration window.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setStep("form")}>Try Bidding Again</Button>
                  <Button variant="outline" onClick={() => { setBookingMode("DIRECT"); setStep("form"); }}>Book Instantly</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
