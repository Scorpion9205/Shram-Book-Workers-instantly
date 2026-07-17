export type UserRole = "worker" | "provider" | "agent";

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  bio?: string;
  experienceYears?: number;
  isAvailable: boolean;
  rating?: number;
  completedJobs?: number;
  skills?: Skill[];
  currentLat?: number;
  currentLng?: number;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  companyName?: string;
  address?: string;
  totalJobsPosted?: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  agencyName: string;
  description?: string;
  rating?: number;
  user?: User;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
}

export type JobStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface Job {
  id: string;

  title: string;

  description?: string;

  budget?: number;

  requiredWorkers: number;

  latitude: number;

  longitude: number;

  address?: string;

  city?: string;

  state?: string;

  pincode?: string;

  status: JobStatus;

  createdAt: string;

  distanceKm?: number;

  skill?: {
    id: string;
    name: string;
  };

  provider?: {
    id: string;
    name: string;
  };

  _count?: {
    applications: number;
    bookings: number;
  };
}

export type ApplicationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

export interface JobApplication {
  id: string;

  bidAmount?: number;

  workerCount?: number;

  status: ApplicationStatus;

  createdAt: string;

  worker?: {
    experience: number;

    dailyRate?: number;

    rating: number;

    totalJobs: number;

    user: {
      name: string;

      phone: string;

      profileImage?: string;
    };
  };

  agent?: {
    agencyName: string;

    rating: number;

    user: {
      name: string;

      phone: string;

      profileImage?: string;
    };
  };

  job?: Job;
}
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface Booking {
  id: string;

  amount: number;

  status: BookingStatus;

  createdAt: string;

  startedAt?: string;

  completedAt?: string;

  job?: {
    id: string;
    title: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    budget?: number;
    latitude?: number;
    longitude?: number;

    skill?: {
      id: string;
      name: string;
    };
  };

  provider?: {
    id: string;
    name: string;
    phone?: string;
    profileImage?: string;
  };

  worker?: {
    id: string;

    experience: number;

    dailyRate?: number;

    rating: number;

    totalJobs: number;

    user: {
      id: string;
      name: string;
      phone: string;
      profileImage?: string;
    };

  };
  review?: {

    id: string;

    rating: number;

    comment?: string;

  }
}

export interface InstantRequestItem {
  id: string;
  requestId: string;
  workerId: string;
  status: "pending" | "accepted" | "declined" | "expired";
}

export interface InstantRequest {
  id: string;
  providerId: string;
  providerName?: string;
  workerType: string;
  address: string;
  amount: number;
  notes?: string;
  workersNeeded: number;
  distanceKm?: number;
  estimatedMinutes?: number;
  createdAt: string;
}

export interface Review {
  id: string;

  bookingId?: string;

  rating: number;

  comment?: string;

  createdAt: string;

  provider?: {
    id: string;
    name: string;
  };

  worker?: {
    id: string;

    user: {
      name: string;
      profileImage?: string;
    };
  };

  booking?: {
    id: string;

    job?: {
      title: string;
    };
  };
}
export interface DashboardWorker {
  todaysEarnings: number;
  completedJobs: number;
  rating: number;
  pendingRequests: number;
  currentBooking?: Booking | null;
  upcomingJobs?: Job[];
  recentReviews?: Review[];
  earningsTrend?: { label: string; value: number }[];
}

export interface DashboardProvider {
  activeJobs: number;
  completedJobs: number;
  workersHired: number;
  moneySpent: number;
  recentBookings?: Booking[];
  recentApplicants?: JobApplication[];
  analyticsTrend?: { label: string; value: number }[];
}

export interface DashboardAgent {
  agencyName: string;
  rating: number;
  totalWorkers: number;
  availableWorkers: number;
  pendingApplications: number;
  activeBookings: number;
  completedBookings: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
