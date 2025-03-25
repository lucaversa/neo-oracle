// src/app/api/admin/vector-stores/[vector_store_id]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Interface para os dados de atualização de vector store
interface VectorStoreUpdateData {
    name?: string;
    description?: string | null;
    is_active?: boolean;
    is_searchable?: boolean;
    is_default?: boolean;
}

// Interface para os arquivos retornados pela API da OpenAI
interface OpenAIVectorStoreFile {
    id: string;
    object: string;
    created_at: number;
    vector_store_id: string;
    purpose: string;
    [key: string]: unknown; // Para outros campos que possam existir
}

export async function GET(request: Request) {
    try {
        // Extrair o ID diretamente da URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const vector_store_id = pathParts[pathParts.length - 1];

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

        // Mesclar os dados da OpenAI com os dados do Supabase
        const openaiData = await openaiResponse.json();

        try {
            // Tentar buscar os dados complementares do Supabase
            const { data: supabaseData, error: fetchError } = await supabase
                .from('vector_stores')
                .select('*')
                .eq('vector_store_id', vector_store_id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // Ignorar erro de "não encontrado"
                console.warn('Erro ao buscar dados complementares do Supabase:', fetchError);
            }

            // Se encontrou dados no Supabase, mesclar com os dados da OpenAI
            if (supabaseData) {
                return NextResponse.json({
                    ...openaiData,
                    description: supabaseData.description,
                    is_active: supabaseData.is_active,
                    is_searchable: supabaseData.is_searchable,
                    created_by: supabaseData.created_by
                });
            }
        } catch (dbError) {
            console.warn('Erro ao interagir com o banco de dados:', dbError);
            // Continuar e retornar apenas os dados da OpenAI
        }

        return NextResponse.json(openaiData);
    } catch (error) {
        console.error('Erro ao obter vector_store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

// Modified PATCH function
export async function PATCH(request: Request) {
    try {
        // Extrair o ID diretamente da URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const vector_store_id = pathParts[pathParts.length - 1];

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID do vector_store é obrigatório' }, { status: 400 });
        }

        // Obter dados da requisição
        const requestData = await request.json();
        console.log('[DEBUG] PATCH - Atualizando vector store:', vector_store_id, 'com dados:', requestData);

        // Atualizar diretamente no Supabase - A OpenAI não tem endpoint para atualizar configurações
        try {
            // Verificar se o registro existe
            const { data: existingData, error: fetchError } = await supabase
                .from('vector_stores')
                .select('*')
                .eq('vector_store_id', vector_store_id)
                .single();

            if (fetchError) {
                console.error('[DEBUG] Erro ao verificar se existe no Supabase:', fetchError);

                // Se não existe, criar um novo registro
                if (fetchError.code === 'PGRST116') { // Código para "não encontrado"
                    console.log('[DEBUG] Vector store não encontrada. Criando novo registro.');

                    // Dados mínimos necessários para criar
                    const insertData = {
                        vector_store_id,
                        name: requestData.name || `Vector Store ${vector_store_id.substring(0, 8)}`,
                        description: requestData.description || null,
                        is_active: true,
                        is_searchable: requestData.is_searchable !== undefined ? requestData.is_searchable : true,
                        is_default: requestData.is_default || false
                    };

                    console.log('[DEBUG] Inserindo novo registro:', insertData);

                    const { data: newData, error: insertError } = await supabase
                        .from('vector_stores')
                        .insert(insertData)
                        .select('*')
                        .single();

                    if (insertError) {
                        console.error('[DEBUG] Erro ao criar novo registro:', insertError);
                        return NextResponse.json({
                            error: 'Falha ao criar registro no banco de dados',
                            details: insertError.message
                        }, { status: 500 });
                    }

                    console.log('[DEBUG] Novo registro criado com sucesso:', newData);
                    return NextResponse.json({
                        ...newData,
                        message: 'Registro criado com sucesso'
                    });
                }

                return NextResponse.json({
                    error: 'Erro ao verificar registro no banco de dados',
                    details: fetchError.message
                }, { status: 500 });
            }

            console.log('[DEBUG] Registro existente encontrado:', existingData);

            // Handle setting this vector store as default
            if (requestData.is_default === true) {
                try {
                    // First, unset any existing default vector store
                    const { error: resetError } = await supabase
                        .from('vector_stores')
                        .update({ is_default: false })
                        .neq('vector_store_id', vector_store_id);

                    if (resetError) {
                        console.error('[DEBUG] Erro ao resetar vector stores padrão:', resetError);
                        // Continue anyway to set this one as default
                    } else {
                        console.log('[DEBUG] Resetado outras vector stores padrão com sucesso');
                    }
                } catch (resetErr) {
                    console.error('[DEBUG] Exceção ao resetar vector stores padrão:', resetErr);
                    // Continue anyway
                }
            }

            // Preparar dados para atualização
            const updateData: VectorStoreUpdateData = {};

            // Adicionar campos a serem atualizados se presentes na requisição
            if (requestData.name !== undefined) updateData.name = requestData.name;
            if (requestData.description !== undefined) updateData.description = requestData.description;
            if (requestData.is_active !== undefined) updateData.is_active = requestData.is_active;
            if (requestData.is_searchable !== undefined) updateData.is_searchable = requestData.is_searchable;
            if (requestData.is_default !== undefined) updateData.is_default = requestData.is_default;

            console.log('[DEBUG] Dados para atualização:', updateData);

            // Se não houver nada para atualizar, retornar os dados existentes
            if (Object.keys(updateData).length === 0) {
                console.log('[DEBUG] Nenhum dado para atualizar. Retornando registro existente.');
                return NextResponse.json(existingData);
            }

            // Atualizar no Supabase
            const { data: updatedData, error: updateError } = await supabase
                .from('vector_stores')
                .update(updateData)
                .eq('vector_store_id', vector_store_id)
                .select('*')
                .single();

            if (updateError) {
                console.error('[DEBUG] Erro ao atualizar no Supabase:', updateError);
                return NextResponse.json({
                    error: 'Falha ao atualizar registro no banco de dados',
                    details: updateError.message
                }, { status: 500 });
            }

            console.log('[DEBUG] Atualização bem-sucedida:', updatedData);
            return NextResponse.json({
                ...updatedData,
                message: 'Registro atualizado com sucesso'
            });

        } catch (error) {
            console.error('[DEBUG] Exceção ao atualizar registro:', error);
            return NextResponse.json({
                error: 'Erro interno ao atualizar vector store',
                details: error instanceof Error ? error.message : String(error)
            }, { status: 500 });
        }
    } catch (error) {
        console.error('[DEBUG] Erro geral no endpoint PATCH:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        // Extrair o ID diretamente da URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const vector_store_id = pathParts[pathParts.length - 1];

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID do vector_store é obrigatório' }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        // 0. Primeiro, listar todos os arquivos associados à vector store
        console.log('[DEBUG] Listando arquivos da vector store antes de excluí-la:', vector_store_id);

        const filesResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files?limit=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        let filesToDelete: string[] = [];

        if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            if (filesData.data && Array.isArray(filesData.data)) {
                // Extrair os IDs dos arquivos usando a interface correta
                filesToDelete = filesData.data.map((file: OpenAIVectorStoreFile) => file.id);
                console.log(`[DEBUG] Encontrados ${filesToDelete.length} arquivos para excluir`);
            }
        } else {
            console.warn('[DEBUG] Não foi possível listar arquivos da vector store:', filesResponse.statusText);
            // Continuar mesmo com erro para tentar excluir a vector store
        }

        // 1. Deletar do Supabase para garantir que mesmo se a exclusão na OpenAI falhar,
        // o registro tenha sido removido do banco
        let supabaseDeleteSuccess = false;
        try {
            const { error: deleteError } = await supabase
                .from('vector_stores')
                .delete()
                .eq('vector_store_id', vector_store_id);

            if (deleteError) {
                console.error('[DEBUG] Erro ao excluir vector store do Supabase:', deleteError);
                // Continuamos mesmo com erro no Supabase
            } else {
                supabaseDeleteSuccess = true;
                console.log('[DEBUG] Vector store excluída com sucesso do Supabase');
            }
        } catch (dbError) {
            console.error('[DEBUG] Exceção ao excluir do Supabase:', dbError);
            // Continuamos mesmo com erro no banco
        }

        // 2. Remover arquivos da vector store e depois excluí-los do storage
        const deletedFiles: Array<{ fileId: string, removedFromVector: boolean, deletedFromStorage: boolean }> = [];

        if (filesToDelete.length > 0) {
            console.log(`[DEBUG] Iniciando exclusão de ${filesToDelete.length} arquivos`);

            // Processar cada arquivo associado à vector store
            for (const fileId of filesToDelete) {
                const fileResult = {
                    fileId,
                    removedFromVector: false,
                    deletedFromStorage: false
                };

                try {
                    // 2.1 Remover arquivo da vector store
                    const removeResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/files/${fileId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json',
                            'OpenAI-Beta': 'assistants=v2'
                        }
                    });

                    fileResult.removedFromVector = removeResponse.ok || removeResponse.status === 404;

                    // 2.2 Excluir arquivo do storage
                    const deleteFileResponse = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json',
                            'OpenAI-Beta': 'assistants=v2'
                        }
                    });

                    fileResult.deletedFromStorage = deleteFileResponse.ok || deleteFileResponse.status === 404;

                } catch (fileError) {
                    console.error(`[DEBUG] Erro ao excluir arquivo ${fileId}:`, fileError);
                }

                deletedFiles.push(fileResult);
            }

            console.log(`[DEBUG] Resumo da exclusão de arquivos:`, {
                total: deletedFiles.length,
                removedFromVector: deletedFiles.filter(f => f.removedFromVector).length,
                deletedFromStorage: deletedFiles.filter(f => f.deletedFromStorage).length
            });
        }

        // 3. Excluir a vector store da OpenAI
        console.log('[DEBUG] Enviando requisição DELETE para a API OpenAI para', vector_store_id);

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
            console.error('[DEBUG] Erro na resposta da API OpenAI:', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: errorText
            });

            return NextResponse.json(
                {
                    error: `Erro na API da OpenAI: ${openaiResponse.statusText}`,
                    details: errorText,
                    supabaseDeleteSuccess,
                    files: deletedFiles
                },
                { status: openaiResponse.status }
            );
        }

        // Para 404, indicamos sucesso mas com uma mensagem específica
        if (openaiResponse.status === 404) {
            console.log('[DEBUG] Vector store não encontrada na OpenAI (404), considerada como excluída');
            return NextResponse.json({
                success: true,
                message: 'Vector store não encontrada na API, mas considerada como excluída.',
                supabaseDeleteSuccess,
                files: {
                    total: deletedFiles.length,
                    deleted: deletedFiles.filter(f => f.deletedFromStorage).length,
                    details: deletedFiles
                }
            });
        }

        console.log('[DEBUG] Vector store excluída com sucesso da OpenAI');
        return NextResponse.json({
            success: true,
            message: 'Vector store excluída com sucesso' +
                (supabaseDeleteSuccess ? ' da API e do banco de dados' : ' da API (falha no banco de dados)'),
            files: {
                total: deletedFiles.length,
                deleted: deletedFiles.filter(f => f.deletedFromStorage).length,
                details: deletedFiles
            }
        });
    } catch (error) {
        console.error('[DEBUG] Erro geral no endpoint DELETE:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}