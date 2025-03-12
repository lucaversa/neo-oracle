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