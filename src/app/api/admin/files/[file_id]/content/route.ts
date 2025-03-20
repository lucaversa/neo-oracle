import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ file_id: string }>;

export async function GET(
    request: NextRequest,
    context: { params: Params }
) {
    const { file_id } = await context.params;

    try {
        if (!file_id) {
            return NextResponse.json(
                { error: 'ID do arquivo é obrigatório' },
                { status: 400 }
            );
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json(
                { error: 'API key não configurada' },
                { status: 500 }
            );
        }

        console.log(`Recuperando conteúdo do arquivo: ${file_id}`);

        const openaiResponse = await fetch(
            `https://api.openai.com/v1/files/${file_id}/content`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );

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

        const fileContent = await openaiResponse.text();
        return new Response(fileContent, {
            headers: {
                'Content-Type': openaiResponse.headers.get('Content-Type') || 'application/octet-stream'
            }
        });
    } catch (error) {
        console.error('Erro ao recuperar conteúdo do arquivo:', error);
        return NextResponse.json(
            {
                error: 'Erro interno ao processar requisição',
                details: error instanceof Error ? error.message : 'unknown error'
            },
            { status: 500 }
        );
    }
}
