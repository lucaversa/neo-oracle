// src/app/api/openai/route.ts
import { NextRequest } from 'next/server'; // Corrigido para next/server
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import OpenAI from 'openai';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define o modelo padrão a ser usado
const DEFAULT_MODEL = "gpt-4o";

// Interface adicional para o annotation da OpenAI com citações de arquivo
interface FileCitationAnnotation {
    type: string;
    text: string;
    file_citation: {
        file_id: string;
        quote?: string;
    };
    start_index: number;
    end_index: number;
}

// Função para formatar mensagens mantendo o estado da conversação
function formatConversationContext(messages: ChatMessage[]): any {
    // Mantém apenas as últimas N mensagens para evitar exceder o context window
    const MAX_MESSAGES = 10;
    const recentMessages = messages.slice(-MAX_MESSAGES);

    // Cria uma estrutura que a API Responses entenda no formato de "conversation" (chat)
    return {
        type: "conversation",
        conversation: recentMessages.map(msg => ({
            role: msg.type === 'human' ? 'user' : 'assistant',
            content: msg.content
        }))
    };
}

export async function POST(request: NextRequest) {
    try {
        // Extrair dados da requisição
        const {
            messages,
            sessionId,
            userId,
            vectorStoreIds
        } = await request.json();

        // Validar dados de entrada
        if (!sessionId || !messages || !Array.isArray(messages) || messages.length === 0) {
            return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
        }

        // Obter a última mensagem do usuário
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.type !== 'human') {
            return Response.json({ error: 'A última mensagem deve ser do usuário' }, { status: 400 });
        }

        // Limpar o sessionId para garantir consistência
        const trimmedSessionId = sessionId.trim();
        console.log(`ID de sessão recebido: "${sessionId}" -> Após trim: "${trimmedSessionId}"`);

        try {
            // Salvar a mensagem do usuário no Supabase
            console.log("Salvando mensagem do usuário no histórico...");

            const { error: userMsgError } = await supabase
                .from('n8n_chat_histories')
                .insert([{
                    session_id: trimmedSessionId,
                    message: lastUserMessage,
                    metadata: { userId }
                }]);

            if (userMsgError) {
                console.error("Erro ao salvar mensagem do usuário:", userMsgError);
            }
        } catch (dbError) {
            console.error("Erro no banco de dados ao salvar mensagem do usuário:", dbError);
            // Continuar mesmo com erro para tentar obter a resposta
        }

        // Obter VectorStore IDs para pesquisa de arquivos
        let vectorStoreId;
        if (vectorStoreIds && vectorStoreIds.length > 0) {
            vectorStoreId = vectorStoreIds[0];
            console.log("Usando vector_store_id fornecido:", vectorStoreId);
        } else {
            // Buscar vector store padrão do banco de dados
            try {
                const { data, error } = await supabase
                    .from('vector_stores')
                    .select('vector_store_id')
                    .eq('is_active', true)
                    .eq('is_searchable', true)
                    .limit(1);

                if (error) {
                    console.error('Erro ao buscar vector store padrão:', error);
                } else if (data && data.length > 0) {
                    vectorStoreId = data[0].vector_store_id;
                    console.log("Usando vector_store_id do banco:", vectorStoreId);
                }
            } catch (e) {
                console.error('Erro ao buscar vector store padrão:', e);
            }
        }

        try {
            // Configurar a ferramenta file_search
            const fileSearchTool = vectorStoreId ? [{
                type: "file_search" as const,
                vector_store_ids: [vectorStoreId]
            }] : undefined;

            // Formatar context de conversação - mantém estado de mensagens anteriores
            const conversationContext = formatConversationContext(messages);

            console.log("Enviando requisição para a API de Responses...");

            // Chamar a API de Responses com o context da conversação
            const response = await openai.responses.create({
                model: DEFAULT_MODEL,
                input: conversationContext,
                tools: fileSearchTool
            });

            // Processar a resposta
            let content = '';
            let citations: string[] = [];

            if (response.output && Array.isArray(response.output)) {
                // Encontrar a mensagem de resposta
                const messageOutput = response.output.find(item => item.type === 'message');
                if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
                    // Processar o conteúdo da mensagem
                    for (const contentPart of messageOutput.content) {
                        if (contentPart.type === 'output_text') {
                            content = contentPart.text || '';

                            // Processar anotações/citações se existirem
                            if (contentPart.annotations && contentPart.annotations.length > 0) {
                                let annotationIndex = 0;
                                for (const annotation of contentPart.annotations) {
                                    // Verificar se é uma citação de arquivo e fazer o cast para o tipo correto
                                    if (annotation.type === 'file_citation') {
                                        // Fazer cast para nosso tipo personalizado
                                        const fileCitation = annotation as unknown as FileCitationAnnotation;

                                        // Substituir o texto da anotação por uma referência numerada
                                        content = content.replace(
                                            fileCitation.text,
                                            `[${annotationIndex}]`
                                        );

                                        // Obter o ID do arquivo citado
                                        const fileId = fileCitation.file_citation.file_id;

                                        // Buscar informações do arquivo na API da OpenAI
                                        try {
                                            const fileInfo = await openai.files.retrieve(fileId);
                                            citations.push(`[${annotationIndex}] ${fileInfo.filename}`);
                                        } catch (fileErr) {
                                            console.error("Erro ao buscar informações do arquivo:", fileErr);
                                            citations.push(`[${annotationIndex}] Arquivo ID: ${fileId}`);
                                        }

                                        annotationIndex++;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Se não conseguirmos extrair o conteúdo, usar uma mensagem de fallback
            if (!content) {
                content = "Não foi possível gerar uma resposta com base nos documentos disponíveis.";
            }

            // Adicionar as citações ao final se existirem
            if (citations.length > 0) {
                content += '\n\nReferências:\n' + citations.join('\n');
            }

            // Debug
            console.log("Conteúdo final processado:", content.substring(0, 100) + "...");

            // Criar a mensagem de resposta do AI
            const aiMessage: ChatMessage = {
                type: 'ai',
                content: content
            };

            try {
                // Salvar a resposta no banco de dados
                console.log("Salvando resposta AI no histórico...");

                const { error: aiMsgError } = await supabase
                    .from('n8n_chat_histories')
                    .insert([{
                        session_id: trimmedSessionId,
                        message: aiMessage,
                        metadata: { userId }
                    }]);

                if (aiMsgError) {
                    console.error("Erro ao salvar resposta AI:", aiMsgError);
                }
            } catch (dbError) {
                console.error("Erro no banco de dados ao salvar resposta AI:", dbError);
            }

            // Gerenciar sessão do usuário
            if (userId) {
                await manageUserSession(userId, trimmedSessionId, lastUserMessage.content);
            }

            // Retornar a resposta completa em JSON
            return Response.json({
                success: true,
                response: content
            });

        } catch (openAIError) {
            console.error('Erro na API da OpenAI:', openAIError);
            return Response.json({
                error: `Erro na API da OpenAI: ${openAIError instanceof Error ? openAIError.message : 'Erro desconhecido'}`
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';

        return Response.json({ error: errorMessage }, { status: 500 });
    }
}

// Função auxiliar para gerenciar a sessão do usuário
async function manageUserSession(userId: string, sessionId: string, initialMessage: string) {
    try {
        // Verificar se já existe um registro para esta sessão e usuário
        const { data: existingSession } = await supabase
            .from('user_chat_sessions')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .limit(1);

        // Se não existir, criar um novo registro
        if (!existingSession || existingSession.length === 0) {
            const initialTitle = initialMessage.length > 30
                ? initialMessage.substring(0, 30) + '...'
                : initialMessage;

            await supabase
                .from('user_chat_sessions')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    title: initialTitle
                });

            console.log('Nova sessão criada no user_chat_sessions:', sessionId);
        } else {
            // Atualizar o timestamp para mostrar atividade recente
            await supabase
                .from('user_chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('session_id', sessionId)
                .eq('user_id', userId);

            console.log('Sessão existente atualizada:', sessionId);
        }
    } catch (error) {
        console.error('Erro ao gerenciar sessão do usuário:', error);
    }
}

// Endpoint para verificação de saúde
export async function GET() {
    return Response.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
}