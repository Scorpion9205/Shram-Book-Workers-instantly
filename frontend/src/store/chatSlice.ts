import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ChatState {
  messagesByBookingId: Record<string, ChatMessage[]>;
}

const initialState: ChatState = {
  messagesByBookingId: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    messageReceived(state, action: PayloadAction<{ bookingId: string; message: ChatMessage }>) {
      const { bookingId, message } = action.payload;
      if (!state.messagesByBookingId[bookingId]) {
        state.messagesByBookingId[bookingId] = [];
      }
      // Prevent duplicate messages in cache
      const exists = state.messagesByBookingId[bookingId].some(m => m.id === message.id);
      if (!exists) {
        state.messagesByBookingId[bookingId].push(message);
      }
    },
    setMessagesForBooking(state, action: PayloadAction<{ bookingId: string; messages: ChatMessage[] }>) {
      const { bookingId, messages } = action.payload;
      state.messagesByBookingId[bookingId] = messages;
    },
    clearChat(state) {
      state.messagesByBookingId = {};
    },
  },
});

export const { messageReceived, setMessagesForBooking, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
