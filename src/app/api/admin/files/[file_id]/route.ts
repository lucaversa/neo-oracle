import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: unknown) {
    // Fazemos a asserção para garantir que context tem o formato esperado
    const { params } = context as { params: { file_id: string } };
    const { file_id } = params;

    try {
        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para obter detalhes do arquivo:', file_id);

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

export async function DELETE(request: NextRequest, context: unknown) {
    const { params } = context as { params: { file_id: string } };
    const { file_id } = params;

    try {
        if (!file_id) {
            return NextResponse.json({ error: 'ID do arquivo é obrigatório' }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição DELETE para excluir arquivo:', file_id);

        const openaiResponse = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

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
