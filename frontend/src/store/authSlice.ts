import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";
import { tokenStorage } from "@/lib/utils/token-storage";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true, 
};

interface SetCredentialsPayload {
  user: User;
  accessToken: string;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
   setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {

  const { user, accessToken } = action.payload;

  state.user = user;
  state.accessToken = accessToken;
  state.isAuthenticated = true;
  state.loading = false;

  tokenStorage.setAccessToken(accessToken);

},
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
      tokenStorage.setAccessToken(action.payload);
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    finishedLoading(state) {
      state.loading = false;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      tokenStorage.clearTokens();
    },
  },
});

export const { setCredentials, setAccessToken, setUser, finishedLoading, clearAuth } =
  authSlice.actions;
export default authSlice.reducer;
