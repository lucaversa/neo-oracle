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

// Instruções para o chatbot - serão adicionadas ao início do input
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

==== HISTÓRICO DE CONVERSA ====
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
        let vectorStoreId;
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

        try {
            // Formatar o histórico de conversa em um texto
            let conversationText = INSTRUCTIONS;

            // Log do histórico de mensagens
            console.log("HISTÓRICO DE MENSAGENS:");
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                console.log(`[${i}] ${msg.type}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);

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

            console.log("Enviando requisição para a API Responses");
            console.log(`- Modelo: ${DEFAULT_MODEL}`);
            console.log(`- Vector Store ID: ${vectorStoreId || 'Nenhum'}`);
            console.log(`- Tamanho do input: ${conversationText.length} caracteres`);

            // Chamar a API Responses mantendo a estrutura existente
            const response = await openai.responses.create({
                model: DEFAULT_MODEL,
                input: conversationText,
                tools: tools
            });

            console.log("Resposta recebida da API Responses");

            // Extrair a resposta de texto
            let content = '';

            // Encontrar a mensagem no output
            const messageOutput = response.output.find(item => item.type === 'message');
            if (messageOutput && messageOutput.content) {
                // Pegar o primeiro item do tipo 'output_text'
                const textContent = messageOutput.content.find(c => c.type === 'output_text');
                if (textContent) {
                    content = textContent.text || '';
                    console.log("Resposta extraída (primeiros 100 caracteres):", content.substring(0, 100) + "...");
                }
            }

            // Usar mensagem de fallback se não conseguir extrair o conteúdo
            if (!content) {
                content = "Não foi possível gerar uma resposta.";
                console.log("Usando resposta fallback por não conseguir extrair conteúdo");
            }

            // Criar a mensagem de resposta do AI
            const aiMessage: ChatMessage = {
                type: 'ai',
                content: content
            };

            // Salvar a resposta da AI no banco de dados
            try {
                // Verificar se a sessão existe novamente (pode ter sido criada acima)
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

// Endpoint para verificação de saúde
export async function GET() {
    return Response.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
}