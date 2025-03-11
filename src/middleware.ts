import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Verificar se o usuário está tentando acessar uma rota protegida sem autenticação
    if (!session && (
        req.nextUrl.pathname.startsWith('/chat') ||
        req.nextUrl.pathname.startsWith('/dashboard')
    )) {
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirecionar usuários autenticados da página de login/registro para o chat
    if (session && (
        req.nextUrl.pathname.startsWith('/login') ||
        req.nextUrl.pathname.startsWith('/register')
    )) {
        return NextResponse.redirect(new URL('/chat', req.url));
    }

    return res;
}

export const config = {
    matcher: ['/login', '/register', '/chat/:path*', '/dashboard/:path*'],
};