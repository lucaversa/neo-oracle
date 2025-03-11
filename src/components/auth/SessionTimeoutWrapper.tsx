// src/components/auth/SessionTimeoutWrapper.tsx
'use client'

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import SessionTimeout from './SessionTimeout';

export default function SessionTimeoutWrapper({
    children
}: {
    children: ReactNode
}) {
    const pathname = usePathname();

    // Verificar se estamos em uma rota autenticada
    const isAuthenticatedRoute =
        pathname?.startsWith('/chat') ||
        pathname?.startsWith('/dashboard');

    return (
        <>
            {children}
            {isAuthenticatedRoute && <SessionTimeout timeoutMinutes={30} warningMinutes={5} />}
        </>
    );
}