import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstantRequest } from "@/types";

interface IncomingInstantRequest {
  itemId: string;
  request: InstantRequest;
  receivedAt: number;
}

export interface IncomingBiddingRequest {
  requestId: string;
  title: string;
  providerName: string;
  workerType: string;
  address?: string | null;
  notes?: string | null;
  amount: number;
  // What a bid may be, worked out by the server from the skill's base rate.
  bidRange?: { min: number; max: number };
  expiresAt: string;
  distanceKm: number;
  estimatedMinutes: number;
  receivedAt: number;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  incomingInstantRequest: IncomingInstantRequest | null;
  incomingBiddingRequest: IncomingBiddingRequest | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  incomingInstantRequest: null,
  incomingBiddingRequest: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileDrawerOpen(state, action: PayloadAction<boolean>) {
      state.mobileDrawerOpen = action.payload;
    },
    showIncomingInstantRequest(state, action: PayloadAction<IncomingInstantRequest>) {
      state.incomingInstantRequest = action.payload;
    },
    clearIncomingInstantRequest(state) {
      state.incomingInstantRequest = null;
    },
    showIncomingBiddingRequest(state, action: PayloadAction<IncomingBiddingRequest>) {
      state.incomingBiddingRequest = action.payload;
    },
    clearIncomingBiddingRequest(state) {
      state.incomingBiddingRequest = null;
    },
  },
});

export const {
  toggleSidebar,
  setMobileDrawerOpen,
  showIncomingInstantRequest,
  clearIncomingInstantRequest,
  showIncomingBiddingRequest,
  clearIncomingBiddingRequest,
} = uiSlice.actions;
export default uiSlice.reducer;
