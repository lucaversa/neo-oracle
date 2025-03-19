// src/services/vectorStoreService.ts
import { supabase } from '@/lib/supabase';
import { VectorStore, CreateVectorStoreRequest, OpenAIVectorStoreResponse, OpenAIVectorStoreListResponse } from '@/types/admin';

// Função para listar todas as vector_stores
export async function listVectorStores(): Promise<VectorStore[]> {
    try {
        const { data, error } = await supabase
            .from('vector_stores')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao listar vector_stores:', error);
            throw new Error(`Falha ao listar vector_stores: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Erro ao listar vector_stores:', error);
        throw error;
    }
}

// Função para obter uma vector_store pelo ID
export async function getVectorStoreById(vector_store_id: string): Promise<VectorStore | null> {
    try {
        const { data, error } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('vector_store_id', vector_store_id)
            .maybeSingle();

        if (error) {
            console.error(`Erro ao buscar vector_store ${vector_store_id}:`, error);
            throw new Error(`Falha ao buscar vector_store: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error(`Erro ao buscar vector_store ${vector_store_id}:`, error);
        throw error;
    }
}

// Função para criar uma nova vector_store
export async function createVectorStore(request: CreateVectorStoreRequest, userId: string): Promise<VectorStore> {
    try {
        // 1. Criar vector_store na API do OpenAI
        const openAIResponse = await createOpenAIVectorStore(request.name);

        if (!openAIResponse || !openAIResponse.id) {
            throw new Error('Falha ao criar vector_store na API do OpenAI');
        }

        // 2. Salvar no Supabase
        const vectorStore: Partial<VectorStore> = {
            vector_store_id: openAIResponse.id,
            name: request.name,
            description: request.description || '',
            is_active: true,
            is_searchable: request.is_searchable !== false, // Default é true
        };

        const { data, error } = await supabase
            .from('vector_stores')
            .insert(vectorStore)
            .select('*')
            .single();

        if (error) {
            console.error('Erro ao inserir vector_store no banco:', error);
            // Tentar excluir da API OpenAI para manter consistência
            try {
                await deleteOpenAIVectorStore(openAIResponse.id);
            } catch (deleteError) {
                console.error('Erro ao excluir vector_store da API após falha:', deleteError);
            }
            throw new Error(`Falha ao salvar vector_store: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Erro ao criar vector_store:', error);
        throw error;
    }
}

// Função para atualizar uma vector_store existente
export async function updateVectorStore(vector_store_id: string, updates: Partial<VectorStore>): Promise<VectorStore> {
    try {
        const { data, error } = await supabase
            .from('vector_stores')
            .update(updates)
            .eq('vector_store_id', vector_store_id)
            .select('*')
            .single();

        if (error) {
            console.error(`Erro ao atualizar vector_store ${vector_store_id}:`, error);
            throw new Error(`Falha ao atualizar vector_store: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error(`Erro ao atualizar vector_store ${vector_store_id}:`, error);
        throw error;
    }
}

// Função para excluir uma vector_store
export async function deleteVectorStore(vector_store_id: string): Promise<void> {
    try {
        // 1. Excluir da API OpenAI
        await deleteOpenAIVectorStore(vector_store_id);

        // 2. Excluir do banco de dados
        const { error } = await supabase
            .from('vector_stores')
            .delete()
            .eq('vector_store_id', vector_store_id);

        if (error) {
            console.error(`Erro ao excluir vector_store ${vector_store_id}:`, error);
            throw new Error(`Falha ao excluir vector_store: ${error.message}`);
        }
    } catch (error) {
        console.error(`Erro ao excluir vector_store ${vector_store_id}:`, error);
        throw error;
    }
}

// Função para listar vector_stores na API OpenAI
async function listOpenAIVectorStores(): Promise<OpenAIVectorStoreListResponse> {
    const response = await fetch('/api/admin/vector-stores', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao listar vector_stores na API: ${response.statusText}`);
    }

    return await response.json();
}

// Função para criar uma vector_store na API OpenAI
async function createOpenAIVectorStore(name: string): Promise<OpenAIVectorStoreResponse> {
    const response = await fetch('/api/admin/vector-stores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        throw new Error(`Erro ao criar vector_store na API: ${response.statusText}`);
    }

    return await response.json();
}

// Função para excluir uma vector_store na API OpenAI
async function deleteOpenAIVectorStore(vector_store_id: string): Promise<void> {
    const response = await fetch(`/api/admin/vector-stores/${vector_store_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao excluir vector_store na API: ${response.statusText}`);
    }
}