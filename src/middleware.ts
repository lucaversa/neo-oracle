// src/middleware.ts
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

    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        // Rotas que requerem autenticação
        const protectedRoutes = [
            '/chat',
            '/dashboard',
        ];

        // Rotas de autenticação - redirecionar usuários logados para o chat
        const authRoutes = [
            '/login',
            '/register'
        ];

        const isProtectedRoute = protectedRoutes.some(route =>
            req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
        );

        const isAuthRoute = authRoutes.some(route =>
            req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
        );

        // Verificar se o usuário está tentando acessar uma rota protegida sem autenticação
        if (!session && isProtectedRoute) {
            const redirectUrl = new URL('/login', req.url);
            redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
        }

        // Redirecionar usuários autenticados da página de login/registro para o chat
        if (session && isAuthRoute) {
            return NextResponse.redirect(new URL('/chat', req.url));
        }

        return res;
    } catch (error) {
        console.error('Erro no middleware:', error);
        return res;
    }
}

export const config = {
    matcher: ['/login', '/register', '/chat/:path*', '/dashboard/:path*'],
};