import { DashboardRange } from "./dashboard.types.js";

export interface AnalyticsConfig {
  startDate: Date;
  labels: string[];
  groupBy: "hour" | "day" | "week" | "month";
}

export const getAnalyticsConfig = (
  range: DashboardRange
): AnalyticsConfig => {
  const now = new Date();

  switch (range) {
    case DashboardRange.TODAY: {
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "hour",
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      };
    }

    case DashboardRange.LAST_7_DAYS: {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "day",
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      };
    }

    case DashboardRange.LAST_30_DAYS: {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "week",
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      };
    }

    case DashboardRange.LAST_3_MONTHS: {
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 2);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "month",
        labels: ["Month 1", "Month 2", "Month 3"],
      };
    }

    case DashboardRange.LAST_6_MONTHS: {
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 5);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "month",
        labels: [
          "Month 1",
          "Month 2",
          "Month 3",
          "Month 4",
          "Month 5",
          "Month 6",
        ],
      };
    }

    case DashboardRange.LAST_YEAR: {
      const startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setMonth(now.getMonth() + 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "month",
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      };
    }

    default: {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      return {
        startDate,
        groupBy: "day",
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      };
    }
  }
};