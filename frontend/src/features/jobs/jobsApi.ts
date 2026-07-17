import { apiSlice } from "@/services/api/apiSlice";
import type { Job, JobApplication, PaginatedResponse } from "@/types";

export interface CreateJobPayload {
  title: string;
  description: string;
  skillId: string;
  address: string;
  salary: number;
  workersRequired: number;
  latitude?: number;
  longitude?: number;
}

interface JobResponse {
  success: boolean;
  job: Job;
}

interface ApplyJobPayload {
  jobId: string;
  bidAmount: number;
  workerCount?: number;
  message?: string;
}
interface JobsResponse {
  success: boolean;
  jobs: Job[];
}

interface ApplicationsResponse {
  success: boolean;
  applications: JobApplication[];
}

const toPaginatedJobs = (jobs: Job[]): PaginatedResponse<Job> => ({
  items: jobs,
  total: jobs.length,
  page: 1,
  pageSize: jobs.length,
  hasMore: false,
});

export interface JobFilters {
  search?: string;
  category?: string;
  minSalary?: number;
  maxSalary?: number;
  date?: string;
  sort?: "nearest" | "highest_rated" | "highest_salary" | "latest";
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: JobFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const jobsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createJob: builder.mutation<Job, CreateJobPayload>({
      query: (body) => ({
        url: "/jobs/create-job",
        method: "POST",
        body: {
          title: body.title,
          description: body.description,
          skillId: body.skillId,
          requiredWorkers: body.workersRequired,
          budget: body.salary,
          latitude: body.latitude,
          longitude: body.longitude,
          address: body.address,
        },
      }),
      transformResponse: (response: JobResponse) => response.job,
      invalidatesTags: ["MyJobs", "Job", "DashboardProvider"],
    }),
    getJobs: builder.query<PaginatedResponse<Job>, JobFilters | void>({
      query: (filters) => `/jobs${buildQuery(filters || {})}`,
      // transformResponse: (response: any) => {


      transformResponse: (response: JobsResponse) =>
        toPaginatedJobs(response.jobs),
      

      providesTags: (result) => {
        console.log("PROVIDES TAGS RESULT", result);

        const items = Array.isArray(result?.items) ? result.items : [];

        return [
          ...items.map((j) => ({
            type: "Job" as const,
            id: j.id,
          })),
          { type: "Job" as const, id: "LIST" },
        ];
      },

      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (currentCache, newItems, { arg }) => {
        const filters = (arg || {}) as JobFilters;
        if (!filters.page || filters.page <= 1) {
          return newItems;
        }
        return {
          ...newItems,
          items: [...currentCache.items, ...newItems.items],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        JSON.stringify(currentArg) !== JSON.stringify(previousArg),
    }),
    getMyPostedJobs: builder.query<PaginatedResponse<Job>, { page?: number } | void>({
      query: (params) => `/jobs/provider/my-jobs${buildQuery(params || {})}`,
      transformResponse: (response: JobsResponse) =>
        toPaginatedJobs(response.jobs),
      providesTags: ["MyJobs"],
    }),


    getJobById: builder.query<Job, string>({
      query: (jobId) => `/jobs/${jobId}`,
      transformResponse: (response: JobResponse) => response.job,
      providesTags: (result, error, jobId) => [{ type: "Job", id: jobId }],
    }),


    applyToJob: builder.mutation<JobApplication, ApplyJobPayload>({
      query: ({ jobId, ...body }) => ({
        url: `/jobs/${jobId}/apply`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { jobId }) => [
        { type: "Job", id: jobId },
        "MyApplications",
      ],
    }),
    getJobApplications: builder.query<JobApplication[], string>({
      query: (jobId) => `/jobs/${jobId}/applications`,
      transformResponse: (response: ApplicationsResponse) =>
        response.applications,
      providesTags: ["JobApplications"],
    }),
    acceptApplication: builder.mutation<JobApplication, string>({
      query: (applicationId) => ({
        url: `/jobs/applications/${applicationId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["JobApplications", "MyJobs", "Booking", "DashboardProvider"],
    }),
    getMyApplications: builder.query<JobApplication[], void>({
      query: () => "/jobs/my-applications",
      transformResponse: (response: ApplicationsResponse) =>
        response.applications,
      providesTags: ["MyApplications"],
    }),
  }),
});

export const {
  useCreateJobMutation,
  useGetJobsQuery,
  useLazyGetJobsQuery,
  useGetMyPostedJobsQuery,
  useGetJobByIdQuery,
  useApplyToJobMutation,
  useGetJobApplicationsQuery,
  useAcceptApplicationMutation,
  useGetMyApplicationsQuery,
} = jobsApi;
