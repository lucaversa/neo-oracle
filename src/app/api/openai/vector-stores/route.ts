// src/app/api/openai/vector-stores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET - Listar vector stores disponíveis
 */
export async function GET(request: NextRequest) {
    try {
        // Obter todas as vector stores ativas
        const { data, error } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Erro ao buscar vector stores:', error);
            return NextResponse.json({ error: 'Falha ao buscar vector stores' }, { status: 500 });
        }

        return NextResponse.json({
            vectorStores: data,
            searchableIds: data ? data.filter(store => store.is_searchable).map(store => store.vector_store_id) : []
        });
    } catch (error) {
        console.error('Erro na rota GET vector-stores:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * POST - Criar um novo vector store
 */
export async function POST(request: NextRequest) {
    try {
        const { name, description } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: 'Nome é obrigatório' },
                { status: 400 }
            );
        }

        // Criar vector store na OpenAI
        const vectorStore = await openai.vectorStores.create({
            name,
        });

        // Salvar referência no Supabase
        const { error } = await supabase
            .from('vector_stores')
            .insert({
                vector_store_id: vectorStore.id,
                name,
                description: description || null,
                is_active: true,
                is_searchable: true
            });

        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
            // Se falhar no Supabase, tentar excluir da OpenAI para não deixar órfão
            try {
                await openai.vectorStores.del(vectorStore.id);
            } catch (deleteError) {
                console.error('Erro ao excluir vector store órfão:', deleteError);
            }

            return NextResponse.json(
                { error: 'Falha ao registrar vector store' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            vectorStore
        });
    } catch (error) {
        console.error('Erro na rota POST vector-stores:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * PATCH - Atualizar configurações de um vector store
 */
export async function PATCH(request: NextRequest) {
    try {
        const { vector_store_id, is_searchable, is_active, name, description } = await request.json();

        if (!vector_store_id) {
            return NextResponse.json(
                { error: 'ID do vector store é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar se o vector store existe
        const { data: existingStore, error: findError } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('vector_store_id', vector_store_id)
            .single();

        if (findError || !existingStore) {
            return NextResponse.json(
                { error: 'Vector store não encontrado' },
                { status: 404 }
            );
        }

        // Preparar dados para atualização
        const updateData: any = {};
        if (typeof is_searchable === 'boolean') updateData.is_searchable = is_searchable;
        if (typeof is_active === 'boolean') updateData.is_active = is_active;
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        updateData.updated_at = new Date().toISOString();

        // Atualizar no Supabase
        const { error } = await supabase
            .from('vector_stores')
            .update(updateData)
            .eq('vector_store_id', vector_store_id);

        if (error) {
            console.error('Erro ao atualizar vector store:', error);
            return NextResponse.json(
                { error: 'Falha ao atualizar vector store' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Vector store atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro na rota PATCH vector-stores:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Excluir um vector store
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const vectorStoreId = searchParams.get('id');

        if (!vectorStoreId) {
            return NextResponse.json(
                { error: 'ID do vector store é obrigatório' },
                { status: 400 }
            );
        }

        // Excluir da OpenAI
        await openai.vectorStores.del(vectorStoreId);

        // Excluir do Supabase
        await supabase
            .from('vector_stores')
            .delete()
            .eq('vector_store_id', vectorStoreId);

        return NextResponse.json({
            success: true,
            message: 'Vector store excluído com sucesso'
        });
    } catch (error) {
        console.error('Erro na rota DELETE vector-stores:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}