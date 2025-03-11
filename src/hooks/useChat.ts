import { useState, useEffect, useRef } from 'react';
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
    isProcessing: boolean;
}

export function useChat(userId?: string): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [activeSessions, setActiveSessions] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar sessões quando o userId mudar
    useEffect(() => {
        if (userId) {
            setLoading(true);
            loadActiveSessions().then(sessions => {
                if (sessions && sessions.length > 0) {
                    setSessionId(sessions[0]);
                } else {
                    createNewSession();
                }
                setLoading(false);
            }).catch(err => {
                console.error('Erro ao carregar sessões:', err);
                setLoading(false);
            });
        }
    }, [userId]);

    // Carregar mensagens e configurar polling quando o sessionId mudar
    useEffect(() => {
        if (sessionId) {
            console.log('Sessão atual:', sessionId);
            loadMessages(sessionId);

            // Configurar polling
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }

            pollingIntervalRef.current = setInterval(() => {
                loadMessages(sessionId);

                // Verificar se há novas mensagens do tipo 'ai' para desativar o indicador
                if (isProcessing) {
                    supabase
                        .from('n8n_chat_histories')
                        .select('*')
                        .eq('session_id', sessionId)
                        .order('id', { ascending: false })
                        .limit(1)
                        .then(({ data }) => {
                            if (data && data.length > 0 && data[0].message.type === 'ai') {
                                setIsProcessing(false);
                            }
                        });
                }
            }, 1000);

            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            };
        }
    }, [sessionId]);

    // Função para carregar mensagens
    const loadMessages = async (sid: string) => {
        try {
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('*')
                .eq('session_id', sid)
                .order('id', { ascending: true });

            if (error) {
                console.error('Erro ao carregar mensagens:', error);
                return;
            }

            if (data && data.length > 0) {
                const allMessages = data.map(entry => entry.message);
                setMessages(allMessages);
            }
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
        }
    };

    // Carregar sessões ativas
    const loadActiveSessions = async (): Promise<string[] | null> => {
        try {
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('session_id')
                .order('id', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
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

    // Enviar mensagem
    const sendMessage = async (content: string): Promise<void> => {
        try {
            if (!sessionId || !content.trim()) return;

            setIsProcessing(true);

            // Enviar para webhook do n8n
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

            if (webhookUrl) {
                const payload = {
                    chatInput: content,
                    sessionId: sessionId,
                    userId: userId || 'anônimo'
                };

                fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).then(() => {
                    // Após enviar, recarregar mensagens para mostrar a nova mensagem
                    loadMessages(sessionId);
                }).catch(err => {
                    console.error('Erro ao enviar para webhook:', err);
                    setIsProcessing(false);
                    setError('Falha ao comunicar com o servidor');
                });
            } else {
                setIsProcessing(false);
                setError('URL do webhook não configurada');
            }
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            setIsProcessing(false);
        }
    };

    // Mudar de sessão
    const changeSession = (newSessionId: string) => {
        if (newSessionId !== sessionId) {
            setSessionId(newSessionId);
        }
    };

    // Criar nova sessão
    const createNewSession = async (): Promise<string | null> => {
        try {
            const newSessionId = uuidv4();
            setSessionId(newSessionId);
            setMessages([]);
            setActiveSessions(prev => [newSessionId, ...prev]);
            return newSessionId;
        } catch (err) {
            console.error('Erro ao criar nova sessão:', err);
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
        activeSessions,
        isProcessing
    };
}