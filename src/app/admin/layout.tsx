'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const router = useRouter();

    useEffect(() => {
        // Redirecionar para login se não estiver autenticado
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        // Redirecionar para chat se não for admin
        if (!adminLoading && !isAdmin && user) {
            router.push('/chat');
        }
    }, [user, isAdmin, authLoading, adminLoading, router]);

    // Mostrar loading enquanto verifica autenticação e permissões
    if (authLoading || adminLoading || (!isAdmin && user)) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: 'var(--background-main)',
                transition: 'background-color 0.3s'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        borderColor: 'var(--border-color)',
                        borderTopColor: 'var(--primary-color)',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                    }}>
                        Verificando permissões...
                    </p>
                </div>
            </div>
        );
    }

    // Renderizar layout normal para administradores
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--background-main)',
            transition: 'background-color 0.3s'
        }}>
            {children}
        </div>
    );
}