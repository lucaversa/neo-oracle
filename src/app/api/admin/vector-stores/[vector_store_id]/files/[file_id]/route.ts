import { NextRequest, NextResponse } from 'next/server';

// DELETE endpoint para remover um arquivo de uma vector store E também do storage
export async function DELETE(request: NextRequest, context: unknown) {
    const { params } = context as { params: { vector_store_id: string; file_id: string } };
    const { vector_store_id, file_id } = params;

    try {
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

        // 1. Primeiro removemos o arquivo da vector store
        const openaiResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files/${file_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        // Se houve erro na remoção do arquivo da vector store (não sendo 404)
        if (!openaiResponse.ok && openaiResponse.status !== 404) {
            const errorText = await openaiResponse.text();
            console.error('Erro na resposta da API OpenAI (remoção da vector store):', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: errorText
            });

            return NextResponse.json(
                { error: `Erro na API da OpenAI: ${openaiResponse.statusText}`, details: errorText },
                { status: openaiResponse.status }
            );
        }

        // 2. Agora, vamos deletar o arquivo do storage da OpenAI
        console.log('Enviando requisição DELETE para excluir arquivo do storage:', file_id);

        const deleteResponse = await fetch(`https://api.openai.com/v1/files/${file_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        // Capturar resposta do delete do storage
        let deleteError = null;
        let fileDeleteDetails = null;

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
            const errorText = await deleteResponse.text();
            console.error('Erro na resposta da API OpenAI (exclusão do storage):', {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                data: errorText
            });
            deleteError = {
                status: deleteResponse.status,
                message: deleteResponse.statusText,
                details: errorText
            };
        } else {
            try {
                const responseText = await deleteResponse.text();
                if (responseText) {
                    fileDeleteDetails = JSON.parse(responseText);
                }
            } catch (e) {
                console.warn('Resposta da exclusão do storage sem corpo ou não JSON:', e);
            }
        }

        // Status 404 na vector store = já não existe na vector store
        if (openaiResponse.status === 404) {
            return NextResponse.json({
                success: true,
                message: 'Arquivo não encontrado na vector store, mas considerado como removido.',
                file_storage_deleted: deleteResponse.ok || deleteResponse.status === 404,
                file_storage_error: deleteError,
                file_delete_details: fileDeleteDetails
            });
        }

        // Resposta final
        return NextResponse.json({
            success: true,
            message: 'Arquivo removido da vector store com sucesso' +
                (deleteResponse.ok ? ' e excluído do storage' : ' mas houve erro ao excluir do storage'),
            vector_store_id,
            file_id,
            file_storage_deleted: deleteResponse.ok || deleteResponse.status === 404,
            file_storage_error: deleteError,
            file_delete_details: fileDeleteDetails
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
export async function GET(request: NextRequest, context: unknown) {
    const { params } = context as { params: { vector_store_id: string; file_id: string } };
    const { vector_store_id, file_id } = params;

    try {
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