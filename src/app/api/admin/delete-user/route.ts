import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
    try {
        // Obter o ID do usuário dos parâmetros da URL
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'ID do usuário não fornecido' },
                { status: 400 }
            );
        }

        // Criar cliente com service role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Remover da tabela admin_users primeiro
        await supabaseAdmin
            .from('admin_users')
            .delete()
            .eq('user_id', userId);

        // Deletar o usuário
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Erro ao excluir usuário:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Erro interno do servidor';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}