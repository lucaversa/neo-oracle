// src/app/api/openai/route.ts
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import OpenAI from 'openai';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define o modelo padrão a ser usado
const DEFAULT_MODEL = "o3-mini";

// Instruções para o chatbot - serão passadas como instructions parameter
const INSTRUCTIONS = `
Você é o Oráculo, um assistente de IA sofisticado e amigável.

Principais características:
- Fornece respostas precisas, úteis e diretas
- Personalidade amigável e atenciosa
- Especialista em consulta e análise de documentos
- Capaz de encontrar informações específicas nos documentos da base de conhecimento
- Mantém um tom profissional, mas acessível
- Apresente-se, caso seja sua primeira interação

Quando não souber a resposta ou não encontrar as informações nos documentos, seja honesto e diga que não sabe,
em vez de tentar inventar uma resposta apenas para agradar ao usuário.

Ao citar informações de documentos, indique de qual documento a informação foi extraída.
`;

export async function POST(request: NextRequest) {
    try {
        // Extrair dados da requisição
        const {
            messages,
            sessionId,
            userId,
            vectorStoreIds
        } = await request.json();

        // Log dos dados da requisição
        console.log('Requisição recebida:');
        console.log(`- SessionID: ${sessionId}`);
        console.log(`- UserID: ${userId}`);
        console.log(`- Total de mensagens: ${messages.length}`);

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

        try {
            // Salvar a mensagem do usuário no Supabase
            console.log("Salvando mensagem do usuário no histórico...");

            // Verificar se a sessão existe
            const { data: existingSession, error: checkError } = await supabase
                .from('user_chat_sessions')
                .select('id, messages, title')
                .eq('session_id', trimmedSessionId)
                .eq('user_id', userId)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 é "não encontrado"
                console.error('Erro ao verificar sessão:', checkError);
            }

            if (!existingSession) {
                // Criar nova sessão com a mensagem do usuário
                const initialTitle = lastUserMessage.content.length > 30
                    ? lastUserMessage.content.substring(0, 30) + '...'
                    : lastUserMessage.content;

                const { error: insertError } = await supabase
                    .from('user_chat_sessions')
                    .insert({
                        session_id: trimmedSessionId,
                        user_id: userId,
                        title: initialTitle,
                        messages: [lastUserMessage] // Iniciar com a mensagem do usuário
                    });

                if (insertError) {
                    console.error("Erro ao criar nova sessão:", insertError);
                } else {
                    console.log('Nova sessão criada com sucesso');
                }
            } else {
                // Adicionar a mensagem do usuário à sessão existente
                const existingMessages = existingSession.messages || [];
                const updatedMessages = [...existingMessages, lastUserMessage];

                const { error: updateError } = await supabase
                    .from('user_chat_sessions')
                    .update({
                        messages: updatedMessages,
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', trimmedSessionId)
                    .eq('user_id', userId);

                if (updateError) {
                    console.error("Erro ao atualizar sessão com mensagem do usuário:", updateError);
                } else {
                    console.log('Mensagem do usuário adicionada à sessão existente');
                }
            }
        } catch (dbError) {
            console.error("Erro no banco de dados ao salvar mensagem do usuário:", dbError);
            // Continuar mesmo com erro para tentar obter a resposta
        }

        // Obter VectorStore ID para pesquisa
        let vectorStoreId: string | undefined;
        if (vectorStoreIds && vectorStoreIds.length > 0) {
            vectorStoreId = vectorStoreIds[0];
        } else {
            // Buscar vector store padrão do banco de dados
            try {
                const { data, error } = await supabase
                    .from('vector_stores')
                    .select('vector_store_id')
                    .eq('is_active', true)
                    .eq('is_searchable', true)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    vectorStoreId = data[0].vector_store_id;
                }
            } catch (e) {
                console.error('Erro ao buscar vector store padrão:', e);
            }
        }

        // Criar um stream de resposta
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Preparar o contexto da conversa (agora sem as instruções, que irão no parâmetro específico)
                    let conversationText = "";

                    // Adicionar histórico de conversas
                    for (let i = 0; i < messages.length; i++) {
                        const msg = messages[i];
                        // Adicionar à string de conversa
                        if (msg.type === 'human') {
                            conversationText += `\nUsuário: ${msg.content}\n`;
                        } else {
                            conversationText += `\nOráculo: ${msg.content}\n`;
                        }
                    }

                    // Configurar a ferramenta file_search se tiver um vector store
                    const tools = vectorStoreId ? [{
                        type: "file_search" as const,
                        vector_store_ids: [vectorStoreId]
                    }] : undefined;

                    // Log detalhado do input para a API
                    console.log("\n========== INPUT COMPLETO PARA API ==========");
                    console.log(conversationText);
                    console.log("=============================================\n");

                    console.log("Enviando requisição para a API Responses com streaming");
                    console.log(`- Modelo: ${DEFAULT_MODEL}`);
                    console.log(`- Vector Store ID: ${vectorStoreId || 'Nenhum'}`);
                    console.log(`- Tamanho do input: ${conversationText.length} caracteres`);

                    // Chamar a API Responses com stream=True
                    const stream = await openai.responses.create({
                        model: DEFAULT_MODEL,
                        input: conversationText,
                        instructions: INSTRUCTIONS, // Usando o parâmetro instructions para as instruções
                        tools: tools,
                        stream: true // Habilitando streaming
                    });

                    let fullContent = '';
                    let aiMessage: ChatMessage = {
                        type: 'ai',
                        content: ''
                    };

                    // Processar os eventos do stream conforme o formato correto da OpenAI
                    for await (const event of stream) {
                        // Para depuração
                        console.log('Evento recebido:', event);

                        // Verificar e processar eventos específicos
                        if ('type' in event) {
                            // Evento de delta de texto - principal responsável por enviar o texto incrementalmente
                            if (event.type === 'response.output_text.delta') {
                                if ('delta' in event) {
                                    const text = event.delta || '';
                                    fullContent += text;

                                    // Enviar o delta para o cliente
                                    const data = JSON.stringify({ text, full: fullContent });
                                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                                }
                            }
                            // Texto completo ao finalizar
                            else if (event.type === 'response.output_text.done') {
                                if (event.text) {
                                    fullContent = event.text;
                                    // Enviar o texto completo
                                    const data = JSON.stringify({ full: fullContent });
                                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                                }
                                controller.enqueue(encoder.encode(`data: Done\n\n`));
                            }
                            // Evento de conclusão
                            else if (event.type === 'response.completed') {
                                controller.enqueue(encoder.encode(`data: Done\n\n`));
                            }
                            // Outros eventos relevantes podem ser processados aqui
                        }
                    }

                    // Completar a mensagem do AI
                    aiMessage.content = fullContent;

                    // Salvar a resposta completa no banco
                    try {
                        // Verificar se a sessão existe novamente
                        const { data: sessionData, error: sessionError } = await supabase
                            .from('user_chat_sessions')
                            .select('messages')
                            .eq('session_id', trimmedSessionId)
                            .eq('user_id', userId)
                            .maybeSingle();

                        if (sessionError) {
                            console.error("Erro ao buscar sessão para salvar resposta AI:", sessionError);
                            throw sessionError;
                        }

                        if (sessionData) {
                            // Atualizar sessão existente com a resposta da AI
                            const existingMessages = sessionData.messages || [];
                            const updatedMessages = [...existingMessages, aiMessage];

                            const { error: updateError } = await supabase
                                .from('user_chat_sessions')
                                .update({
                                    messages: updatedMessages,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('session_id', trimmedSessionId)
                                .eq('user_id', userId);

                            if (updateError) {
                                console.error("Erro ao atualizar sessão com resposta AI:", updateError);
                            } else {
                                console.log('Resposta AI salva com sucesso');
                            }
                        } else {
                            console.error("Sessão não encontrada para salvar resposta AI");
                        }
                    } catch (dbError) {
                        console.error("Erro no banco de dados ao salvar resposta AI:", dbError);
                    }

                    // Finalizar o stream
                    controller.close();
                } catch (error) {
                    console.error('Erro durante o streaming:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`));
                    controller.close();
                }
            }
        });

        // Retornar a resposta com o stream
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        });

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';

        return Response.json({ error: errorMessage }, { status: 500 });
    }
}

// Endpoint para verificação de saúde
export async function GET() {
    return Response.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
}