// src/app/api/openai/search-config/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Buscar vector stores ativas que são pesquisáveis
        const { data, error } = await supabase
            .from('vector_stores')
            .select('vector_store_id')
            .eq('is_active', true)
            .eq('is_searchable', true);

        if (error) {
            console.error('Erro ao buscar vector stores pesquisáveis:', error);
            return NextResponse.json(
                { error: 'Falha ao buscar vector stores pesquisáveis' },
                { status: 500 }
            );
        }

        // Extrair os IDs para uma lista
        const searchableIds = data ? data.map(store => store.vector_store_id) : [];

        return NextResponse.json({
            searchableIds,
            status: 'success'
        });
    } catch (error) {
        console.error('Erro na rota GET search-config:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}