import { apiSlice } from "@/services/api/apiSlice";
import type { Skill, WorkerProfile } from "@/types";

type WorkerApiProfile = Omit<WorkerProfile, "skills" | "experienceYears" | "completedJobs"> & {
  experience?: number;
  experienceYears?: number;
  totalJobs?: number;
  completedJobs?: number;
  skills?: Skill[];
};

interface WorkerProfileResponse {
  success: boolean;
  worker?: WorkerApiProfile;
  profile?: WorkerApiProfile;
}

const normalizeWorkerProfile = (
  worker: WorkerApiProfile
): WorkerProfile => ({
  ...worker,
  experienceYears:
    worker.experienceYears ??
    worker.experience ??
    0,
  completedJobs:
    worker.completedJobs ??
    worker.totalJobs ??
    0,
  skills: worker.skills ?? [],
  
});

export const workerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createWorkerProfile: builder.mutation<WorkerProfile, Partial<WorkerProfile>>({
      query: (body) => ({ url: "/workers/profile", method: "POST", body }),
      transformResponse: (response: WorkerProfileResponse) =>
        normalizeWorkerProfile(response.profile!),
      invalidatesTags: ["WorkerProfile"],
    }),
    getMyWorkerProfile: builder.query<WorkerProfile, void>({
      query: () => "/workers/me",
      transformResponse: (response: WorkerProfileResponse) =>
        normalizeWorkerProfile(response.worker!),
      providesTags: ["WorkerProfile"],
    }),
    updateMyWorkerProfile: builder.mutation<WorkerProfile, Partial<WorkerProfile>>({
      query: (body) => ({ url: "/workers/me", method: "PATCH", body }),
      transformResponse: (response: WorkerProfileResponse) =>
        normalizeWorkerProfile(response.worker!),
      invalidatesTags: ["WorkerProfile"],
    }),
    updateAvailability: builder.mutation<{ isAvailable: boolean }, { isAvailable: boolean }>({
      query: (body) => ({ url: "/workers/availability", method: "PATCH", body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          workerApi.util.updateQueryData("getMyWorkerProfile", undefined, (draft) => {
            draft.isAvailable = arg.isAvailable;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["WorkerProfile", "DashboardWorker"],
    }),
  }),
});

export const {
  useCreateWorkerProfileMutation,
  useGetMyWorkerProfileQuery,
  useUpdateMyWorkerProfileMutation,
  useUpdateAvailabilityMutation,
} = workerApi;
