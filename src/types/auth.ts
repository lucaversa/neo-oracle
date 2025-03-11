export interface User {
    id: string;
    email?: string;
    user_metadata?: {
        name?: string;
    };
}

export interface AuthResponse {
    data: {
        user: User | null;
        session: unknown;
    } | null;
    error: Error | null;
}