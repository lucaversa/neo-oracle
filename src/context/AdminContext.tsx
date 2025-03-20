'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type AdminContextType = {
    isAdmin: boolean;
    loading: boolean;
    error: string | null;
    checkAdminStatus: () => Promise<boolean>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    // Função para verificar se o usuário é admin
    const checkAdminStatus = useCallback(async (): Promise<boolean> => {
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return false;
        }

        try {
            setLoading(true);
            setError(null);

            // Consultar a tabela admin_users para verificar se o usuário é admin
            const { data, error } = await supabase
                .from('admin_users')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Erro ao verificar status de administrador:', error);
                setError(error.message);
                setIsAdmin(false);
                return false;
            }

            // Se encontrou um registro, o usuário é admin
            const adminStatus = !!data;
            setIsAdmin(adminStatus);

            return adminStatus;
        } catch (err) {
            console.error('Erro ao verificar status de administrador:', err);
            setError('Falha ao verificar permissões de administrador');
            setIsAdmin(false);
            return false;
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Verificar status de admin quando o usuário é carregado
    useEffect(() => {
        if (user) {
            checkAdminStatus();
        } else {
            setIsAdmin(false);
            setLoading(false);
        }
    }, [user, checkAdminStatus]);

    return (
        <AdminContext.Provider value={{ isAdmin, loading, error, checkAdminStatus }}>
            {children}
        </AdminContext.Provider>
    );
}

// Hook para usar o contexto de admin
export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin deve ser usado dentro de um AdminProvider');
    }
    return context;
}

// Hook para verificar se um usuário tem acesso a rotas de admin
export function withAdminAccess<P extends object>(
    Component: React.ComponentType<P>
) {
    return function WithAdminAccessWrapper(props: P) {
        const { isAdmin, loading } = useAdmin();
        const router = useRouter();
        const [checked, setChecked] = useState(false);

        useEffect(() => {
            if (!loading && !isAdmin && !checked) {
                setChecked(true);
                router.push('/chat');
            }
        }, [isAdmin, loading, router, checked]);

        if (loading) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="w-12 h-12 border-4 border-border-color border-t-primary-color rounded-full animate-spin"></div>
                </div>
            );
        }

        if (!isAdmin) {
            return null;
        }

        return <Component {...props} />;
    };
}