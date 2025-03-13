// src/app/api/openai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';
import OpenAI from 'openai';

// Inicializar o cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define o modelo padrão a ser usado
const DEFAULT_MODEL = "gpt-4o";

// Função para obter vector stores pesquisáveis
async function getSearchableVectorStoreIds(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('vector_stores')
            .select('vector_store_id')
            .eq('is_active', true)
            .eq('is_searchable', true);

        if (error) {
            console.error('Erro ao buscar vector stores:', error);
            return [];
        }

        return data ? data.map(store => store.vector_store_id) : [];
    } catch (error) {
        console.error('Erro ao buscar vector stores:', error);
        return [];
    }
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    try {
        // Extrair dados da requisição
        const {
            messages,
            sessionId,
            userId
        } = await request.json();

        // Validar dados de entrada
        if (!sessionId || !messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Parâmetros inválidos' },
                { status: 400 }
            );
        }

        // Obter a última mensagem do usuário como input para a API
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.type !== 'human') {
            return NextResponse.json(
                { error: 'A última mensagem deve ser do usuário' },
                { status: 400 }
            );
        }

        // Obter vector stores para pesquisa
        const searchVectorStoreIds = await getSearchableVectorStoreIds();

        // Salvar a mensagem do usuário no Supabase
        await supabase
            .from('n8n_chat_histories')
            .insert([{
                session_id: sessionId,
                message: lastUserMessage,
                metadata: { userId }
            }]);

        // Verificar se já existe um registro na tabela user_chat_sessions
        if (userId) {
            const { data: existingSession } = await supabase
                .from('user_chat_sessions')
                .select('id')
                .eq('session_id', sessionId)
                .eq('user_id', userId)
                .limit(1);

            // Se não existir, criar um
            if (!existingSession || existingSession.length === 0) {
                const initialTitle = lastUserMessage.content.length > 30
                    ? lastUserMessage.content.substring(0, 30) + '...'
                    : lastUserMessage.content;

                await supabase
                    .from('user_chat_sessions')
                    .insert({
                        session_id: sessionId,
                        user_id: userId,
                        title: initialTitle
                    });
            } else {
                // Atualizar o timestamp para mostrar atividade recente
                await supabase
                    .from('user_chat_sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('session_id', sessionId)
                    .eq('user_id', userId);
            }
        }

        // Criar um TransformStream para streaming
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        // Flag para indicar que começamos a receber dados
        let receivedData = false;
        let accumulatedContent = '';

        // Configurar a chamada para a API de Responses com file_search
        const responsePromise = openai.responses.create({
            model: DEFAULT_MODEL,
            input: lastUserMessage.content,
            tools: searchVectorStoreIds.length > 0 ? [{
                type: "file_search",
                vector_store_ids: searchVectorStoreIds
            }] : undefined,
        });

        // Processar a resposta quando ela estiver disponível
        responsePromise.then(async (response) => {
            receivedData = true;
            console.log("Resposta recebida da OpenAI:", response);

            try {
                // Extrair conteúdo da resposta
                let content = '';
                if (response.output && Array.isArray(response.output)) {
                    // Encontrar o item de tipo 'message' na saída
                    const messageOutput = response.output.find(item => item.type === 'message');
                    if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
                        // Extrair o texto do primeiro elemento de conteúdo do tipo 'output_text'
                        const textContent = messageOutput.content.find(c => c.type === 'output_text');
                        if (textContent) {
                            content = textContent.text || '';
                        }
                    }
                }

                // Se não conseguirmos extrair o conteúdo, usar uma mensagem de fallback
                if (!content) {
                    content = "Não foi possível gerar uma resposta com base nos documentos disponíveis.";
                }

                // Simular streaming enviando o conteúdo em partes
                const chunkSize = 10; // Caracteres por chunk
                for (let i = 0; i < content.length; i += chunkSize) {
                    const chunk = content.substring(i, i + chunkSize);
                    accumulatedContent += chunk;

                    // Enviar o chunk para o cliente
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));

                    // Pequena pausa para simular streaming
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // Salvar a resposta completa no Supabase
                const aiMessage: ChatMessage = {
                    type: 'ai',
                    content: accumulatedContent
                };

                await supabase
                    .from('n8n_chat_histories')
                    .insert([{
                        session_id: sessionId,
                        message: aiMessage,
                        metadata: { userId }
                    }]);

                // Indicar que a resposta foi concluída
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
            } catch (error) {
                console.error('Erro ao processar resposta da OpenAI:', error);
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
                await writer.close();
            }
        }).catch(async (error) => {
            console.error('Erro na chamada para OpenAI:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro ao consultar a OpenAI';
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
            await writer.close();
        });

        // Função auxiliar para verificar timeout
        const checkTimeout = async () => {
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
            if (!receivedData) {
                console.error('Timeout ao aguardar resposta da OpenAI');
                await writer.write(encoder.encode(`data: ${JSON.stringify({ error: "Timeout ao aguardar resposta" })}\n\n`));
                await writer.close();
            }
        };

        // Iniciar verificação de timeout
        checkTimeout();

        // Retornar o stream como resposta
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Erro ao processar requisição:', error);

        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// Endpoint para verificação de saúde
export async function GET() {
    return NextResponse.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
}