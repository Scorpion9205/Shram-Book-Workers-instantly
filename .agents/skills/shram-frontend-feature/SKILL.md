---
name: shram-frontend-feature
description: >-
  Use this skill when creating or modifying a SHRAM frontend feature module
  (feature-based architecture under src/features/). Covers the feature folder
  structure: api, hooks, components, schemas, types, services, constants, and
  the index.ts barrel. Activate when: user asks about frontend feature structure,
  adding a new feature, or organizing frontend code.
---

# SHRAM — Frontend Feature Architecture

## Feature Folder Structure

```
src/features/<feature-name>/
├── api/
│   └── xxxApi.ts          ← RTK Query endpoints
├── hooks/
│   ├── useXxx.ts          ← feature-specific custom hooks
│   └── useXxxList.ts
├── components/
│   ├── XxxForm.tsx
│   ├── XxxCard.tsx
│   └── XxxList.tsx
├── schemas/
│   └── xxx.schema.ts      ← Zod validation schemas for forms
├── types/
│   └── xxx.types.ts       ← TypeScript types and interfaces
├── constants/
│   └── xxx.constants.ts
├── utils/
│   └── xxx.utils.ts
├── services/
│   └── xxx.service.ts     ← browser-side services (not API calls)
└── index.ts               ← barrel export
```

## RTK Query API Slice (api/xxxApi.ts)

```typescript
// features/booking/api/bookingApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { CreateBookingDto, BookingResponse, FilterBookingsDto, PaginatedResponse } from '../types/booking.types.js';

export const bookingApi = createApi({
  reducerPath: 'bookingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Booking', 'BookingList'],
  endpoints: (builder) => ({
    getBookings: builder.query<PaginatedResponse<BookingResponse>, FilterBookingsDto>({
      query: (filter) => ({ url: '/bookings', params: filter }),
      providesTags: ['BookingList'],
    }),
    getBookingById: builder.query<BookingResponse, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_, __, id) => [{ type: 'Booking', id }],
    }),
    createBooking: builder.mutation<BookingResponse, CreateBookingDto>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      invalidatesTags: ['BookingList'],
    }),
    cancelBooking: builder.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/bookings/${id}/cancel`, method: 'PATCH', body: { reason } }),
      invalidatesTags: (_, __, { id }) => ['BookingList', { type: 'Booking', id }],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
} = bookingApi;
```

## Zod Schema for Forms (schemas/xxx.schema.ts)

```typescript
// features/booking/schemas/booking.schema.ts
import { z } from 'zod';

export const createBookingSchema = z.object({
  workerId: z.string().min(1, 'Worker is required'),
  skillId: z.string().min(1, 'Skill is required'),
  scheduledAt: z.string().min(1, 'Schedule time is required'),
  durationHours: z.number({ invalid_type_error: 'Enter a valid number' })
    .positive('Must be positive')
    .max(24, 'Max 24 hours'),
  address: z.object({
    placeId: z.string().min(1),
    formattedAddress: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingFormData = z.infer<typeof createBookingSchema>;
```

## Custom Hooks (hooks/useXxx.ts)

```typescript
// features/booking/hooks/useCreateBooking.ts
import { useCreateBookingMutation } from '../api/bookingApi.js';
import { useToast } from '@/hooks/useToast.js';
import { useRouter } from 'next/navigation';

export function useCreateBooking() {
  const [createBooking, { isLoading, error }] = useCreateBookingMutation();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreate = async (data: CreateBookingFormData) => {
    try {
      const booking = await createBooking(data).unwrap();
      toast({ title: 'Booking created!', variant: 'success' });
      router.push(`/provider/bookings/${booking.data.id}`);
    } catch (err: any) {
      toast({
        title: 'Failed to create booking',
        description: err.data?.message ?? 'Something went wrong',
        variant: 'error',
      });
    }
  };

  return { handleCreate, isLoading, error };
}
```

## Component Pattern

```typescript
// features/booking/components/CreateBookingForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema, type CreateBookingFormData } from '../schemas/booking.schema.js';
import { useCreateBooking } from '../hooks/useCreateBooking.js';

export function CreateBookingForm() {
  const { handleCreate, isLoading } = useCreateBooking();
  const form = useForm<CreateBookingFormData>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: { durationHours: 2 },
  });

  return (
    <form onSubmit={form.handleSubmit(handleCreate)}>
      {/* form fields */}
    </form>
  );
}
```

## Index Barrel (index.ts)

```typescript
// features/booking/index.ts
export { bookingApi, useGetBookingsQuery, useCreateBookingMutation, useCancelBookingMutation } from './api/bookingApi.js';
export { useCreateBooking } from './hooks/useCreateBooking.js';
export { CreateBookingForm } from './components/CreateBookingForm.js';
export { BookingCard } from './components/BookingCard.js';
export { createBookingSchema } from './schemas/booking.schema.js';
export type { CreateBookingFormData, BookingResponse } from './types/booking.types.js';
```

## Feature List (src/features/)

```
auth/       — login, register, OTP, tokens
booking/    — create, list, detail, cancel
worker/     — profile, skills, availability, location
provider/   — profile, job posting
agent/      — managed bookings, worker assignment
admin/      — user management, settings, analytics
payment/    — order creation, status, Razorpay integration
wallet/     — balance, transactions, withdrawal
review/     — submit, view reviews
notification/ — notification list, mark read
chat/       — thread list, messages
settings/   — profile settings, notifications preferences
analytics/  — dashboard stats (Admin)
```
