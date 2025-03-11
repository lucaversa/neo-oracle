'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Verificar sessão atual ao carregar
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);

                // Obter a sessão atual
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Erro ao obter sessão:', error.message);
                    return;
                }

                // Se existe sessão, definir o usuário
                if (session) {
                    setUser(session.user);
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();

        // Configurar o listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event);
                setUser(session?.user || null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Login com email e senha
    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            // Fazer login com email/senha
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Erro de login:', error.message);
                setError(error.message);
                return { success: false, error: error.message };
            }

            // Login bem-sucedido
            setUser(data.user);
            return { success: true };
        } catch (err: any) {
            console.error('Exceção durante login:', err.message);
            setError(err.message || 'Erro desconhecido no login');
            return { success: false, error: err.message || 'Erro desconhecido no login' };
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            setLoading(true);
            await supabase.auth.signOut();
            setUser(null);
            router.push('/login');
        } catch (err: any) {
            console.error('Erro ao fazer logout:', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook para usar o contexto de autenticação
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}