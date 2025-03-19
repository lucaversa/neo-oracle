// src/app/api/admin/vector-stores/[vector_store_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

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
                        is_searchable: requestData.is_searchable !== undefined ? requestData.is_searchable : true
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

            // Preparar dados para atualização
            const updateData: any = {};

            // Adicionar campos a serem atualizados se presentes na requisição
            if (requestData.name !== undefined) updateData.name = requestData.name;
            if (requestData.description !== undefined) updateData.description = requestData.description;
            if (requestData.is_active !== undefined) updateData.is_active = requestData.is_active;
            if (requestData.is_searchable !== undefined) updateData.is_searchable = requestData.is_searchable;

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: { vector_store_id: string } }
) {
    try {
        const { vector_store_id } = params;

        if (!vector_store_id) {
            return NextResponse.json({ error: 'ID do vector_store é obrigatório' }, { status: 400 });
        }

        // 1. Primeiro excluir do Supabase para garantir que mesmo se a exclusão na OpenAI falhar,
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

        // 2. Agora excluir da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({
                error: 'API key não configurada',
                supabaseDeleteSuccess
            }, { status: 500 });
        }

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
                    supabaseDeleteSuccess
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
                supabaseDeleteSuccess
            });
        }

        console.log('[DEBUG] Vector store excluída com sucesso da OpenAI');
        return NextResponse.json({
            success: true,
            message: 'Vector store excluída com sucesso' + (supabaseDeleteSuccess ? ' da API e do banco de dados' : ' da API (falha no banco de dados)')
        });
    } catch (error) {
        console.error('[DEBUG] Erro geral no endpoint DELETE:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}