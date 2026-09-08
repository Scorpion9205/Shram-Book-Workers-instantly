import { apiSlice } from "@/services/api/apiSlice";
import type { Review } from "@/types";

interface ReviewResponse {
  success: boolean;
  review: Review;
}

interface WorkerRatingResponse {
  success: boolean;
  worker: {
    rating: number;
    totalReviews: number;
    reviews?: Review[];
  };
}

export const reviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createReview: builder.mutation<Review, { bookingId: string; rating: number; comment?: string }>({
      query: ({ bookingId, ...body }) => ({
        url: `/reviews/${bookingId}`,
        method: "POST",
        body,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.review || data;
      },
      invalidatesTags: ["Review", "Booking"],
    }),
    getWorkerRating: builder.query<{ average: number; total: number; reviews: Review[] }, string>({
      query: (workerId) => `/reviews/worker/${workerId}/rating`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        const worker = data.worker || data;
        return {
          average: worker.rating || 0,
          total: worker.totalReviews || 0,
          reviews: worker.reviews ?? [],
        };
      },
      providesTags: ["Review"],
    }),

    getWorkerReviews: builder.query<
      {
        average: number;
        total: number;
        totalJobs: number;
        reviews: Review[];
      },
      string
    >({
      query: (workerId) => `/reviews/worker/${workerId}`,

      transformResponse: (response: any) => {
        const data = response.data || response;
        const worker = data.worker || data;
        return {
          average: worker.rating || 0,
          total: worker.totalReviews || 0,
          totalJobs: worker.totalJobs || 0,
          reviews: worker.reviews ?? [],
        };
      },

      providesTags: ["Review"],
    }),

    getProviderReviews: builder.query<
      Review[],
      string
    >({
      query: (providerId) =>
        `/reviews/provider/${providerId}`,

      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.reviews || data;
      },

      providesTags: ["Review"],
    }),
  }),
});



export const {
  useCreateReviewMutation,
  useGetWorkerRatingQuery,
  useGetWorkerReviewsQuery,
  useGetProviderReviewsQuery,
} = reviewApi;