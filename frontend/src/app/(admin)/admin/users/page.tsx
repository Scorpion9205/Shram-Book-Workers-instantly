"use client";

import { useState } from "react";
import { Search, ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useGetUsersQuery, useSuspendUserMutation, useVerifyWorkerMutation } from "@/features/admin/adminApi";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data, isLoading, refetch } = useGetUsersQuery({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter || undefined,
  });

  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [verifyWorker, { isLoading: isVerifying }] = useVerifyWorkerMutation();

  const users = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: 10, totalCount: 0, totalPages: 1 };

  async function handleToggleSuspend(userId: string, currentActive: boolean) {
    try {
      const res = await suspendUser({ id: userId, isActive: !currentActive }).unwrap();
      toast.success(res.message || `User status updated successfully.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update user status.");
    }
  }

  async function handleToggleVerify(workerId: string, currentVerified: boolean) {
    try {
      const res = await verifyWorker({ id: workerId, isVerified: !currentVerified }).unwrap();
      toast.success(res.message || `Worker verification updated.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to verify worker profile.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users Directory</h1>
        <p className="text-muted-foreground">Approve worker profiles, suspend accounts, and filter directory listings.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Directory Search</CardTitle>
          <CardDescription>Filter registered accounts by role, name, phone, or email.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                placeholder="Search by name, phone or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-hidden"
            >
              <option value="">All Roles</option>
              <option value="worker">Worker</option>
              <option value="provider">Provider</option>
              <option value="agent">Agent</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-semibold text-foreground">
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Verified</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-medium text-foreground">{user.name}</td>
                    <td className="p-4">{user.phone}</td>
                    <td className="p-4">{user.email || "-"}</td>
                    <td className="p-4 uppercase text-xs font-semibold">{user.role}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          user.isActive
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <CheckCircle2 className="size-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="size-3" /> Suspended
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {user.role === "worker" ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                            user.isVerified
                              ? "bg-success/10 text-success"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {user.isVerified ? (
                            <>
                              <CheckCircle2 className="size-3" /> Verified
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="size-3" /> Pending
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {user.role === "worker" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleVerify(user.id, !!user.isVerified)}
                          disabled={isVerifying}
                        >
                          {user.isVerified ? "Revoke Verification" : "Verify Profile"}
                        </Button>
                      )}
                      <Button
                        variant={user.isActive ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleSuspend(user.id, !!user.isActive)}
                        disabled={isSuspending}
                      >
                        {user.isActive ? "Suspend" : "Activate"}
                      </Button>
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
    </div>
  );
}
