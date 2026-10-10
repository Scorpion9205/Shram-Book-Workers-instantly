export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const ACCESS_TOKEN_KEY = "shram_access_token";
export const REFRESH_TOKEN_KEY = "shram_refresh_token";

export const INSTANT_REQUEST_TIMEOUT_SECONDS = 30;
