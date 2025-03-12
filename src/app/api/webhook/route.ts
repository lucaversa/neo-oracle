// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        console.log('Webhook recebeu:', JSON.stringify(data));

        // Esperamos receber do n8n a resposta do agente
        const { session_id, response, user_id, metadata } = data;

        // Remover espaços extras do session_id
        const trimmedSessionId = session_id ? session_id.trim() : null;

        if (!trimmedSessionId || !response) {
            console.error('Requisição inválida: session_id ou response ausentes');
            return NextResponse.json(
                { error: 'session_id e response são obrigatórios' },
                { status: 400 }
            );
        }

        console.log(`ID de sessão recebido: "${session_id}" -> Após trim: "${trimmedSessionId}"`);
        console.log(`Preparando para salvar resposta de tamanho ${response.length}`);

        // Criar a mensagem do assistente
        const aiMessage: ChatMessage = {
            type: 'ai',
            content: response
        };

        // Salvar resposta do agente no BD com o ID limpo
        const { data: savedData, error } = await supabase
            .from('n8n_chat_histories')
            .insert([{
                session_id: trimmedSessionId,
                message: aiMessage,
                metadata // opcional: armazenar metadados adicionais se fornecidos
            }])
            .select();

        if (error) {
            console.error('Erro ao salvar resposta do agente:', error);
            return NextResponse.json(
                { error: 'Falha ao salvar resposta', details: error.message },
                { status: 500 }
            );
        }

        console.log(`Resposta do n8n salva com sucesso para a sessão ${trimmedSessionId}`);
        console.log(`ID do registro salvo: ${savedData?.[0]?.id || 'N/A'}`);

        // NOVO: Verificar se existe registro na tabela user_chat_sessions, 
        // se não existir, criar um (para casos onde o n8n cria sessões)
        if (user_id) {
            try {
                // Verificar se já existe um registro para esta sessão e usuário
                const { data: existingSession, error: checkError } = await supabase
                    .from('user_chat_sessions')
                    .select('id')
                    .eq('session_id', trimmedSessionId)
                    .eq('user_id', user_id)
                    .limit(1);

                if (checkError) {
                    console.error('Erro ao verificar existência da sessão:', checkError);
                }
                // Se não existir, criar um novo registro
                else if (!existingSession || existingSession.length === 0) {
                    console.log(`Criando registro na tabela user_chat_sessions para sessão ${trimmedSessionId} e usuário ${user_id}`);

                    // Determinar título inicial
                    let initialTitle = 'Nova Conversa';

                    // Tenta obter a primeira mensagem do usuário para usar como título
                    try {
                        const { data: firstMessage } = await supabase
                            .from('n8n_chat_histories')
                            .select('message')
                            .eq('session_id', trimmedSessionId)
                            .order('id', { ascending: true })
                            .limit(1);

                        if (firstMessage &&
                            firstMessage.length > 0 &&
                            firstMessage[0].message.type === 'human') {
                            const content = firstMessage[0].message.content;
                            initialTitle = content.length > 30
                                ? content.substring(0, 30) + '...'
                                : content;
                        }
                    } catch (titleError) {
                        console.error('Erro ao obter primeira mensagem para título:', titleError);
                    }

                    // Inserir na tabela user_chat_sessions
                    const { error: insertError } = await supabase
                        .from('user_chat_sessions')
                        .insert({
                            session_id: trimmedSessionId,
                            user_id: user_id,
                            title: initialTitle
                        });

                    if (insertError) {
                        console.error('Erro ao criar registro na tabela user_chat_sessions:', insertError);
                    } else {
                        console.log('Registro criado com sucesso na tabela user_chat_sessions');
                    }
                } else {
                    // Atualizar o timestamp da sessão existente para marcar como recentemente usada
                    const { error: updateError } = await supabase
                        .from('user_chat_sessions')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('session_id', trimmedSessionId)
                        .eq('user_id', user_id);

                    if (updateError) {
                        console.error('Erro ao atualizar timestamp da sessão:', updateError);
                    }
                }
            } catch (sessionError) {
                console.error('Erro ao processar tabela user_chat_sessions:', sessionError);
                // Não falhar a operação principal se esta parte falhar
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Resposta processada com sucesso',
            record_id: savedData?.[0]?.id
        });
    } catch (error: any) {
        console.error('Erro no webhook:', error);
        return NextResponse.json(
            {
                error: 'Erro interno do servidor',
                details: error.message || 'Erro desconhecido'
            },
            { status: 500 }
        );
    }
}

// Adicionando suporte para verificação de saúde do endpoint
export async function GET(request: NextRequest) {
    return NextResponse.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
}