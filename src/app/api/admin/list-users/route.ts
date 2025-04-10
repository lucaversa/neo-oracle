import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        // Criar cliente com service role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Buscar usuários
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        // Buscar admins
        const { data: admins, error: adminsError } = await supabaseAdmin
            .from('admin_users')
            .select('user_id');

        if (adminsError) {
            return NextResponse.json(
                { error: adminsError.message },
                { status: 400 }
            );
        }

        // Array com IDs de usuários admin
        const adminIds = admins.map(admin => admin.user_id);

        // Preparar dados para o cliente
        const transformedUsers = data.users.map(user => ({
            id: user.id,
            email: user.email || '',
            created_at: user.created_at,
            is_admin: adminIds.includes(user.id)
        }));

        return NextResponse.json({ users: transformedUsers });
    } catch (error: unknown) {
        console.error('Erro ao listar usuários:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Erro interno do servidor';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}