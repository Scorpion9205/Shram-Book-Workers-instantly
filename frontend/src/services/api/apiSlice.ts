import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "WorkerProfile",
    "ProviderProfile",
    "AgentProfile",
    "AgentDashboard",
    "AgentApplication",
    "AgentBooking",
    "DashboardWorker",
    "DashboardProvider",
    "Skill",
    "WorkerSkill",
    "Job",
    "MyJobs",
    "JobApplications",
    "MyApplications",
    "Booking",
    "InstantRequest",
    "Review",
    "Location",
    "Notification",
  ],
  endpoints: () => ({}),
});
