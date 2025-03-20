// src/app/api/openai/search-config/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Buscar vector stores ativas que são pesquisáveis
        const { data: searchableStores, error: searchableError } = await supabase
            .from('vector_stores')
            .select('vector_store_id, name, description, is_default')
            .eq('is_active', true)
            .eq('is_searchable', true);

        if (searchableError) {
            console.error('Erro ao buscar vector stores pesquisáveis:', searchableError);
            return NextResponse.json(
                { error: 'Falha ao buscar vector stores pesquisáveis' },
                { status: 500 }
            );
        }

        // Buscar vector store padrão
        const { data: defaultStore, error: defaultError } = await supabase
            .from('vector_stores')
            .select('vector_store_id')
            .eq('is_active', true)
            .eq('is_searchable', true)
            .eq('is_default', true)
            .maybeSingle();

        if (defaultError && defaultError.code !== 'PGRST116') { // PGRST116 é "não encontrado"
            console.error('Erro ao buscar vector store padrão:', defaultError);
        }

        // Extrair os IDs e o ID padrão
        const searchableIds = searchableStores ? searchableStores.map(store => store.vector_store_id) : [];
        const defaultId = defaultStore ? defaultStore.vector_store_id : (searchableIds.length > 0 ? searchableIds[0] : null);

        return NextResponse.json({
            searchableIds,
            stores: searchableStores || [],
            defaultId,
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