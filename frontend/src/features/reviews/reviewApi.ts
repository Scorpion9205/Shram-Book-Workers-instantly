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
      transformResponse: (response: ReviewResponse) =>
        response.review,
      invalidatesTags: ["Review", "Booking"],
    }),
    getWorkerRating: builder.query<{ average: number; total: number; reviews: Review[] }, string>({
      query: (workerId) => `/reviews/worker/${workerId}/rating`,
      transformResponse: (response: WorkerRatingResponse) => ({
        average: response.worker.rating,
        total: response.worker.totalReviews,
        reviews: response.worker.reviews ?? [],
      }),
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

      transformResponse: (response: {
        success: boolean;
        worker: {
          rating: number;
          totalReviews: number;
          totalJobs: number;
          reviews: Review[];
        };
      }) => ({
        average: response.worker.rating,
        total: response.worker.totalReviews,
        totalJobs: response.worker.totalJobs,
        reviews: response.worker.reviews,
      }),

      providesTags: ["Review"],
    }),

    getProviderReviews: builder.query<
      Review[],
      string
    >({
      query: (providerId) =>
        `/reviews/provider/${providerId}`,

      transformResponse: (response: {
        success: boolean;
        reviews: Review[];
      }) => response.reviews,

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