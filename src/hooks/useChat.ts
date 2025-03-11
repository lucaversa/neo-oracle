import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/types/chat';

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

    // Carregar sessões ativas únicas
    const loadActiveSessions = async () => {
        try {
            // Simplificando a consulta - apenas selecionar session_id sem ordenação
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('session_id');

            if (error) {
                console.error('Erro ao carregar sessões:', error);
                return [];
            }

            if (data && data.length > 0) {
                // Usar Set para obter sessões únicas
                const sessionsSet = new Set(data.map(item => item.session_id));
                const uniqueSessions = Array.from(sessionsSet);
                console.log('Sessões carregadas:', uniqueSessions);
                setActiveSessions(uniqueSessions);
                return uniqueSessions;
            }

            return [];
        } catch (err) {
            console.error('Erro na função loadActiveSessions:', err);
            return [];
        }
    };

    // Inicializar o hook
    useEffect(() => {
        if (!userId) return;

        const init = async () => {
            try {
                setLoading(true);
                const sessions = await loadActiveSessions();

                if (sessions.length > 0) {
                    // Utilizar a primeira sessão disponível
                    setSessionId(sessions[0]);
                } else {
                    // Criar uma nova sessão se não existir nenhuma
                    const newId = uuidv4();
                    setSessionId(newId);
                    setActiveSessions([newId]);
                }
            } catch (err) {
                console.error('Erro na inicialização do chat:', err);
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [userId]);

    // Carregar mensagens quando a sessão mudar
    useEffect(() => {
        if (!sessionId) return;

        const loadMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('n8n_chat_histories')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('id', { ascending: true });

                if (error) {
                    console.error('Erro ao carregar mensagens:', error);
                    return;
                }

                if (data && data.length > 0) {
                    const allMessages = data.map(entry => entry.message);
                    setMessages(allMessages);

                    // Verificar se ainda está processando
                    const lastMessage = data[data.length - 1];
                    if (lastMessage.message.type === 'human' && !data.some(entry =>
                        entry.message.type === 'ai' &&
                        entry.id > lastMessage.id)) {
                        setIsProcessing(true);
                    } else {
                        setIsProcessing(false);
                    }
                } else {
                    setMessages([]);
                    setIsProcessing(false);
                }
            } catch (err) {
                console.error('Erro na função loadMessages:', err);
            }
        };

        loadMessages();

        // Configurar polling para atualizações
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(() => {
            loadMessages();
        }, 1000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [sessionId]);

    // Enviar mensagem
    const sendMessage = async (content: string): Promise<void> => {
        if (!sessionId || !content.trim() || isProcessing) return;

        try {
            setIsProcessing(true);

            // Enviar para webhook do n8n
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

            if (!webhookUrl) {
                setError('URL do webhook não configurada');
                setIsProcessing(false);
                return;
            }

            // Criar objeto de mensagem para UI
            const userMessage: ChatMessage = {
                type: 'human',
                content: content
            };

            // Atualizar UI imediatamente
            setMessages(prev => [...prev, userMessage]);

            // Enviar para n8n
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatInput: content,
                    sessionId: sessionId,
                    userId: userId || 'anônimo'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na resposta do webhook: ${response.status}`);
            }

            // Não desativamos isProcessing - será desativado pelo polling quando a resposta chegar

        } catch (err: any) {
            console.error('Erro ao enviar mensagem:', err);
            setError('Falha ao enviar mensagem');
            setIsProcessing(false);
        }
    };

    // Mudar de sessão
    const changeSession = (newSessionId: string) => {
        if (newSessionId !== sessionId) {
            setSessionId(newSessionId);
            setMessages([]);
            setIsProcessing(false);
        }
    };

    // Criar nova sessão
    const createNewSession = async (): Promise<string | null> => {
        try {
            const newSessionId = uuidv4();
            setSessionId(newSessionId);
            setMessages([]);
            setIsProcessing(false);
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