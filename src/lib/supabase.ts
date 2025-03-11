import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL e chave anônima devem ser definidas nas variáveis de ambiente');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// src/types/auth.ts
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