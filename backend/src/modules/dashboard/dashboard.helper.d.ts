import { DashboardRange } from "./dashboard.types.js";
export interface AnalyticsConfig {
    startDate: Date;
    labels: string[];
    groupBy: "hour" | "day" | "week" | "month";
}
export declare const getAnalyticsConfig: (range: DashboardRange) => AnalyticsConfig;
//# sourceMappingURL=dashboard.helper.d.ts.map