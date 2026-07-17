import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstantRequest } from "@/types";

interface IncomingInstantRequest {
  itemId: string;
  request: InstantRequest;
  receivedAt: number;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  incomingInstantRequest: IncomingInstantRequest | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileDrawerOpen: false,
  incomingInstantRequest: null,
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
  },
});

export const {
  toggleSidebar,
  setMobileDrawerOpen,
  showIncomingInstantRequest,
  clearIncomingInstantRequest,
} = uiSlice.actions;
export default uiSlice.reducer;
