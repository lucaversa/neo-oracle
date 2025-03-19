import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID do vector_store é obrigatório' }, { status: 400 });
        }

        // Fazer requisição para a API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição DELETE para a API OpenAI com a chave:', openaiKey.substring(0, 5) + '...');
        console.log('Vector store ID:', vector_store_id);

        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}`, {
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
                message: 'Vector store não encontrado na API, mas considerado como excluído.'
            });
        }

        return NextResponse.json({ success: true, message: 'Vector store excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir vector_store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID do vector_store é obrigatório' }, { status: 400 });
        }

        // Fazer requisição para a API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para a API OpenAI com a chave:', openaiKey.substring(0, 5) + '...');
        console.log('Vector store ID:', vector_store_id);

        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}`, {
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
        console.error('Erro ao obter vector_store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}