// src/app/api/admin/vector-stores-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Buscar dados diretamente do banco, sem passar pela API da OpenAI
export async function GET(request: NextRequest) {
    try {
        console.log('[DEBUG] Buscando vector stores diretamente do banco');

        // Verificar se o cliente Supabase está disponível
        if (!supabase) {
            return NextResponse.json({ error: 'Cliente Supabase não inicializado' }, { status: 500 });
        }

        // Teste de conexão Supabase
        try {
            const { data: testData, error: testError } = await supabase.from('vector_stores').select('count').limit(1);
            console.log('[DEBUG] Teste de conexão Supabase:', {
                sucesso: !testError,
                erro: testError,
                resultado: testData
            });
        } catch (testErr) {
            console.error('[DEBUG] Erro no teste de conexão:', testErr);
            return NextResponse.json({ error: 'Falha no teste de conexão com o banco' }, { status: 500 });
        }

        // Buscar vector stores do banco
        const { data, error } = await supabase
            .from('vector_stores')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Erro ao buscar vector stores do banco:', error);
            return NextResponse.json({ error: 'Erro ao buscar dados do banco', details: error }, { status: 500 });
        }

        console.log('[DEBUG] Vector stores encontradas no banco:', data?.length);

        return NextResponse.json({
            data: data || [],
            count: data?.length || 0
        });
    } catch (error) {
        console.error('[DEBUG] Erro interno ao buscar vector stores do banco:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}