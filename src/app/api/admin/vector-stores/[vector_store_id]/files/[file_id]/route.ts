// src/app/api/admin/vector-stores/[vector_store_id]/files/[file_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// DELETE endpoint para remover um arquivo de uma vector store
export async function DELETE(
    request: NextRequest,
    { params }: { params: { vector_store_id: string; file_id: string } }
) {
    try {
        const { vector_store_id, file_id } = params;

        if (!vector_store_id || !file_id) {
            return NextResponse.json({
                error: 'IDs da vector store e do arquivo são obrigatórios'
            }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição DELETE para remover arquivo da vector store:', {
            vector_store_id,
            file_id
        });

        // Chamar API da OpenAI para remover arquivo da vector store
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files/${file_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        // Se o status for 404, consideramos como sucesso também (o recurso já não existe)
        if (!openaiResponse.ok && openaiResponse.status !== 404) {
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

        // Para 404, indicamos sucesso mas com uma mensagem específica
        if (openaiResponse.status === 404) {
            return NextResponse.json({
                success: true,
                message: 'Arquivo não encontrado na vector store, mas considerado como removido.'
            });
        }

        // Obter o corpo da resposta como texto para logging
        let responseData;
        try {
            const responseText = await openaiResponse.text();
            if (responseText) {
                responseData = JSON.parse(responseText);
            }
        } catch (e) {
            console.warn('Resposta sem corpo ou não JSON:', e);
        }

        return NextResponse.json({
            success: true,
            message: 'Arquivo removido da vector store com sucesso',
            ...responseData,
            id: file_id,
            vector_store_id: vector_store_id
        });
    } catch (error) {
        console.error('Erro ao remover arquivo da vector store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint para obter detalhes da associação arquivo-vector store
export async function GET(
    request: NextRequest,
    { params }: { params: { vector_store_id: string; file_id: string } }
) {
    try {
        const { vector_store_id, file_id } = params;

        if (!vector_store_id || !file_id) {
            return NextResponse.json({
                error: 'IDs da vector store e do arquivo são obrigatórios'
            }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para obter detalhes da associação arquivo-vector store:', {
            vector_store_id,
            file_id
        });

        // Chamar API da OpenAI para obter detalhes da associação arquivo-vector store
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files/${file_id}`, {
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
        console.error('Erro ao obter detalhes da associação arquivo-vector store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}