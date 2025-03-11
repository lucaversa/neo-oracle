// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Garantir que as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
    console.error('Variáveis de ambiente do Supabase não definidas corretamente');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'supabase-auth'
    }
});