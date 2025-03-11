// src/middleware.ts - Versão ultra minimalista
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
    // Ignorar requisições de API e recursos estáticos
    if (
        req.nextUrl.pathname.startsWith('/api') ||
        req.nextUrl.pathname.startsWith('/_next') ||
        req.nextUrl.pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Só aplicar a rotas protegidas
    if (!req.nextUrl.pathname.startsWith('/chat') &&
        !req.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Verificar sessão
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    // Se não estiver autenticado em rota protegida, redirecionar para login
    if (!session) {
        const redirectUrl = new URL('/login', req.url);
        return NextResponse.redirect(redirectUrl);
    }

    return res;
}

// Apenas aplicar a middleware às rotas protegidas
export const config = {
    matcher: ['/chat/:path*', '/dashboard/:path*'],
};