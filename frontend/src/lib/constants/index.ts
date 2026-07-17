export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const ACCESS_TOKEN_KEY = "shram_access_token";
export const REFRESH_TOKEN_KEY = "shram_refresh_token";

export const WORKER_CATEGORIES = [
  { value: "plumber", label: "Plumber", icon: "Wrench" },
  { value: "electrician", label: "Electrician", icon: "Zap" },
  { value: "painter", label: "Painter", icon: "PaintRoller" },
  { value: "carpenter", label: "Carpenter", icon: "Hammer" },
  { value: "mason", label: "Mason", icon: "Bricks" },
  { value: "cleaner", label: "Cleaner", icon: "Sparkles" },
  { value: "ac_repair", label: "AC Repair", icon: "Wind" },
  { value: "welder", label: "Welder", icon: "Flame" },
  { value: "driver", label: "Driver", icon: "Car" },
  { value: "mechanic", label: "Mechanic", icon: "Cog" },
  { value: "gardener", label: "Gardener", icon: "Trees" },
] as const;

export const INSTANT_REQUEST_TIMEOUT_SECONDS = 30;
