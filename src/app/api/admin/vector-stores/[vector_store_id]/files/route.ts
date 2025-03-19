// src/app/api/admin/vector-stores/[vector_store_id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET endpoint para listar arquivos de uma vector store
export async function GET(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID da vector store é obrigatório' }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para listar arquivos da vector store:', vector_store_id);

        // Chamar API da OpenAI para listar arquivos da vector store
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('Erro na resposta da API OpenAI:', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: errorText
            });

            return NextResponse.json(
                { error: `Erro na API da OpenAI: ${openaiResponse.statusText}`, details: errorText },
                { status: openaiResponse.status }
            );
        }

        const data = await openaiResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao listar arquivos da vector store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

// POST endpoint para adicionar um arquivo a uma vector store
export async function POST(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID da vector store é obrigatório' }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        // Obter dados da requisição
        const requestData = await request.json();
        const { file_id, chunking_strategy } = requestData;

        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        console.log('Enviando requisição POST para adicionar arquivo à vector store:', {
            vector_store_id,
            file_id,
            chunking_strategy
        });

        // Preparar corpo da requisição
        const requestBody: any = {
            file_id
        };

        // Adicionar estratégia de chunking se fornecida
        if (chunking_strategy) {
            requestBody.chunking_strategy = chunking_strategy;
        }

        // Chamar API da OpenAI para adicionar arquivo à vector store
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify(requestBody)
        });

        // Obter o corpo da resposta como texto para logging
        const responseText = await openaiResponse.text();

        if (!openaiResponse.ok) {
            console.error('Erro na resposta da API OpenAI:', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: responseText
            });

            return NextResponse.json(
                { error: `Erro na API da OpenAI: ${openaiResponse.statusText}`, details: responseText },
                { status: openaiResponse.status }
            );
        }

        // Parsear a resposta de texto para JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return NextResponse.json(
                { error: 'Erro ao analisar resposta da API OpenAI', details: responseText },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao adicionar arquivo à vector store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}