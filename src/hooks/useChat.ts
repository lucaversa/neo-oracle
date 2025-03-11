import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatHistoryEntry } from '@/types/chat';

interface UseChatReturn {
    messages: ChatMessage[];
    sessionId: string;
    loading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    changeSession: (newSessionId: string) => void;
    createNewSession: () => Promise<string | null>;
    activeSessions: string[];
}

export function useChat(userId?: string): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [activeSessions, setActiveSessions] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            // Carregar sessões ativas
            loadActiveSessions().then(sessions => {
                if (sessions && sessions.length > 0) {
                    // Se já existem sessões, use a mais recente
                    setSessionId(sessions[0]);
                } else {
                    // Criar uma nova sessão se não existir nenhuma
                    createNewSession();
                }
            });
        }
    }, [userId]);

    useEffect(() => {
        if (sessionId) {
            // Carregar mensagens da sessão atual
            loadMessages(sessionId);

            // Configurar subscription para novas mensagens
            const channel = supabase
                .channel(`chat_updates:${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'n8n_chat_histories',
                    filter: `session_id=eq.${sessionId}`
                }, (payload) => {
                    const entry = payload.new as ChatHistoryEntry;
                    if (entry && entry.message) {
                        setMessages(prevMessages => [...prevMessages, entry.message]);
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [sessionId]);

    const loadMessages = async (sid: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('*')
                .eq('session_id', sid)
                .order('id', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Extrair as mensagens de cada registro
                const allMessages = data.map((entry: ChatHistoryEntry) => entry.message);
                setMessages(allMessages);
            } else {
                setMessages([]);
            }
        } catch (err) {
            setError('Erro ao carregar mensagens');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadActiveSessions = async (): Promise<string[] | null> => {
        try {
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('session_id')
                .order('id', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                // Extrair session_ids únicos
                const uniqueSessions = [...new Set(data.map(item => item.session_id))];
                setActiveSessions(uniqueSessions);
                return uniqueSessions;
            }

            return [];
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
            return null;
        }
    };

    const sendMessage = async (content: string): Promise<void> => {
        try {
            if (!sessionId || !content.trim()) return;

            // Criar mensagem do usuário
            const userMessage: ChatMessage = {
                type: 'human',
                content: content
            };

            // Adicionar mensagem localmente para UI instantânea
            setMessages(prevMessages => [...prevMessages, userMessage]);

            // Salvar mensagem no Supabase
            const { error } = await supabase
                .from('n8n_chat_histories')
                .insert([{
                    session_id: sessionId,
                    message: userMessage
                }]);

            if (error) throw error;

            // Enviar para webhook do n8n
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
            if (webhookUrl) {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: content,
                        session_id: sessionId,
                        user_id: userId
                    }),
                });

                if (!response.ok) {
                    throw new Error('Falha ao comunicar com o webhook');
                }
            } else {
                console.warn('URL do webhook não configurada');
            }
        } catch (err) {
            setError('Erro ao enviar mensagem');
            console.error(err);
        }
    };

    const changeSession = (newSessionId: string) => {
        setSessionId(newSessionId);
    };

    const createNewSession = async (): Promise<string | null> => {
        try {
            // Criar um novo session_id único
            const newSessionId = uuidv4();

            // Criar uma mensagem inicial do sistema (opcional)
            const initialMessage: ChatMessage = {
                type: 'ai',
                content: 'Olá! Como posso ajudar você hoje?'
            };

            // Salvar no Supabase
            const { error } = await supabase
                .from('n8n_chat_histories')
                .insert([{
                    session_id: newSessionId,
                    message: initialMessage
                }]);

            if (error) throw error;

            // Atualizar estado local
            setSessionId(newSessionId);
            setMessages([initialMessage]);
            setActiveSessions(prev => [newSessionId, ...prev]);

            return newSessionId;
        } catch (err) {
            console.error('Erro ao criar nova sessão:', err);
            setError('Não foi possível criar uma nova conversa');
            return null;
        }
    };

    return {
        messages,
        sessionId,
        loading,
        error,
        sendMessage,
        changeSession,
        createNewSession,
        activeSessions
    };
}