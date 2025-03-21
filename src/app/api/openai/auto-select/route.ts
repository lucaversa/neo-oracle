// src/app/api/openai/auto-select/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        // Extrair dados da requisição
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Consulta não fornecida' },
                { status: 400 }
            );
        }

        // Buscar vector stores pesquisáveis
        const { data: stores, error } = await supabase
            .from('vector_stores')
            .select('vector_store_id, name, description')
            .eq('is_active', true)
            .eq('is_searchable', true);

        if (error) {
            console.error('Erro ao buscar vector stores:', error);
            return NextResponse.json(
                { error: 'Falha ao buscar vector stores' },
                { status: 500 }
            );
        }

        // Verificar se temos vector stores disponíveis
        if (!stores || stores.length === 0) {
            return NextResponse.json(
                { error: 'Nenhuma vector store disponível' },
                { status: 404 }
            );
        }

        // Se houver apenas uma vector store, retorná-la diretamente
        if (stores.length === 1) {
            return NextResponse.json({
                vector_store_id: stores[0].vector_store_id
            });
        }

        // Preparar o prompt para a API
        const storesDescription = stores.map((store, index) => `
        ${index + 1}. ID: ${store.vector_store_id}
           Nome: ${store.name}
           Descrição: ${store.description || 'Sem descrição'}
        `).join('\n');

        const userPrompt = `
        PERGUNTA DO USUÁRIO:
        "${query}"
        
        BASES DE CONHECIMENTO DISPONÍVEIS:
        ${storesDescription}
        
        Analise a pergunta e selecione a base de conhecimento mais adequada.
        Responda APENAS com o ID da base escolhida, sem explicações adicionais.
        `;

        // Chamar a OpenAI usando a API Responses
        const response = await openai.responses.create({
            model: "o3-mini",
            input: userPrompt,
            instructions: "Você deve selecionar a base de conhecimento mais adequada para a pergunta do usuário. Responda com o ID exato da base, sem explicações ou texto adicional."
        });

        // Extrair o texto da resposta - acessando corretamente a propriedade text
        // O erro estava aqui, tentando chamar .trim() em um objeto que não era string
        // Obtemos o texto diretamente da propriedade 'text' na resposta
        const selectedText = response.text || "";
        const cleanedText = selectedText.toString().trim();

        console.log('Resposta da API:', cleanedText);

        // Verificar se o ID retornado existe na lista de vector stores
        const matchingStore = stores.find(store =>
            store.vector_store_id === cleanedText ||
            cleanedText.includes(store.vector_store_id) ||
            store.vector_store_id.includes(cleanedText)
        );

        if (!matchingStore) {
            console.warn('ID retornado pela IA não é válido:', cleanedText);
            // Retornar a primeira vector store como fallback
            return NextResponse.json({
                vector_store_id: stores[0].vector_store_id,
                fallback: true
            });
        }

        // Retornar o ID da vector store selecionada
        return NextResponse.json({
            vector_store_id: matchingStore.vector_store_id
        });

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}