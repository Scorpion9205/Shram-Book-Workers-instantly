"use client";

import { useState } from "react";
import { Search, ShieldAlert, CheckCircle2, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useGetBookingsQuery, useAssignWorkerMutation } from "@/features/admin/adminApi";
import { cn } from "@/lib/utils";

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [workerIdInput, setWorkerIdInput] = useState("");

  const { data, isLoading, refetch } = useGetBookingsQuery({
    page,
    limit: 10,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const [assignWorker, { isLoading: isAssigning }] = useAssignWorkerMutation();

  const bookings = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  async function handleAssignWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBookingId || !workerIdInput) {
      toast.error("Please enter a valid worker ID.");
      return;
    }

    try {
      const res = await assignWorker({ id: selectedBookingId, workerId: workerIdInput }).unwrap();
      toast.success(res.message || "Worker successfully assigned to booking.");
      setSelectedBookingId(null);
      setWorkerIdInput("");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign worker.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Bookings</h1>
        <p className="text-muted-foreground">Monitor all normal jobs and instant request matching logs.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter system bookings by booking ID or transition status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                placeholder="Search by Booking ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="WORKER_ASSIGNED">Worker Assigned</option>
              <option value="WORKER_EN_ROUTE">Worker En Route</option>
              <option value="WORK_STARTED">Work Started</option>
              <option value="WORK_COMPLETED">Work Completed</option>
              <option value="PAYMENT_SETTLED">Payment Settled</option>
              <option value="CANCELLED_BY_PROVIDER">Cancelled By Provider</option>
              <option value="CANCELLED_BY_WORKER">Cancelled By Worker</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-semibold text-foreground">
                <th className="p-4">Booking ID</th>
                <th className="p-4">Provider ID</th>
                <th className="p-4">Worker ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Booking Type</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    Loading bookings logs...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    No bookings found matching criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono text-xs text-foreground">{booking.id}</td>
                    <td className="p-4 text-xs font-mono">{booking.provider?.id || "-"}</td>
                    <td className="p-4 text-xs font-mono">{booking.worker?.id || <span className="text-amber-500 font-semibold">Unassigned</span>}</td>
                    <td className="p-4">₹{Number(booking.amount).toFixed(2)}</td>
                    <td className="p-4 uppercase text-xs">{booking.job ? "NORMAL" : "INSTANT"}</td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                          booking.status.startsWith("CANCELLED")
                            ? "bg-destructive/10 text-destructive"
                            : booking.status === "PAYMENT_SETTLED" || booking.status === "WORK_COMPLETED"
                              ? "bg-success/10 text-success"
                              : "bg-blue-500/10 text-blue-500"
                        )}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!booking.worker?.id && !booking.status.startsWith("CANCELLED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBookingId(booking.id)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <UserPlus className="size-3.5" /> Assign Worker
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Manual Assignment Modal Dialog */}
      {selectedBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="text-primary size-5" /> Manual Assignment
              </CardTitle>
              <CardDescription>
                Assign a specific worker by entering their unique UUID.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAssignWorker}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Booking ID</Label>
                  <Input value={selectedBookingId} readOnly className="bg-muted font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workerId">Worker ID (UUID)</Label>
                  <Input
                    id="workerId"
                    value={workerIdInput}
                    onChange={(e) => setWorkerIdInput(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    required
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 p-6 border-t bg-muted/40 rounded-b-xl">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedBookingId(null);
                    setWorkerIdInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isAssigning}>
                  Assign Worker
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
