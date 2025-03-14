// src/hooks/useChat.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, UserChatSession, SessionInfo } from '@/types/chat';

// Constante para o limite de mensagens humanas por chat
const MAX_HUMAN_MESSAGES_PER_SESSION = 5;

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
    updateSessionTitle: (sessionId: string, title: string) => void; // Nova função
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
    // Modifique a função loadUserSessions para ordenar por created_at em vez de updated_at

    const loadUserSessions = async () => {
        if (!userId) return [];

        try {
            console.log('Carregando sessões do usuário:', userId);

            // Buscar as sessões de chat do usuário atual que não estão excluídas
            // Ordenando por created_at em vez de updated_at
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar sessões do usuário:', error);
                return [];
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('Nenhuma sessão encontrada para o usuário');
                return [];
            }

            // Log para depuração
            console.log(`Encontradas ${data.length} sessões para o usuário`);
            data.forEach((session, index) => {
                console.log(`Sessão ${index + 1}: ID=${session.session_id}, Título=${session.title || 'Sem título'}`);
            });

            // Limpar e reconstruir completamente o Map de informações de sessão
            const newSessionInfos = new Map<string, SessionInfo>();

            const sessions = data.map((session: UserChatSession) => {
                const trimmedId = session.session_id.trim();

                // Usar título do banco ou gerar um padrão, garantindo que não seja null ou undefined
                const title = session.title || `Conversa ${trimmedId.substring(0, 6)}`;

                // Criar objeto de informações da sessão
                const sessionInfo: SessionInfo = {
                    id: trimmedId,
                    title: title,
                    isNew: false
                };

                // Adicionar ao novo Map
                newSessionInfos.set(trimmedId, sessionInfo);

                return trimmedId;
            });

            // Atualizar o state com o novo Map completo
            setSessionInfos(newSessionInfos);

            console.log(`${sessions.length} sessões processadas`);
            return sessions;
        } catch (err) {
            console.error('Erro ao carregar sessões do usuário:', err);
            return [];
        }
    };

    // E também modifique a função refreshActiveSessions se necessário (importante garantir que 
    // loadUserSessions seja a única função que está fazendo a ordenação)

    // Adicionar uma função para atualizar explicitamente o título de uma sessão no estado local
    const updateSessionTitle = (sessionId: string, title: string) => {
        const trimmedId = sessionId.trim();
        console.log(`Atualizando título da sessão ${trimmedId} para "${title}"`);

        setSessionInfos(prevInfos => {
            const newInfos = new Map(prevInfos);
            const currentInfo = newInfos.get(trimmedId);

            if (currentInfo) {
                newInfos.set(trimmedId, {
                    ...currentInfo,
                    title: title
                });
            } else {
                newInfos.set(trimmedId, {
                    id: trimmedId,
                    title: title,
                    isNew: false
                });
            }

            return newInfos;
        });

        // Forçar atualização
        setLastMessageTimestamp(Date.now());
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

            // Atualizar PRIMEIRO no estado local para feedback imediato ao usuário
            const updatedInfos = new Map(sessionInfos);
            const currentInfo = updatedInfos.get(trimmedSessionId);

            if (currentInfo) {
                updatedInfos.set(trimmedSessionId, {
                    ...currentInfo,
                    title: newTitle.trim()
                });

                // Atualizar o estado imediatamente
                setSessionInfos(updatedInfos);

                // Disparar uma atualização forçada da interface
                setLastMessageTimestamp(Date.now());
            }

            // Depois fazer a atualização no banco de dados
            const { data, error } = await supabase
                .from('user_chat_sessions')
                .update({ title: newTitle.trim() })
                .eq('user_id', userId)
                .eq('session_id', trimmedSessionId)
                .select();

            if (error) {
                console.error('Erro ao renomear sessão no banco de dados:', error);
                // Mesmo com erro no banco, mantemos o título atualizado no frontend
                return true; // Retorna true porque o frontend foi atualizado
            }

            console.log('Sessão renomeada com sucesso no banco de dados');

            // Forçar atualização da lista de sessões para garantir consistência
            setTimeout(() => {
                refreshActiveSessions();
            }, 300);

            return true;
        } catch (err) {
            console.error('Erro ao renomear sessão:', err);
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

    // Substitua apenas a função sendMessage no arquivo src/hooks/useChat.ts

    // Substitua apenas a função sendMessage no arquivo src/hooks/useChat.ts

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
            setStreamingContent(''); // Iniciar com conteúdo vazio

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
                // Configurar um timeout usando AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos de timeout

                // Iniciar uma solicitação fetch para obter o stream
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
                    signal: controller.signal
                });

                // Limpar o timeout se a resposta chegou
                clearTimeout(timeoutId);

                if (!response.ok || !response.body) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }

                // Inicializar mensagem do AI vazia em real-time
                let aiMessageAdded = false;
                const addAiMessage = () => {
                    if (!aiMessageAdded) {
                        setMessages(prev => [...prev, { type: 'ai', content: '' }]);
                        aiMessageAdded = true;
                    }
                };

                // Processar o stream manualmente usando Reader
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedContent = '';

                // Adicionar a mensagem AI vazia imediatamente, não esperamos pelo primeiro chunk
                addAiMessage();

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('Stream completo');
                        break;
                    }

                    // Decodificar o chunk
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('Chunk recebido:', chunk);

                    // Processar o chunk como texto (pode conter múltiplas linhas de eventos)
                    const lines = chunk.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();

                        // Pular linhas vazias
                        if (!line) continue;

                        // Verificar se é uma linha de dados
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);

                            try {
                                // Tentar parsear como JSON
                                const jsonData = JSON.parse(data);

                                // Se temos um delta de texto
                                if (jsonData.text !== undefined || jsonData.full !== undefined) {
                                    // Atualizar o conteúdo acumulado se temos 'full'
                                    if (jsonData.full !== undefined) {
                                        accumulatedContent = jsonData.full;
                                    }
                                    // Ou adicionar o delta se temos apenas 'text'
                                    else if (jsonData.text !== undefined) {
                                        accumulatedContent += jsonData.text;
                                    }

                                    // Atualizar o estado de streaming para debug
                                    setStreamingContent(accumulatedContent);

                                    // Atualizar a última mensagem do AI com o conteúdo atual
                                    setMessages(prev => {
                                        const newMessages = [...prev];
                                        // Atualizar a última mensagem AI
                                        for (let i = newMessages.length - 1; i >= 0; i--) {
                                            if (newMessages[i].type === 'ai') {
                                                newMessages[i].content = accumulatedContent;
                                                break;
                                            }
                                        }
                                        return newMessages;
                                    });
                                }

                                // Se recebemos "Done", finalizamos o processamento
                                if (data === 'Done' || jsonData.done) {
                                    console.log('Resposta completa recebida');
                                    break;
                                }
                            } catch (e) {
                                // Se não for JSON, apenas logar para debug
                                console.log('Dados não-JSON recebidos:', data);
                            }
                        }
                        // Verificar eventos de erro
                        else if (line.startsWith('event: error')) {
                            // A próxima linha deve conter os dados do erro
                            if (i + 1 < lines.length && lines[i + 1].startsWith('data: ')) {
                                const errorData = lines[i + 1].substring(6);
                                console.error('Erro no stream:', errorData);
                                throw new Error(JSON.parse(errorData).error || 'Erro no stream');
                            }
                        }
                    }
                }

                console.log('Stream processado com sucesso');

                // Resetar estado
                setIsProcessing(false);
                setStreamingContent('');

            } catch (error) {
                console.error('Erro na chamada para API:', error);

                // Verificar se foi um erro de timeout (AbortError)
                if (error instanceof DOMException && error.name === 'AbortError') {
                    setError('A consulta está demorando muito. O servidor pode estar ocupado. Tente novamente mais tarde.');

                    // Adicionar uma mensagem de erro visível no chat
                    setMessages(prev => {
                        // Só adicionar se a última mensagem for do usuário
                        if (prev.length > 0 && prev[prev.length - 1].type === 'human') {
                            return [...prev, {
                                type: 'ai',
                                content: 'A consulta está demorando muito. O servidor pode estar ocupado. Por favor, tente novamente mais tarde.'
                            }];
                        }
                        return prev;
                    });
                } else {
                    setError('Erro ao obter resposta do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));

                    // Adicionar mensagem de erro no chat
                    setMessages(prev => {
                        if (prev.length > 0 && prev[prev.length - 1].type === 'human') {
                            return [...prev, {
                                type: 'ai',
                                content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.'
                            }];
                        }
                        return prev;
                    });
                }

                // Se for uma nova conversa e houve erro, cancelar a conversa
                if (wasNewConversation && messagesRef.current.length <= 1) {
                    console.log('Erro em nova conversa. Cancelando a criação da sessão.');
                }

                setIsProcessing(false);
                setStreamingContent('');
            }
        } catch (err: any) {
            console.error('Erro ao enviar mensagem:', err);
            setError(err.message || 'Falha ao enviar mensagem');
            setIsProcessing(false);
            setStreamingContent('');
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

        // Se estamos processando, configurar um timer de segurança 
        if (isProcessing) {
            console.log('Configurando timer de segurança para estado de processamento');

            // Aumentar o timeout para 3 minutos (180000ms) para consultas longas
            processingGuardTimer = setTimeout(() => {
                if (isProcessing) {
                    console.log('AVISO: Estado de processamento preso por tempo excessivo. Adicionando mensagem de erro em vez de resetar...');

                    // Adicionar mensagem de erro em vez de apenas resetar o estado
                    setMessages(prev => {
                        // Verificar se a última mensagem é do usuário
                        if (prev.length > 0 && prev[prev.length - 1].type === 'human') {
                            // Adicionar mensagem de erro do sistema
                            return [...prev, {
                                type: 'ai',
                                content: 'A resposta está demorando mais do que o esperado. Por favor, aguarde ou tente novamente mais tarde.'
                            }];
                        }
                        return prev;
                    });

                    // Agora sim resetar o estado após adicionar a mensagem
                    resetProcessingState();
                }
            }, 180000); // 3 minutos
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
        setSearchableVectorStores,
        updateSessionTitle
    };
}