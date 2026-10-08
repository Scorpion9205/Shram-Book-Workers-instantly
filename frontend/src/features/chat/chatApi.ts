import { apiSlice } from "@/services/api/apiSlice";

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderProfileImage: string | null;
  content: string;
  createdAt: string;
}

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChatMessages: builder.query<ChatMessage[], string>({
      query: (bookingId) => `/chat/${bookingId}/messages`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.messages || data;
      },
      providesTags: (_result, _error, bookingId) => [{ type: "Chat", id: bookingId }],
    }),
    sendChatMessage: builder.mutation<ChatMessage, { bookingId: string; content: string }>({
      query: ({ bookingId, content }) => ({
        url: `/chat/${bookingId}/send`,
        method: "POST",
        body: { content },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return data.message || data;
      },
      // The REST response already gives us the sent message, and the socket listener
      // (useChatSocket) pushes it into the cache directly — no need to invalidate/refetch.
    }),
  }),
});

export const { useGetChatMessagesQuery, useSendChatMessageMutation } = chatApi;
