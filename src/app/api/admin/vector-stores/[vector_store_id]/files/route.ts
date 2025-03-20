// src/app/api/admin/vector-stores/[vector_store_id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Interface para definir a estrutura do corpo da requisição
interface VectorStoreFileRequest {
    file_id: string;
    chunking_strategy?: {
        chunk_size?: number;
        chunk_overlap?: number;
    };
}

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

        // Obter parâmetros de consulta
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const after = searchParams.get('after');
        const before = searchParams.get('before');

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log(`Listando arquivos da vector store: ${vector_store_id} (limit: ${limit}, after: ${after || 'none'})`);

        // Construir URL com parâmetros de paginação
        let url = `https://api.openai.com/v1/vector_stores/${vector_store_id}/files?limit=${limit}`;
        if (after) url += `&after=${after}`;
        if (before) url += `&before=${before}`;

        // Chamar API da OpenAI
        const openaiResponse = await fetch(url, {
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
        console.log('Resposta OpenAI Files:', {
            count: data.data?.length,
            has_more: data.has_more,
            first_id: data.first_id,
            last_id: data.last_id
        });

        // Passar todos os detalhes de paginação de volta para o cliente
        return NextResponse.json({
            data: data.data || [],
            has_more: data.has_more || false,
            first_id: data.first_id,
            last_id: data.last_id,
            object: data.object
        });
    } catch (error) {
        console.error('Erro ao listar arquivos da vector store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

// src/app/api/admin/vector-stores/[vector_store_id]/files/route.ts
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

        console.log('Associando arquivo à Vector Store:', {
            vector_store_id,
            file_id,
            chunking_strategy
        });

        // Corpo da requisição com valores obrigatórios
        const requestBody: VectorStoreFileRequest = {
            file_id
        };

        if (chunking_strategy) {
            requestBody.chunking_strategy = chunking_strategy;
        }

        console.log('Corpo da requisição:', JSON.stringify(requestBody));

        // Chamada à API da OpenAI
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Status da resposta:', openaiResponse.status);
        const responseText = await openaiResponse.text();
        console.log('Resposta bruta:', responseText);

        if (!openaiResponse.ok) {
            return NextResponse.json(
                {
                    error: `Erro na API da OpenAI: ${openaiResponse.statusText}`,
                    details: responseText,
                    status: openaiResponse.status
                },
                { status: openaiResponse.status }
            );
        }

        // Parsear a resposta
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            // Omitindo o parâmetro de erro já que não o estamos utilizando
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