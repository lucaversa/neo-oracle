import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const { userId, action } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'ID do usuário não fornecido' },
                { status: 400 }
            );
        }

        if (action !== 'add' && action !== 'remove') {
            return NextResponse.json(
                { error: 'Ação inválida. Deve ser "add" ou "remove"' },
                { status: 400 }
            );
        }

        // Criar cliente com service role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (action === 'add') {
            // Verificar se já existe para evitar erro de duplicata
            const { data: existingUser } = await supabaseAdmin
                .from('admin_users')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            // Só adicione se ainda não existir
            if (!existingUser) {
                const { error } = await supabaseAdmin
                    .from('admin_users')
                    .insert({ user_id: userId });

                if (error) {
                    console.error("Erro ao adicionar admin:", error);
                    return NextResponse.json(
                        { error: error.message || 'Falha ao adicionar admin' },
                        { status: 500 }
                    );
                }
            }
        } else {
            // Remover como admin
            const { error } = await supabaseAdmin
                .from('admin_users')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error("Erro ao remover admin:", error);
                return NextResponse.json(
                    { error: error.message || 'Falha ao remover admin' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: action === 'add' ? 'Usuário adicionado como administrador' : 'Status de administrador removido'
        });
    } catch (error: unknown) {
        console.error('Erro ao alterar status de admin:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Erro interno do servidor';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}