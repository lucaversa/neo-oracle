// src/app/api/openai/route.ts
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import OpenAI from 'openai';

// Configurar o runtime para Edge
export const runtime = 'edge';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define o modelo padrão a ser usado
const DEFAULT_MODEL = "o3-mini";

// Instruções para o chatbot - serão passadas como instructions parameter
const INSTRUCTIONS = `
Você é o Oráculo, um assistente de IA sofisticado.

Principais características:
- Fornece respostas precisas, úteis e diretas
- Personalidade amigável e atenciosa
- Especialista em consulta e análise de documentos
- Capaz de encontrar informações específicas nos documentos da base de conhecimento
- Mantém um tom profissional, mas acessível

Quando não souber a resposta ou não encontrar as informações nos documentos, seja honesto e diga que não sabe,
em vez de tentar inventar uma resposta apenas para agradar ao usuário.

Seja objetivo. Responda fielmente aos documentos analisados sem criar analogias ou alongar desnecessariamente sua resposta.

Ao citar informações de documentos, SEMPRE indique de qual documento a informação foi extraída.
`;

// Implementar função para salvar no banco de dados de forma assíncrona
const saveMessageToDatabase = async (trimmedSessionId: string, userId: string, aiMessage: ChatMessage) => {
    try {
        // Verificar se a sessão existe
        const { data: sessionData, error: sessionError } = await supabase
            .from('user_chat_sessions')
            .select('messages')
            .eq('session_id', trimmedSessionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (!sessionError && sessionData) {
            // Atualizar sessão existente com a resposta da AI
            const existingMessages = sessionData.messages || [];
            const updatedMessages = [...existingMessages, aiMessage];

            await supabase
                .from('user_chat_sessions')
                .update({
                    messages: updatedMessages,
                    updated_at: new Date().toISOString()
                })
                .eq('session_id', trimmedSessionId)
                .eq('user_id', userId);

            console.log(`Mensagem AI salva no banco para a sessão ${trimmedSessionId}`);
        } else {
            console.error('Sessão não encontrada para salvar resposta AI');
        }
    } catch (dbError) {
        console.error("Erro no banco de dados ao salvar resposta AI:", dbError);
    }
};

export async function POST(request: NextRequest) {
    try {
        // Verificar se o cliente OpenAI está disponível
        if (!openai) {
            return new Response(JSON.stringify({ error: 'API OpenAI não configurada' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verificar se o cliente Supabase está disponível
        if (!supabase) {
            return new Response(JSON.stringify({ error: 'Supabase não configurado' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Extrair dados da requisição
        const {
            messages,
            sessionId,
            userId,
            vectorStoreIds
        } = await request.json();

        // Validar dados de entrada
        if (!sessionId || !messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Obter a última mensagem do usuário
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.type !== 'human') {
            return new Response(JSON.stringify({ error: 'A última mensagem deve ser do usuário' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Limpar o sessionId para garantir consistência
        const trimmedSessionId = sessionId.trim();

        // Verificar se a sessão existe e salvar a mensagem
        try {
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

                await supabase
                    .from('user_chat_sessions')
                    .insert({
                        session_id: trimmedSessionId,
                        user_id: userId,
                        title: initialTitle,
                        messages: [lastUserMessage] // Iniciar com a mensagem do usuário
                    });
            } else {
                // Adicionar a mensagem do usuário à sessão existente
                const existingMessages = existingSession.messages || [];
                const updatedMessages = [...existingMessages, lastUserMessage];

                await supabase
                    .from('user_chat_sessions')
                    .update({
                        messages: updatedMessages,
                        updated_at: new Date().toISOString()
                    })
                    .eq('session_id', trimmedSessionId)
                    .eq('user_id', userId);
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

        // Criar um transformador para o stream
        const transformer = new TransformStream();
        const writer = transformer.writable.getWriter();
        const encoder = new TextEncoder();

        // Criar uma Promise para resolver quando terminarmos o processamento
        const processStream = async () => {
            try {
                // Preparar o contexto da conversa
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

                // Chamar a API Responses com stream=True
                const stream = await openai.responses.create({
                    model: DEFAULT_MODEL,
                    input: conversationText,
                    instructions: INSTRUCTIONS, // Usando o parâmetro instructions para as instruções
                    tools: tools,
                    stream: true // Habilitando streaming
                });

                let fullContent = '';
                const aiMessage: ChatMessage = {
                    type: 'ai',
                    content: ''
                };

                // Processar os eventos do stream
                for await (const event of stream) {
                    // Verificar e processar eventos específicos
                    if ('type' in event) {
                        // Evento de delta de texto - principal responsável por enviar o texto incrementalmente
                        if (event.type === 'response.output_text.delta') {
                            if ('delta' in event) {
                                const text = event.delta || '';
                                fullContent += text;

                                // Enviar o delta para o cliente
                                const data = JSON.stringify({ text, full: fullContent });
                                await writer.write(encoder.encode(`data: ${data}\n\n`));
                            }
                        }
                        // Texto completo ao finalizar
                        else if (event.type === 'response.output_text.done') {
                            if (event.text) {
                                fullContent = event.text;
                                // Enviar o texto completo
                                const data = JSON.stringify({ full: fullContent });
                                await writer.write(encoder.encode(`data: ${data}\n\n`));
                            }
                            await writer.write(encoder.encode(`data: Done\n\n`));
                        }
                        // Evento de conclusão
                        else if (event.type === 'response.completed') {
                            await writer.write(encoder.encode(`data: Done\n\n`));
                        }
                    }
                }

                // Completar a mensagem do AI
                aiMessage.content = fullContent;

                // Salvar a resposta completa no banco de forma assíncrona
                // em vez de aguardar o salvamento, vamos continuar o processamento
                if (fullContent.length > 0) {
                    // Não aguardamos a Promise para não atrasar o stream
                    saveMessageToDatabase(trimmedSessionId, userId, aiMessage)
                        .catch(err => console.error("Erro ao salvar mensagem:", err));
                }

                // Finalizar o stream
                await writer.close();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                await writer.write(
                    encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`)
                );
                await writer.close();
            }
        };

        // Iniciar o processamento em segundo plano
        processStream();

        // Retornar imediatamente o stream
        return new Response(transformer.readable, {
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

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Endpoint para verificação de saúde
export async function GET() {
    return new Response(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString()
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}