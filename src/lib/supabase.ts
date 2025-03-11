// src/lib/supabase.ts - Versão ultra simplificada
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Funções auxiliares simples
export async function isLoggedIn() {
    const { data, error } = await supabase.auth.getSession();
    return !!data.session;
}

export async function loginWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
    return supabase.auth.signOut();
}