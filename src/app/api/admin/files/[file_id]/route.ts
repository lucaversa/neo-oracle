// src/app/api/admin/files/[file_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET endpoint para obter detalhes do arquivo
export async function GET(
    request: NextRequest,
    { params }: { params: { file_id: string } }
) {
    try {
        const { file_id } = params;

        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para obter detalhes do arquivo:', file_id);

        // Chamar API da OpenAI para obter detalhes do arquivo
        const openaiResponse = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
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
        console.error('Erro ao obter detalhes do arquivo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

// DELETE endpoint para excluir um arquivo
export async function DELETE(
    request: NextRequest,
    { params }: { params: { file_id: string } }
) {
    try {
        const { file_id } = params;

        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição DELETE para excluir arquivo:', file_id);

        // Chamar API da OpenAI para excluir arquivo
        const openaiResponse = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
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
                message: 'Arquivo não encontrado na API, mas considerado como excluído.'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Arquivo excluído com sucesso',
            object: 'file',
            id: file_id,
            deleted: true
        });
    } catch (error) {
        console.error('Erro ao excluir arquivo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}