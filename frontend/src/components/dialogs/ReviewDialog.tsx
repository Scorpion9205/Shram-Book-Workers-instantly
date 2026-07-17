"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateReviewMutation } from "@/features/reviews/reviewApi";
import { cn } from "@/lib/utils";
import { error } from "console";

export function ReviewDialog({
  bookingId,
  open,
  onOpenChange,
}: {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [createReview, { isLoading }] = useCreateReviewMutation();

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    try {
      await createReview({ bookingId, rating, comment }).unwrap();
      toast.success("Thanks for your review!");
      onOpenChange(false);
    } catch (err){
      console.log(err)
      toast.error("Couldn't submit review. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>How was your experience with this booking?</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "size-8 transition-colors",
                  (hovered || rating) >= star ? "fill-accent text-accent" : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          placeholder="Share details about your experience (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isLoading}>
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
