// src/context/AuthContext.tsx - Versão melhorada
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'supabase-auth',  // Chave específica para armazenamento
        storage: typeof window !== 'undefined' ? window.localStorage : undefined  // Garantir que usa localStorage
    }
});

// Tipos
type User = {
    id: string;
    email?: string;
    user_metadata?: {
        name?: string;
    };
}

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<any>;
    logout: () => Promise<void>;
    checkSessionValid: () => Promise<boolean>;
    refreshSession: () => Promise<boolean>;
}

// Criar contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Verificar sessão atual e configurar listener
    useEffect(() => {
        // Função para obter o usuário atual
        const getSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Erro ao obter sessão:', error);
                    setUser(null);
                } else if (data.session) {
                    console.log('Sessão encontrada:', data.session.user.email);
                    setUser(data.session.user);
                } else {
                    console.log('Nenhuma sessão ativa encontrada');
                    setUser(null);
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Configurar listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Evento de autenticação:', event);
                setUser(session?.user || null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Função para verificar se a sessão está válida
    const checkSessionValid = async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao verificar validade da sessão:', error);
            return false;
        }
    };

    // Função para atualizar o token de acesso
    const refreshSession = async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.refreshSession();

            if (error || !data.session) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao atualizar sessão:', error);
            return false;
        }
    };

    // Função de login
    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Erro de login:', error);
                return { data: null, error };
            }

            console.log('Login bem-sucedido:', data.user?.email);
            setUser(data.user);

            return { data, error: null };
        } catch (error) {
            console.error('Exceção durante login:', error);
            return { data: null, error };
        }
    };

    // Função de logout
    const logout = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Erro ao fazer logout:', error);
                throw error;
            }

            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Exceção durante logout:', error);
        } finally {
            setLoading(false);
        }
    };

    // Valor do contexto
    const value = {
        user,
        loading,
        login,
        logout,
        checkSessionValid,
        refreshSession
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook personalizado
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}