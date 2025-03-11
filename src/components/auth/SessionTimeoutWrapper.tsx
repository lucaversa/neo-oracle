'use client'

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import SessionTimeout from './SessionTimeout';
import { useAuth } from '@/context/AuthContext';

export default function SessionTimeoutWrapper({
    children
}: {
    children: ReactNode
}) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Verificar se estamos em uma rota autenticada e se o usuário está logado
    const isAuthenticatedRoute =
        pathname?.startsWith('/chat') ||
        pathname?.startsWith('/dashboard');

    // Só mostrar o componente de timeout se o usuário estiver autenticado e em uma rota protegida
    const showTimeout = isAuthenticatedRoute && user !== null;

    return (
        <>
            {children}
            {showTimeout && <SessionTimeout timeoutMinutes={30} warningMinutes={5} />}
        </>
    );
}