import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/types/chat';

// Constante para o limite de mensagens humanas por chat
const MAX_HUMAN_MESSAGES_PER_SESSION = 10;
// Intervalo de polling em milissegundos
const POLLING_INTERVAL = 2000;

interface UseChatReturn {
    messages: ChatMessage[];
    sessionId: string;
    loading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    changeSession: (newSessionId: string) => void;
    createNewSession: (specificId?: string) => Promise<string | null>;
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
    const lastMessageCountRef = useRef<number>(0);
    const messagesRef = useRef<ChatMessage[]>([]);
    const pendingMessageRef = useRef<ChatMessage | null>(null);
    const isCreatingSessionRef = useRef<boolean>(false);

    // Manter uma referência atualizada às mensagens para uso no polling
    useEffect(() => {
        messagesRef.current = messages;
        lastMessageCountRef.current = messages.length;
    }, [messages]);

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

            // Map para armazenar IDs de sessão sem espaços
            const uniqueSessionIds = new Map<string, string>();

            data.forEach(item => {
                if (item && item.session_id) {
                    const trimmedId = item.session_id.trim();
                    // Usar o ID limpo como chave para evitar duplicidades
                    uniqueSessionIds.set(trimmedId, trimmedId);
                }
            });

            const sessions = Array.from(uniqueSessionIds.values());
            console.log('Sessões únicas encontradas:', sessions);
            return sessions;
        } catch (err) {
            console.error('Erro ao carregar sessões:', err);
            return [];
        }
    };

    // Contar mensagens humanas em uma sessão
    const countHumanMessages = async (sessionId: string): Promise<number> => {
        if (!sessionId) return 0;

        // Garantir que o sessionId esteja limpo
        const trimmedSessionId = sessionId.trim();

        try {
            console.log('Contando mensagens humanas para sessão:', trimmedSessionId);

            // Utilizar LIKE para buscar tanto com quanto sem espaços
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('message')
                .or(`session_id.eq.${trimmedSessionId},session_id.eq. ${trimmedSessionId}`);

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

    // Verificar se a mensagem do usuário tem uma resposta correspondente
    const hasResponseForUserMessage = (messages: any[]): boolean => {
        // Verificar se há um número par de mensagens (cada humana tem uma resposta AI)
        if (messages.length % 2 === 0) return true;

        // Se tivermos uma mensagem pendente no ref, precisamos verificar se ela foi respondida
        if (pendingMessageRef.current) {
            // Conta as mensagens do tipo humano e ai
            const humanMessages = messages.filter(m => m.message.type === 'human');
            const aiMessages = messages.filter(m => m.message.type === 'ai');

            // Se temos o mesmo número de mensagens humanas e AI, todas foram respondidas
            return humanMessages.length === aiMessages.length;
        }

        return false;
    };

    // Carregar mensagens para uma sessão específica (memoizado)
    const loadMessagesForSession = useCallback(async (sessionId: string) => {
        if (!sessionId) return;

        // Se estamos criando uma nova sessão, não carregar mensagens
        if (isCreatingSessionRef.current) {
            console.log('Pulando carregamento durante criação de nova sessão');
            return;
        }

        // Garantir que o sessionId esteja limpo
        const trimmedSessionId = sessionId.trim();

        try {
            // Buscar mensagens usando OR para encontrar tanto com quanto sem espaços
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('*')
                .or(`session_id.eq.${trimmedSessionId},session_id.eq. ${trimmedSessionId}`)
                .order('id');

            if (error) {
                console.error('Erro ao carregar mensagens:', error);
                return;
            }

            if (!data || !Array.isArray(data)) {
                console.log('Nenhum dado retornado');
                return;
            }

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

            // Se não houver mensagens válidas
            if (validMessages.length === 0) {
                console.log('Nenhuma mensagem válida encontrada para a sessão');
                // Não limpar mensagens se for uma nova sessão (sem mensagens)
                if (!isCreatingSessionRef.current) {
                    setMessages([]);
                }
                setIsProcessing(false);
                return;
            }

            // Extrair as mensagens para a UI
            const sessionMessages = validMessages.map(entry => entry.message as ChatMessage);

            // Verificar se temos novas mensagens
            if (sessionMessages.length !== lastMessageCountRef.current ||
                JSON.stringify(sessionMessages) !== JSON.stringify(messagesRef.current)) {
                console.log(`Atualizando ${sessionMessages.length} mensagens (antes: ${lastMessageCountRef.current})`);

                // Se tivermos uma mensagem pendente e ela já estiver no banco, podemos remover a pendente
                if (pendingMessageRef.current) {
                    // Verificar se a mensagem pendente já está incluída no resultado do banco
                    const pendingContent = pendingMessageRef.current.content;
                    const pendingExists = sessionMessages.some(
                        msg => msg.type === 'human' && msg.content === pendingContent
                    );

                    if (pendingExists) {
                        console.log('Mensagem pendente encontrada no banco, removendo referência local');
                        pendingMessageRef.current = null;
                    }
                }

                // Atualizar as mensagens na UI
                setMessages(sessionMessages);
            }

            // Verificar estado "pensando"
            // Se houver uma mensagem pendente OU se o número de mensagens humanas > AI, estamos processando
            const isWaitingForResponse = pendingMessageRef.current !== null || !hasResponseForUserMessage(validMessages);

            if (isWaitingForResponse !== isProcessing) {
                console.log('Atualizando estado de processamento:', isWaitingForResponse);
                setIsProcessing(isWaitingForResponse);
            }

            // Contar mensagens humanas para verificar limite
            const humanMessages = validMessages.filter(entry => entry.message.type === 'human');
            const humanCount = humanMessages.length;
            const limitReached = humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION;

            if (limitReached !== sessionLimitReached) {
                setSessionLimitReached(limitReached);
                if (limitReached) {
                    console.log('Limite de mensagens atingido para esta sessão');
                }
            }

        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
            // Não definir erro aqui, apenas logar, para não interromper o polling
        }
    }, [isProcessing, sessionLimitReached]);

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
                    if (!sessionId || !sessions.includes(sessionId.trim())) {
                        const firstSession = sessions[0];
                        console.log('Usando sessão existente:', firstSession);
                        setSessionId(firstSession);
                        await loadMessagesForSession(firstSession);
                    } else {
                        await loadMessagesForSession(sessionId);
                    }
                } else {
                    const newSessionId = uuidv4();
                    console.log('Criando nova sessão inicial:', newSessionId);
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
    }, [userId, sessionId, loadMessagesForSession]);

    // Configurar polling quando sessionId mudar
    useEffect(() => {
        if (!sessionId) return;

        // Se estamos criando uma nova sessão, ignorar esta mudança
        if (isCreatingSessionRef.current) {
            console.log('Pulando configuração de polling durante criação de nova sessão');
            return;
        }

        console.log('ID da sessão ativa:', sessionId);

        // Carregar mensagens inicialmente
        loadMessagesForSession(sessionId);

        // Configurar polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        console.log(`Iniciando polling a cada ${POLLING_INTERVAL}ms`);
        pollingIntervalRef.current = setInterval(() => {
            if (!isCreatingSessionRef.current) {
                loadMessagesForSession(sessionId);
            }
        }, POLLING_INTERVAL);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                console.log('Polling interrompido ao mudar de sessão');
            }
        };
    }, [sessionId, loadMessagesForSession]);

    // Mudar sessão
    const changeSession = (newSessionId: string) => {
        if (!newSessionId || newSessionId.trim() === sessionId.trim()) return;

        // Limpar qualquer mensagem pendente ao mudar de sessão
        pendingMessageRef.current = null;

        // Garantir que o novo sessionId esteja limpo
        const trimmedNewSessionId = newSessionId.trim();
        console.log('Mudando para sessão:', trimmedNewSessionId);
        setSessionId(trimmedNewSessionId);
        setError(null);
    };

    // Criar nova sessão - MODIFICADA para aceitar um ID específico
    const createNewSession = async (specificId?: string): Promise<string | null> => {
        try {
            // Se já estiver criando, evitar duplicação
            if (isCreatingSessionRef.current) {
                console.log('Já está criando uma nova sessão, ignorando');
                return null;
            }

            isCreatingSessionRef.current = true;
            console.log('Iniciando criação de nova sessão...');

            // Parar o polling temporariamente
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                console.log('Polling interrompido durante criação de nova sessão');
            }

            // Limpar qualquer mensagem pendente
            pendingMessageRef.current = null;

            // Usar o ID específico se fornecido, ou gerar um novo
            const newSessionId = specificId ? specificId : uuidv4();
            console.log('ID da nova sessão:', newSessionId);

            // Limpar os estados em ordem específica
            setSessionLimitReached(false);
            setIsProcessing(false);
            setError(null);
            setMessages([]);

            // Importante: Primeiro atualizar a lista de sessões ativas
            const updatedSessions = [newSessionId, ...activeSessions.filter(id => id !== newSessionId)];
            setActiveSessions(updatedSessions);
            console.log('Lista de sessões atualizada:', updatedSessions);

            // Depois atualizar o ID da sessão atual
            setSessionId(newSessionId);
            console.log('ID da sessão atual atualizado para:', newSessionId);

            // Reiniciar o polling após uma pausa curta
            setTimeout(() => {
                console.log(`Reiniciando polling após criação de nova sessão`);
                pollingIntervalRef.current = setInterval(() => {
                    if (!isCreatingSessionRef.current) {
                        loadMessagesForSession(newSessionId);
                    }
                }, POLLING_INTERVAL);

                // Permitir que novas sessões sejam criadas novamente
                isCreatingSessionRef.current = false;
            }, 500);

            console.log('Nova sessão criada com sucesso:', newSessionId);
            return newSessionId;
        } catch (err) {
            console.error('Erro ao criar nova sessão:', err);
            setError('Falha ao criar nova sessão');
            isCreatingSessionRef.current = false;
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
            // Garantir que o sessionId esteja limpo
            const trimmedSessionId = sessionId.trim();
            console.log(`Enviando mensagem para sessionId: ${trimmedSessionId}`);

            // Verificar limite de mensagens novamente
            const humanCount = await countHumanMessages(trimmedSessionId);
            console.log(`Contagem de mensagens humanas: ${humanCount}/${MAX_HUMAN_MESSAGES_PER_SESSION}`);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                setSessionLimitReached(true);
                setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
                return;
            }

            setError(null);
            setIsProcessing(true);

            console.log('Enviando mensagem para sessão:', trimmedSessionId);

            // Criar objeto de mensagem do usuário
            const userMessage: ChatMessage = {
                type: 'human',
                content: content.trim()
            };

            // Armazenar a mensagem pendente para referência
            pendingMessageRef.current = userMessage;

            // Atualizar UI imediatamente (apenas localmente)
            setMessages(prev => [...prev, userMessage]);

            // NÃO salvar no Supabase diretamente - apenas enviar para o webhook do n8n
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
            if (!webhookUrl) {
                throw new Error('URL do webhook não configurada');
            }

            console.log('Enviando para webhook com sessionId:', trimmedSessionId);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatInput: content.trim(),
                    sessionId: trimmedSessionId, // Enviar sessionId limpo
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

            // Em caso de erro, remover a mensagem pendente
            pendingMessageRef.current = null;

            // Remover a mensagem local que adicionamos
            setMessages(prev => {
                // Se temos mensagens e a última é do tipo human, remover
                if (prev.length > 0 && prev[prev.length - 1].type === 'human') {
                    return prev.slice(0, -1);
                }
                return prev;
            });
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