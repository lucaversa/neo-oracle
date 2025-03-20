// src/app/api/admin/files/[file_id]/content/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    context: { params: { file_id: string } }
) {
    try {
        const { file_id } = context.params;

        // Rest of your function remains the same
        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log(`Recuperando conteúdo do arquivo: ${file_id}`);

        // Chamar API da OpenAI para obter o conteúdo do arquivo
        const openaiResponse = await fetch(`https://api.openai.com/v1/files/${file_id}/content`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
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

        // Retornar o conteúdo do arquivo
        const fileContent = await openaiResponse.text();
        return new Response(fileContent, {
            headers: {
                'Content-Type': openaiResponse.headers.get('Content-Type') || 'application/octet-stream'
            }
        });
    } catch (error) {
        console.error('Erro ao recuperar conteúdo do arquivo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}