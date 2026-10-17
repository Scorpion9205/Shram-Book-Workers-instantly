import { apiSlice } from "@/services/api/apiSlice";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface PriceRange {
  min: number;
  max: number;
}

// The prices a skill allows: what a provider may set as the budget, and what a worker may bid.
export interface PriceLimits {
  skillName: string;
  baseRate: number;
  budget: PriceRange;
  bid: PriceRange;
}

export const pricingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPriceLimits: builder.query<PriceLimits, { skillId: string; budget?: number }>({
      query: (params) => ({ url: "/pricing/limits", params }),
      transformResponse: (r: Envelope<PriceLimits>) => r.data,
    }),
    // What the provider pays in total for a work charge. Only the total comes back.
    getPriceQuote: builder.query<{ total: number }, { amount: number; agentManaged?: boolean }>({
      query: ({ amount, agentManaged }) => ({
        url: "/pricing/quote",
        params: { amount, ...(agentManaged !== undefined && { agentManaged: String(agentManaged) }) },
      }),
      transformResponse: (r: Envelope<{ total: number }>) => r.data,
    }),
  }),
});

export const { useGetPriceLimitsQuery, useGetPriceQuoteQuery } = pricingApi;
