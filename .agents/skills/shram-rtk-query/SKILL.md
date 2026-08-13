---
name: shram-rtk-query
description: >-
  Use this skill when working with RTK Query in the SHRAM frontend: setting up
  the baseApi, creating endpoint definitions, cache tag patterns, optimistic
  updates, error handling, and wiring APIs into the Redux store. Activate when:
  user asks about RTK Query, API slice setup, cache invalidation, or making
  API calls in the frontend.
---

# SHRAM — RTK Query Setup & Patterns

## Base API (store/api/baseApi.ts)

```typescript
// store/api/baseApi.ts
import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index.js';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Re-auth on 401 — auto-refresh access token
const baseQueryWithReAuth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Try to refresh
    const refreshResult = await rawBaseQuery('/auth/token/refresh', api, extraOptions);
    if (refreshResult.data) {
      const data = refreshResult.data as { data: { accessToken: string } };
      api.dispatch(setAccessToken(data.data.accessToken));
      // Retry original request
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReAuth,
  tagTypes: [
    'Auth', 'User', 'Worker', 'Provider', 'Agent',
    'Booking', 'BookingList',
    'Job', 'JobList',
    'InstantRequest',
    'Skill', 'Category',
    'Review', 'ReviewList',
    'Notification', 'NotificationList',
    'Chat', 'Message',
    'Payment',
    'Analytics',
    'Settings',
  ],
  endpoints: () => ({}),
});
```

## Endpoint Injection Pattern (per feature)

```typescript
// features/booking/api/bookingApi.ts
import { baseApi } from '@/store/api/baseApi.js';
import type { BookingResponse, CreateBookingDto, FilterBookingsDto } from '../types/booking.types.js';

export const bookingApiSlice = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List with pagination
    getBookings: builder.query<PaginatedResponse<BookingResponse>, FilterBookingsDto>({
      query: (params) => ({ url: '/bookings', params }),
      providesTags: (result) =>
        result
          ? [...result.data.map(b => ({ type: 'Booking' as const, id: b.id })), 'BookingList']
          : ['BookingList'],
    }),

    // Single item
    getBookingById: builder.query<ApiResponse<BookingResponse>, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_, __, id) => [{ type: 'Booking', id }],
    }),

    // Create
    createBooking: builder.mutation<ApiResponse<BookingResponse>, CreateBookingDto>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      invalidatesTags: ['BookingList'],
    }),

    // Cancel
    cancelBooking: builder.mutation<ApiResponse<void>, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/bookings/${id}/cancel`, method: 'PATCH', body }),
      // Optimistic update
      onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          bookingApiSlice.util.updateQueryData('getBookingById', id, (draft) => {
            draft.data.status = 'CANCELLED_BY_PROVIDER';
          })
        );
        queryFulfilled.catch(patch.undo);
      },
      invalidatesTags: (_, __, { id }) => ['BookingList', { type: 'Booking', id }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
} = bookingApiSlice;
```

## Redux Store Setup (store/index.ts)

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi.js';
import authReducer from './slices/authSlice.js';
import uiReducer from './slices/uiSlice.js';
import chatReducer from './slices/chatSlice.js';
import notificationReducer from './slices/notificationSlice.js';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    ui: uiReducer,
    chat: chatReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Cache Tag Invalidation Strategy

| When | Invalidate Tags |
|---|---|
| Booking created | `['BookingList']` |
| Booking cancelled | `['BookingList', { type: 'Booking', id }]` |
| Profile updated | `[{ type: 'User', id }]` |
| Skill added to worker | `[{ type: 'Worker', id }]` |
| Review submitted | `['ReviewList', { type: 'Booking', id }]` |
| Admin updates setting | `['Settings']` |

## Type Helpers

```typescript
// lib/types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  status: number;
  data: {
    success: false;
    message: string;
    errorCode: string;
    errors?: { field: string; message: string }[];
  };
}
```

## Error Handling in Components

```typescript
const [createBooking, { isLoading, error }] = useCreateBookingMutation();

// Type-safe error access
const apiError = error as ApiError | undefined;
const errorMessage = apiError?.data?.message ?? 'Something went wrong';
const fieldErrors = apiError?.data?.errors ?? [];
```
