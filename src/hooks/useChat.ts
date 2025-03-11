import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/types/chat';

// Constante para o limite de mensagens humanas por chat
const MAX_HUMAN_MESSAGES_PER_SESSION = 10;

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
    sessionLimitReached: boolean;
}

export function useChat(userId?: string): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [activeSessions, setActiveSessions] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [sessionLimitReached, setSessionLimitReached] = useState<boolean>(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Função para carregar sessões únicas do Supabase
    const loadActiveSessions = async () => {
        try {
            console.log('Carregando sessões ativas...');
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('session_id');
            if (error) {
                console.error('Erro ao carregar sessões:', error);
                return [];
            }
            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhuma sessão encontrada');
                return [];
            }
            const uniqueSessionIds = new Set<string>();
            data.forEach(item => {
                if (item && item.session_id) {
                    uniqueSessionIds.add(item.session_id);
                }
            });
            const sessions = Array.from(uniqueSessionIds);
            console.log('Sessões únicas encontradas:', sessions);  // LOG AQUI
            return sessions;
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
            return [];
        }
    };

    // Contar mensagens humanas em uma sessão
    const countHumanMessages = async (sessionId: string): Promise<number> => {
        if (!sessionId) return 0;

        try {
            console.log('Contando mensagens humanas para sessão:', sessionId);

            // Buscar mensagens desta sessão primeiro
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('message')
                .eq('session_id', sessionId);

            if (error) {
                console.error('Erro na consulta de mensagens:', error);
                return 0;
            }

            if (!data || !Array.isArray(data)) {
                console.log('Nenhum dado retornado');
                return 0;
            }

            console.log(`Encontrados ${data.length} registros para contagem`);

            // Filtrar apenas mensagens válidas do tipo "human"
            const humanMessages = data.filter(item => {
                try {
                    return item &&
                        item.message &&
                        typeof item.message === 'object' &&
                        item.message.type === 'human';
                } catch {
                    return false;
                }
            });

            console.log(`Total de mensagens humanas: ${humanMessages.length}`);
            return humanMessages.length;
        } catch (err) {
            console.error('Erro ao contar mensagens:', err);
            return 0;
        }
    };

    // Carregar mensagens para uma sessão específica
    const loadMessagesForSession = async (sessionId: string) => {
        if (!sessionId) return;

        try {
            console.log('Carregando mensagens para sessão:', sessionId);

            // Buscar mensagens desta sessão
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('*')
                .eq('session_id', sessionId)
                .order('id');

            if (error) {
                console.error('Erro ao carregar mensagens:', error);
                return;
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhuma mensagem encontrada para a sessão');
                setMessages([]);
                setIsProcessing(false);
                return;
            }

            console.log(`Encontradas ${data.length} mensagens para a sessão`);

            // Filtrar apenas mensagens com estrutura válida
            const validMessages = data.filter(entry => {
                try {
                    return entry &&
                        entry.message &&
                        typeof entry.message === 'object' &&
                        typeof entry.message.type === 'string' &&
                        typeof entry.message.content === 'string';
                } catch {
                    return false;
                }
            });

            console.log(`${validMessages.length} mensagens têm estrutura válida`);

            // Extrair as mensagens para a UI
            const sessionMessages = validMessages.map(entry => entry.message);
            setMessages(sessionMessages);

            // Verificar estado "pensando"
            const humanMessages = validMessages.filter(entry => entry.message.type === 'human');
            const aiMessages = validMessages.filter(entry => entry.message.type === 'ai');

            // Verificar última interação
            if (humanMessages.length > 0 && aiMessages.length > 0) {
                const lastHumanIndex = humanMessages.length - 1;
                const lastAiIndex = aiMessages.length - 1;

                const lastHumanId = humanMessages[lastHumanIndex].id;
                const lastAiId = aiMessages[lastAiIndex].id;

                // Se o ID da última mensagem humana for maior que o ID da última mensagem AI,
                // significa que estamos esperando uma resposta
                const isWaitingForResponse = lastHumanId > lastAiId;
                setIsProcessing(isWaitingForResponse);

                console.log('Aguardando resposta do oráculo:', isWaitingForResponse);
            } else if (humanMessages.length > aiMessages.length) {
                // Se há mais mensagens humanas que AI, estamos esperando uma resposta
                setIsProcessing(true);
                console.log('Mais mensagens humanas que AI, aguardando resposta');
            } else {
                setIsProcessing(false);
                console.log('Não está aguardando resposta');
            }

            // Verificar limite de mensagens
            const humanCount = humanMessages.length;
            setSessionLimitReached(humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                console.log('Limite de mensagens atingido para esta sessão');
            }

        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
            setError('Falha ao carregar mensagens');
        }
    };

    // Inicializar o hook
    useEffect(() => {
        if (!userId) return;

        const initialize = async () => {
            try {
                console.log('Inicializando chat para usuário:', userId);
                setLoading(true);

                const sessions = await loadActiveSessions();

                if (sessions.length > 0) {
                    setActiveSessions(sessions);
                    // Verifica se já temos um sessionId válido, caso contrário usa o primeiro
                    if (!sessionId || !sessions.includes(sessionId)) {
                        const firstSession = sessions[0];
                        console.log('Usando sessão existente:', firstSession);
                        setSessionId(firstSession);
                        await loadMessagesForSession(firstSession);
                    } else {
                        await loadMessagesForSession(sessionId);
                    }
                } else {
                    const newSessionId = uuidv4();
                    console.log('Criando nova sessão:', newSessionId);
                    setSessionId(newSessionId);
                    setActiveSessions([newSessionId]);
                }
            } catch (err) {
                console.error('Erro ao inicializar chat:', err);
                setError('Falha ao inicializar o chat');
            } finally {
                setLoading(false);
            }
        };

        initialize();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                console.log('Polling interrompido');
            }
        };
    }, [userId]);

    // Configurar polling quando sessionId mudar
    useEffect(() => {
        if (!sessionId) return;

        console.log('ID da sessão ativa:', sessionId);

        // Carregar mensagens inicialmente
        loadMessagesForSession(sessionId);

        // Configurar polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(() => {
            loadMessagesForSession(sessionId);
        }, 1000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [sessionId]);

    // Mudar sessão
    const changeSession = (newSessionId: string) => {
        if (!newSessionId || newSessionId === sessionId) return;

        console.log('Mudando para sessão:', newSessionId);
        setSessionId(newSessionId);
        setError(null);
    };

    // Criar nova sessão
    const createNewSession = async (): Promise<string | null> => {
        try {
            const newSessionId = uuidv4();
            console.log('Criando nova sessão:', newSessionId);
            setSessionId(newSessionId);
            setMessages([]);
            setIsProcessing(false);
            setSessionLimitReached(false);
            setError(null);
            // Adicionar apenas se não existir
            setActiveSessions(prev => {
                if (prev.includes(newSessionId)) return prev;
                return [newSessionId, ...prev];
            });
            return newSessionId;
        } catch (err) {
            console.error('Erro ao criar nova sessão:', err);
            setError('Falha ao criar nova sessão');
            return null;
        }
    };

    // Enviar mensagem
    const sendMessage = async (content: string): Promise<void> => {
        if (!sessionId || !content.trim()) {
            console.log('Não é possível enviar: sessão ou conteúdo inválido');
            return;
        }

        if (isProcessing) {
            console.log('Já está processando, ignorando nova mensagem');
            return;
        }

        if (sessionLimitReached) {
            setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
            return;
        }

        try {
            // Verificar limite de mensagens novamente
            const humanCount = await countHumanMessages(sessionId);
            console.log(`Contagem de mensagens humanas: ${humanCount}/${MAX_HUMAN_MESSAGES_PER_SESSION}`);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                setSessionLimitReached(true);
                setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
                return;
            }

            setError(null);
            setIsProcessing(true);

            console.log('Enviando mensagem para sessão:', sessionId);

            // Criar objeto de mensagem
            const userMessage: ChatMessage = {
                type: 'human',
                content: content.trim()
            };

            // Atualizar UI imediatamente
            setMessages(prev => [...prev, userMessage]);

            // Enviar para o webhook do n8n
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
            if (!webhookUrl) {
                throw new Error('URL do webhook não configurada');
            }

            console.log('Enviando para webhook com sessionId:', sessionId);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatInput: content.trim(),
                    sessionId: sessionId,
                    userId: userId || 'anônimo'
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            // Não desativar isProcessing aqui - será desativado pelo polling quando a resposta chegar

        } catch (err: any) {
            console.error('Erro ao enviar mensagem:', err);
            setError(err.message || 'Falha ao enviar mensagem');
            setIsProcessing(false);

            // Remover a mensagem que adicionamos à UI em caso de erro
            setMessages(prev => prev.slice(0, -1));
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
        isProcessing,
        sessionLimitReached
    };
}