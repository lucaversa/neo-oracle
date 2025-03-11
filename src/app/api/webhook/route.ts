// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from '@/types/chat';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        // Esperamos receber do n8n a resposta do agente
        const { session_id, response, user_id } = data;

        if (!session_id || !response) {
            return NextResponse.json(
                { error: 'session_id e response são obrigatórios' },
                { status: 400 }
            );
        }

        // Criar a mensagem do assistente
        const aiMessage: ChatMessage = {
            type: 'ai',
            content: response
        };

        // Salvar resposta do agente no BD
        const { error } = await supabase
            .from('n8n_chat_histories')
            .insert([{
                session_id,
                message: aiMessage
            }]);

        if (error) {
            console.error('Erro ao salvar resposta do agente:', error);
            return NextResponse.json(
                { error: 'Falha ao salvar resposta' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}