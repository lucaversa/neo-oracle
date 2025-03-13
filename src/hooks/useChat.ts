// src/hooks/useChat.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, UserChatSession, SessionInfo } from '@/types/chat';

// Constante para o limite de mensagens humanas por chat
const MAX_HUMAN_MESSAGES_PER_SESSION = 20;

interface UseChatReturn {
    messages: ChatMessage[];
    sessionId: string;
    loading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    changeSession: (newSessionId: string) => void;
    createNewSession: (specificId?: string) => Promise<string | null>;
    activeSessions: string[];
    sessionInfos: Map<string, SessionInfo>;
    isProcessing: boolean;
    sessionLimitReached: boolean;
    isNewConversation: boolean;
    lastMessageTimestamp: number;
    resetProcessingState: () => void;
    updateLastMessageTimestamp: () => void;
    renameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
    deleteSession: (sessionId: string) => Promise<boolean>;
    hasEmptyChat: boolean;
    streamingContent: string;
    searchableVectorStores: string[];
    setSearchableVectorStores: (ids: string[]) => void;
}

export function useChat(userId?: string): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [activeSessions, setActiveSessions] = useState<string[]>([]);
    const [sessionInfos, setSessionInfos] = useState<Map<string, SessionInfo>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [sessionLimitReached, setSessionLimitReached] = useState<boolean>(false);
    const [isNewConversation, setIsNewConversation] = useState<boolean>(true);
    const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
    const [hasEmptyChat, setHasEmptyChat] = useState<boolean>(false);
    const [streamingContent, setStreamingContent] = useState<string>('');
    const [searchableVectorStores, setSearchableVectorStores] = useState<string[]>([]);

    const eventSourceRef = useRef<EventSource | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const isCreatingSessionRef = useRef<boolean>(false);

    // Gerenciador centralizado de sessões para evitar condições de corrida
    const sessionManager = useRef({
        currentSessionId: '', // ID da sessão atual
        isChangingSession: false, // Flag para indicar que estamos mudando de sessão
    }).current;

    // Manter uma referência atualizada às mensagens
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Carregar vector stores pesquisáveis quando o userId mudar
    useEffect(() => {
        const loadSearchableVectorStores = async () => {
            try {
                const response = await fetch(`/api/openai/search-config`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.searchableIds && Array.isArray(data.searchableIds)) {
                        setSearchableVectorStores(data.searchableIds);
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar vector stores pesquisáveis:', error);
            }
        };

        loadSearchableVectorStores();
    }, []);

    // Função para resetar o estado de processamento manualmente
    const resetProcessingState = useCallback(() => {
        console.log('Resetando estado de processamento manualmente');
        setIsProcessing(false);
        setStreamingContent('');

        // Fechar EventSource se estiver aberto
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    // Função para atualizar o timestamp da última mensagem
    const updateLastMessageTimestamp = useCallback(() => {
        console.log('Atualizando timestamp da última mensagem');
        setLastMessageTimestamp(Date.now());
    }, []);

    // Carregar informações das sessões de um usuário específico
    const loadUserSessions = async () => {
        if (!userId) return [];

        try {
            console.log('Carregando sessões do usuário:', userId);

            // Buscar as sessões de chat do usuário atual que não estão excluídas
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_deleted', false)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar sessões do usuário:', error);
                return [];
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhuma sessão encontrada para o usuário');
                return [];
            }

            // Simplificar o processamento das sessões
            const sessions = data.map((session: UserChatSession) => {
                // Simplificar: usar título existente ou um título padrão com ID curto
                let title = session.title || `Conversa ${session.session_id.substring(0, 6)}`;

                // Limitar o tamanho do título para evitar problemas de UI
                if (title.length > 30) {
                    title = title.substring(0, 27) + '...';
                }

                // Atualizar o Map de informações de sessão de forma mais simples
                const sessionInfo: SessionInfo = {
                    id: session.session_id.trim(),
                    title: title,
                    isNew: false
                };

                // Adicionar ao estado
                const updatedInfos = new Map(sessionInfos);
                updatedInfos.set(session.session_id.trim(), sessionInfo);
                setSessionInfos(updatedInfos);

                return session.session_id.trim();
            });

            console.log(`${sessions.length} sessões encontradas para o usuário`);
            return sessions;
        } catch (err) {
            console.error('Erro ao carregar sessões do usuário:', err);
            return [];
        }
    };

    // Carregar o título da sessão a partir do banco de dados
    const loadSessionTitle = async (sessionId: string) => {
        if (!userId || !sessionId) return 'Nova Conversa';

        try {
            const trimmedSessionId = sessionId.trim();
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .select('title')
                .eq('user_id', userId)
                .eq('session_id', trimmedSessionId)
                .single();

            if (error || !data) {
                console.log('Título não encontrado para sessão:', trimmedSessionId);
                return 'Nova Conversa';
            }

            return data.title;
        } catch (err) {
            console.error('Erro ao carregar título da sessão:', err);
            return 'Nova Conversa';
        }
    };

    // Renomear uma sessão de chat
    const renameSession = async (sessionId: string, newTitle: string): Promise<boolean> => {
        if (!userId || !sessionId || !newTitle.trim()) {
            console.error('Dados inválidos para renomear sessão');
            return false;
        }

        try {
            const trimmedSessionId = sessionId.trim();
            console.log(`Renomeando sessão ${trimmedSessionId} para "${newTitle}"`);

            // Atualizar no Supabase
            const { error } = await supabase
                .from('user_chat_sessions')
                .update({ title: newTitle.trim() })
                .eq('user_id', userId)
                .eq('session_id', trimmedSessionId);

            if (error) {
                console.error('Erro ao renomear sessão:', error);
                setError('Falha ao renomear sessão. Tente novamente.');
                return false;
            }

            // Atualizar no estado local
            const updatedInfos = new Map(sessionInfos);
            const currentInfo = updatedInfos.get(trimmedSessionId);

            if (currentInfo) {
                updatedInfos.set(trimmedSessionId, {
                    ...currentInfo,
                    title: newTitle.trim()
                });
                setSessionInfos(updatedInfos);
            }

            setLastMessageTimestamp(Date.now()); // Forçar atualização
            console.log('Sessão renomeada com sucesso');
            return true;
        } catch (err) {
            console.error('Erro ao renomear sessão:', err);
            setError('Erro ao renomear sessão. Tente novamente.');
            return false;
        }
    };

    // Excluir (soft delete) uma sessão de chat
    const deleteSession = async (sessionId: string): Promise<boolean> => {
        if (!userId || !sessionId) {
            console.error('Dados inválidos para excluir sessão');
            return false;
        }

        try {
            const trimmedSessionId = sessionId.trim();
            console.log(`Excluindo sessão ${trimmedSessionId}`);

            // Em vez de usar a função RPC, fazer um UPDATE diretamente
            const { error } = await supabase
                .from('user_chat_sessions')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString()
                })
                .eq('session_id', trimmedSessionId)
                .eq('user_id', userId);

            if (error) {
                console.error('Erro ao excluir sessão:', error.message || 'Erro desconhecido');
                setError(`Falha ao excluir sessão: ${error.message || 'Erro desconhecido'}`);
                return false;
            }

            // Remover do estado local
            setActiveSessions(prev => prev.filter(id => id.trim() !== trimmedSessionId));

            // Se a sessão atual foi excluída, mudar para uma nova
            if (sessionId.trim() === trimmedSessionId) {
                if (activeSessions.length > 1) {
                    // Encontrar próxima sessão disponível
                    const nextSession = activeSessions.find(id => id.trim() !== trimmedSessionId);
                    if (nextSession) {
                        changeSession(nextSession);
                    } else {
                        createNewSession();
                    }
                } else {
                    createNewSession();
                }
            }

            console.log('Sessão excluída com sucesso');
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error('Erro ao excluir sessão:', errorMessage);
            setError('Erro ao excluir sessão. Tente novamente.');
            return false;
        }
    };

    const loadMessagesForSession = useCallback(async (sessionId: string, forceLoad = false) => {
        if (!sessionId) return;

        // Modificado: permitir carregamento em novas conversas se forceLoad for true
        if ((isNewConversation && !forceLoad) || isCreatingSessionRef.current) {
            console.log('Pulando carregamento pois estamos em uma nova conversa ou criando sessão');
            return;
        }

        // Garantir que o sessionId esteja limpo
        const trimmedSessionId = sessionId.trim();
        console.log(`Carregando mensagens para sessão: ${trimmedSessionId}`);

        try {
            setLoading(true);
            setError(null);

            // CORRIGIDO: Não use .single() pois causa erro se não encontrar registro
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .select('messages')
                .eq('session_id', trimmedSessionId)
                .eq('user_id', userId || '');

            if (error) {
                console.error('Erro ao carregar mensagens:', error.message || 'Erro desconhecido');
                setError(`Erro ao carregar mensagens: ${error.message}`);
                setLoading(false);
                return;
            }

            // Log para debug
            console.log(`Dados recebidos para a sessão ${trimmedSessionId}`);

            // Verificar se temos dados
            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhum dado retornado para a sessão');
                setMessages([]);
                setIsNewConversation(true);
                setHasEmptyChat(true);
                setLoading(false);
                return;
            }

            // Deve haver apenas um registro, mas pegamos o primeiro por segurança
            const sessionData = data[0];

            // Verificar se temos mensagens
            if (!sessionData.messages || !Array.isArray(sessionData.messages) || sessionData.messages.length === 0) {
                console.log('Sessão encontrada, mas sem mensagens');
                setMessages([]);
                setIsNewConversation(true);
                setHasEmptyChat(true);
                setLoading(false);
                return;
            }

            // Verificar se ainda estamos na mesma sessão
            if (trimmedSessionId !== sessionManager.currentSessionId) {
                console.log('Sessão mudou durante carregamento, abortando');
                setLoading(false);
                return;
            }

            // Filtrar apenas mensagens com estrutura válida
            const validMessages = sessionData.messages.filter(message => {
                return message &&
                    typeof message === 'object' &&
                    'type' in message &&
                    'content' in message &&
                    typeof message.type === 'string' &&
                    typeof message.content === 'string';
            });

            if (validMessages.length === 0) {
                console.log('Nenhuma mensagem válida encontrada para a sessão');
                setMessages([]);
                setIsNewConversation(true);
                setHasEmptyChat(true);
                setLoading(false);
                return;
            }

            console.log(`Carregadas ${validMessages.length} mensagens válidas`);
            setMessages(validMessages);

            // Contar mensagens humanas para verificar limite
            const humanMessages = validMessages.filter(msg => msg.type === 'human');
            const limitReached = humanMessages.length >= MAX_HUMAN_MESSAGES_PER_SESSION;
            setSessionLimitReached(limitReached);

            // Quando carregamos mensagens com sucesso, não é mais uma nova conversa
            setIsNewConversation(false);
            setHasEmptyChat(false);

            setLoading(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error('Erro ao carregar mensagens:', errorMessage);
            setError(`Erro ao carregar mensagens do histórico: ${errorMessage}`);
            setLoading(false);
        }
    }, [isNewConversation, userId, sessionManager.currentSessionId]);

    // Carregar sessões ativas
    const loadActiveSessions = async () => {
        if (!userId) {
            console.log('Usuário não definido, não é possível carregar sessões');
            return [];
        }

        return await loadUserSessions();
    };

    // Função para atualizar a lista de sessões ativas
    const refreshActiveSessions = useCallback(async () => {
        if (!userId) return;

        try {
            console.log('Atualizando lista de sessões ativas...');
            const sessions = await loadUserSessions();

            if (sessions && sessions.length > 0) {
                setActiveSessions(sessions);
                console.log(`Lista de sessões atualizada: ${sessions.length} sessões encontradas`);
            }
        } catch (err) {
            console.error('Erro ao atualizar sessões ativas:', err);
        }
    }, [userId]);

    // Contar mensagens humanas em uma sessão
    const countHumanMessages = async (sessionId: string): Promise<number> => {
        if (!sessionId) return 0;

        // Garantir que o sessionId esteja limpo
        const trimmedSessionId = sessionId.trim();

        try {
            console.log('Contando mensagens humanas para sessão:', trimmedSessionId);

            // CORRIGIDO: Não use .single() pois causa erro se não encontrar registro
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .select('messages')
                .eq('session_id', trimmedSessionId)
                .eq('user_id', userId || '');

            if (error) {
                console.error('Erro na consulta de mensagens:', error.message || 'Erro desconhecido');
                return 0;
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhuma mensagem encontrada');
                return 0;
            }

            // Pegar o primeiro resultado (deve haver apenas um)
            const sessionData = data[0];

            if (!sessionData.messages || !Array.isArray(sessionData.messages)) {
                console.log('Array de mensagens não encontrado ou inválido');
                return 0;
            }

            // Filtrar mensagens do tipo 'human'
            const humanMessages = sessionData.messages.filter(msg =>
                msg && typeof msg === 'object' && msg.type === 'human'
            );

            console.log(`Total de mensagens humanas: ${humanMessages.length}`);
            return humanMessages.length;
        } catch (err) {
            console.error('Erro ao contar mensagens:', err);
            return 0;
        }
    };

    const createNewSession = async (specificId?: string): Promise<string | null> => {
        try {
            // Verificar se já existe uma conversa em branco
            if (hasEmptyChat) {
                console.log('Já existe uma conversa em branco. Redirecionando para ela.');

                // Se já estivermos na conversa em branco, não fazer nada
                if (isNewConversation) {
                    console.log('Já estamos na conversa em branco.');
                    return sessionId;
                }

                // Mudar para a conversa em branco existente
                sessionManager.currentSessionId = sessionId;
                setMessages([]);
                setIsNewConversation(true);
                setIsProcessing(false);
                setError(null);

                return sessionId;
            }

            // Se já estiver criando, evitar duplicação
            if (isCreatingSessionRef.current) {
                console.log('Já está criando uma nova sessão, ignorando');
                return null;
            }

            isCreatingSessionRef.current = true;
            console.log('Iniciando criação de nova sessão...');

            // Limpar qualquer stream em andamento
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            // Usar o ID específico se fornecido, ou gerar um novo
            const newSessionId = specificId ? specificId : uuidv4();
            console.log('ID da nova sessão:', newSessionId);

            // Atualizar gerenciador de sessões
            sessionManager.currentSessionId = newSessionId;

            // Limpar os estados
            setSessionLimitReached(false);
            setIsProcessing(false);
            setError(null);
            setMessages([]);
            setStreamingContent('');

            // Atualizar as informações da sessão com título simplificado
            const updatedInfos = new Map(sessionInfos);
            updatedInfos.set(newSessionId, {
                id: newSessionId,
                title: `Nova Conversa`,
                isNew: false
            });
            setSessionInfos(updatedInfos);

            // Definir que temos uma conversa em branco e é nova
            setHasEmptyChat(true);
            setIsNewConversation(true);

            // Atualizar o ID da sessão atual
            setSessionId(newSessionId);
            console.log('ID da sessão atual atualizado para:', newSessionId);

            // Permitir que novas sessões sejam criadas novamente após um breve delay
            setTimeout(() => {
                isCreatingSessionRef.current = false;
            }, 500);

            console.log('Nova sessão criada com sucesso (apenas em memória):', newSessionId);
            return newSessionId;
        } catch (err) {
            console.error('Erro ao criar nova sessão:', err);
            setError('Falha ao criar nova sessão');
            isCreatingSessionRef.current = false;
            return null;
        }
    };

    // Mudar para uma sessão existente
    const changeSession = (newSessionId: string) => {
        // Evitar carregamento se já estamos nesta sessão
        if (!newSessionId || newSessionId.trim() === sessionId.trim()) {
            console.log('Já estamos na sessão solicitada, ignorando');
            return;
        }

        // Evitar mudanças concorrentes de sessão
        if (sessionManager.isChangingSession) {
            console.log('Já está em processo de mudança de sessão, ignorando');
            return;
        }

        try {
            // Marcar que estamos mudando de sessão
            sessionManager.isChangingSession = true;

            // Forçar um log para debug
            console.log('MUDANDO SESSÃO: iniciando processo para sessão', newSessionId);

            // Fechar EventSource existente
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            // IMPORTANTE: Definir loading como true imediatamente
            setLoading(true);
            setStreamingContent('');

            // Garantir que o novo sessionId esteja limpo
            const trimmedNewSessionId = newSessionId.trim();

            // Atualizar o gerenciador de sessões
            sessionManager.currentSessionId = trimmedNewSessionId;
            setIsNewConversation(false);
            setHasEmptyChat(false);
            setSessionId(trimmedNewSessionId);
            setError(null);

            // Carregar mensagens para a nova sessão
            loadMessagesForSession(trimmedNewSessionId, true);

            // Reset after session change is complete
            setTimeout(() => {
                sessionManager.isChangingSession = false;
            }, 500);
        } catch (error) {
            console.error('Erro ao mudar sessão:', error);
            sessionManager.isChangingSession = false;
            setLoading(false);
        }
    };

    // Função sendMessage
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

            // Criar objeto de mensagem do usuário
            const userMessage: ChatMessage = {
                type: 'human',
                content: content.trim()
            };

            // MODIFICADO: Guardar o estado atual de isNewConversation
            const wasNewConversation = isNewConversation;

            // Atualizar UI imediatamente com a mensagem do usuário
            setMessages(prev => [...prev, userMessage]);

            // Ativar o indicador "pensando" imediatamente
            setIsProcessing(true);

            // Verificar se é a primeira mensagem na sessão
            if (wasNewConversation) {
                setIsNewConversation(false);
                setHasEmptyChat(false);
            }

            // Verificar limite de mensagens
            const humanCount = await countHumanMessages(trimmedSessionId);
            console.log(`Contagem de mensagens humanas: ${humanCount}/${MAX_HUMAN_MESSAGES_PER_SESSION}`);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                setSessionLimitReached(true);
                setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
                setIsProcessing(false);
                return;
            }

            setError(null);

            // Atualizar o timestamp para forçar a atualização da lista de conversas
            setLastMessageTimestamp(Date.now());

            // Obter todas as mensagens anteriores para manter o contexto
            const allMessages = [...messagesRef.current, userMessage];

            try {
                // Remover indicador de "pensando" antes de fazer a chamada
                setMessages(prev => prev.filter(msg => msg.content !== 'Oráculo está pensando...'));

                // Fazer a chamada para a API
                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: allMessages,
                        sessionId: trimmedSessionId,
                        userId: userId || 'anonymous',
                        vectorStoreIds: searchableVectorStores
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                // Adicionar a resposta do AI às mensagens
                if (data.response) {
                    const aiMessage: ChatMessage = {
                        type: 'ai',
                        content: data.response
                    };

                    setMessages(prev => [...prev, aiMessage]);
                }

                // Finalizar o processamento
                setIsProcessing(false);

            } catch (error) {
                console.error('Erro na chamada para API:', error);
                setError('Erro ao obter resposta do servidor.');
                setIsProcessing(false);
            }
        } catch (err: any) {
            console.error('Erro ao enviar mensagem:', err);
            setError(err.message || 'Falha ao enviar mensagem');
            setIsProcessing(false);
        }
        finally {
            // Atualizar a lista de sessões ativas após enviar a mensagem
            try {
                await refreshActiveSessions();
            } catch (refreshError) {
                console.error('Erro ao atualizar lista de sessões:', refreshError);
            }
        }
    };

    // Efeito para atualizar a lista quando o timestamp mudar
    useEffect(() => {
        if (lastMessageTimestamp > 0) {
            console.log('Detectada nova mensagem, atualizando lista de sessões...');
            refreshActiveSessions();
        }
    }, [lastMessageTimestamp, refreshActiveSessions]);

    // Inicializar o hook
    useEffect(() => {
        if (!userId) return;

        const initialize = async () => {
            try {
                console.log('Inicializando chat para usuário:', userId);
                setLoading(true);

                // Carregamos apenas a lista de sessões ativas para este usuário
                const sessions = await loadUserSessions();
                setActiveSessions(sessions);

                // MODIFICADO: Não criar mais uma sessão vazia na inicialização
                // Em vez disso, definir um estado especial de "seleção inicial"
                setSessionId('');
                setIsNewConversation(false);
                setHasEmptyChat(false);

                // Indicar que o usuário precisa selecionar ou criar uma conversa
                setMessages([]);

                // Se existe pelo menos uma sessão, sugerir seleção
                if (sessions.length > 0) {
                    setError('Selecione uma conversa existente ou crie uma nova.');
                }

            } catch (err) {
                console.error('Erro ao inicializar chat:', err);
                setError('Falha ao inicializar o chat');
            } finally {
                setLoading(false);
            }
        };

        initialize();

        // Limpeza ao desmontar
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [userId]);

    // Proteger contra estados de processamento presos
    useEffect(() => {
        let processingGuardTimer: NodeJS.Timeout | null = null;

        // Se estamos processando, configurar um timer de segurança simples
        if (isProcessing) {
            console.log('Configurando timer de segurança para estado de processamento');

            // Timer para resetar após 45 segundos
            processingGuardTimer = setTimeout(() => {
                if (isProcessing) {
                    console.log('AVISO: Estado de processamento preso por tempo excessivo. Resetando...');
                    resetProcessingState();
                }
            }, 45000); // 45 segundos é um tempo razoável
        }

        return () => {
            if (processingGuardTimer !== null) {
                clearTimeout(processingGuardTimer);
            }
        };
    }, [isProcessing, resetProcessingState]);

    return {
        messages,
        sessionId,
        loading,
        error,
        sendMessage,
        changeSession,
        createNewSession,
        activeSessions,
        sessionInfos,
        isProcessing,
        sessionLimitReached,
        isNewConversation,
        lastMessageTimestamp,
        resetProcessingState,
        updateLastMessageTimestamp,
        renameSession,
        deleteSession,
        hasEmptyChat,
        streamingContent,
        searchableVectorStores,
        setSearchableVectorStores
    };
}