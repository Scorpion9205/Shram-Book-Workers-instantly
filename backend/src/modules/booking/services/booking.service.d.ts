export declare class BookingService {
    static getProviderBookings(userId: string): Promise<{
        id: string;
        createdAt: Date;
        job: {
            id: string;
            skill: {
                id: string;
                name: string;
            };
            address: string | null;
            city: string | null;
            description: string | null;
            latitude: number | null;
            longitude: number | null;
            title: string;
            budget: number | null;
        } | null;
        instantRequest: {
            id: string;
            address: string | null;
            title: string;
        } | null;
        worker: {
            id: string;
            user: {
                name: string;
                phone: string;
                profileImage: string | null;
            };
            experience: number;
            rating: number;
            totalJobs: number;
        } | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
    }[]>;
    static getWorkerBookings(userId: string): Promise<{
        id: string;
        createdAt: Date;
        job: {
            id: string;
            skill: {
                id: string;
                name: string;
            };
            address: string | null;
            city: string | null;
            description: string | null;
            latitude: number | null;
            longitude: number | null;
            title: string;
            budget: number | null;
        } | null;
        instantRequest: {
            id: string;
            address: string | null;
            title: string;
        } | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
        provider: {
            id: string;
            name: string;
            phone: string;
            profileImage: string | null;
        };
    }[]>;
    static getBookingById(bookingId: string): Promise<{
        job: {
            id: string;
            skill: {
                id: string;
                name: string;
            };
            address: string | null;
            city: string | null;
            pincode: string | null;
            state: string | null;
            description: string | null;
            latitude: number | null;
            longitude: number | null;
            title: string;
            budget: number | null;
        } | null;
        review: {
            id: string;
            rating: number;
            comment: string | null;
        } | null;
        instantRequest: {
            id: string;
            address: string | null;
            title: string;
        } | null;
        worker: {
            id: string;
            user: {
                id: string;
                name: string;
                phone: string;
                profileImage: string | null;
            };
            experience: number;
            dailyRate: number | null;
            rating: number;
            totalJobs: number;
        } | null;
        provider: {
            id: string;
            name: string;
            phone: string;
            profileImage: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        workerId: string | null;
        agentId: string | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        jobId: string | null;
        providerId: string;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
        instantRequestId: string | null;
        instantRequestResponseId: string | null;
    }>;
    static startWork(bookingId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        workerId: string | null;
        agentId: string | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        jobId: string | null;
        providerId: string;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
        instantRequestId: string | null;
        instantRequestResponseId: string | null;
    }>;
    static completeWork(bookingId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        workerId: string | null;
        agentId: string | null;
        status: import("@prisma/client").$Enums.BookingStatus;
        jobId: string | null;
        providerId: string;
        amount: number;
        startedAt: Date | null;
        completedAt: Date | null;
        instantRequestId: string | null;
        instantRequestResponseId: string | null;
    }>;
}
//# sourceMappingURL=booking.service.d.ts.map