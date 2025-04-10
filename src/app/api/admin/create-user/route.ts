import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        // Obter dados do corpo da requisição
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Criar cliente com service role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Criar usuário
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, user: data.user });
    } catch (error: unknown) {
        console.error('Erro ao criar usuário:', error);

        // Extrair mensagem de erro com segurança
        const errorMessage = error instanceof Error
            ? error.message
            : 'Erro interno do servidor';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}