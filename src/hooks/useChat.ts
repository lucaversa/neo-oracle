import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, UserChatSession, SessionInfo } from '@/types/chat';

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
    sessionInfos: Map<string, SessionInfo>;
    isProcessing: boolean;
    sessionLimitReached: boolean;
    isNewConversation: boolean;
    lastMessageTimestamp: number;
    resetProcessingState: () => void;
    updateLastMessageTimestamp: () => void;
    renameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
    deleteSession: (sessionId: string) => Promise<boolean>;
    hasEmptyChat: boolean; // Nova propriedade
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
    const [hasEmptyChat, setHasEmptyChat] = useState<boolean>(false); // NOVO: Para controlar conversas vazias
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastMessageCountRef = useRef<number>(0);
    const messagesRef = useRef<ChatMessage[]>([]);
    const pendingMessageRef = useRef<ChatMessage | null>(null);
    const isCreatingSessionRef = useRef<boolean>(false);

    // Gerenciador centralizado de sessões para evitar condições de corrida
    const sessionManager = useRef({
        currentSessionId: '', // ID da sessão atual
        isChangingSession: false, // Flag para indicar que estamos mudando de sessão
    }).current;

    // Manter uma referência atualizada às mensagens para uso no polling
    useEffect(() => {
        messagesRef.current = messages;
        lastMessageCountRef.current = messages.length;
    }, [messages]);

    // Função para resetar o estado de processamento manualmente
    const resetProcessingState = useCallback(() => {
        console.log('Resetando estado de processamento manualmente');
        setIsProcessing(false);
        pendingMessageRef.current = null;
    }, []);

    // Nova função para atualizar o timestamp da última mensagem
    const updateLastMessageTimestamp = useCallback(() => {
        console.log('Atualizando timestamp da última mensagem');
        setLastMessageTimestamp(Date.now());
    }, []);

    // Função para carregar informações das sessões de um usuário específico
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

            // Extrair e formatar informações de sessão
            const sessions = data.map((session: UserChatSession) => {
                // Atualizar o Map de informações de sessão
                const sessionInfo: SessionInfo = {
                    id: session.session_id.trim(),
                    title: session.title,
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

    // FUNÇÃO ADICIONADA: Carregar o título da sessão a partir do banco de dados
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

    // FUNÇÃO ADICIONADA: Renomear uma sessão de chat
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

    // FUNÇÃO MODIFICADA: Excluir (soft delete) uma sessão de chat - agora usando RPC
    const deleteSession = async (sessionId: string): Promise<boolean> => {
        if (!userId || !sessionId) {
            console.error('Dados inválidos para excluir sessão');
            return false;
        }

        try {
            const trimmedSessionId = sessionId.trim();
            console.log(`Excluindo sessão ${trimmedSessionId}`);

            // Usar a função RPC para marcar como excluído
            const { data, error } = await supabase.rpc('mark_session_as_deleted', {
                session_id_param: trimmedSessionId,
                user_id_param: userId
            });

            if (error) {
                console.error('Erro ao excluir sessão:', error);
                console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
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
            console.error('Erro ao excluir sessão:', err);
            setError('Erro ao excluir sessão. Tente novamente.');
            return false;
        }
    };

    // MODIFICADA: loadMessagesForSession para aceitar forceLoad
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

            // Verificar se ainda estamos na mesma sessão
            if (trimmedSessionId !== sessionManager.currentSessionId) {
                console.log('Sessão mudou durante carregamento, abortando');
                return;
            }

            // Se não houver mensagens válidas
            if (validMessages.length === 0) {
                console.log('Nenhuma mensagem válida encontrada para a sessão');

                // Verificamos se temos uma mensagem pendente
                if (pendingMessageRef.current) {
                    // Se tivermos uma mensagem pendente, mantenha-a na UI
                    console.log('Mantendo mensagem pendente visível enquanto aguarda resposta');
                    if (messagesRef.current.length === 0 ||
                        messagesRef.current[messagesRef.current.length - 1].type !== pendingMessageRef.current.type) {
                        // Só atualize se não houver mensagens ou se a última mensagem não for do mesmo tipo
                        setMessages([pendingMessageRef.current]);
                    }
                } else if (!isCreatingSessionRef.current && !isNewConversation) {
                    // Limpar mensagens apenas se não estamos criando sessão e não é nova conversa
                    setMessages([]);
                }

                // Não mudamos o estado de processamento aqui
                return;
            }

            // Extrair as mensagens para a UI
            const sessionMessages = validMessages.map(entry => entry.message as ChatMessage);

            // Se temos uma mensagem pendente, precisamos verificar se ela já está no banco
            if (pendingMessageRef.current) {
                const pendingContent = pendingMessageRef.current.content;
                const pendingExists = sessionMessages.some(
                    msg => msg.type === 'human' && msg.content === pendingContent
                );

                if (!pendingExists) {
                    // A mensagem pendente ainda não está no banco
                    // Manter a mensagem pendente visível adicionando-a ao array
                    console.log('Mantendo mensagem pendente visível na UI');
                    sessionMessages.push(pendingMessageRef.current);
                } else {
                    // A mensagem pendente já foi salva no banco
                    console.log('Mensagem pendente encontrada no banco, removendo referência local');
                    pendingMessageRef.current = null;
                }
            }

            // Verificar novamente se ainda estamos na mesma sessão
            if (trimmedSessionId !== sessionManager.currentSessionId) {
                console.log('Sessão mudou durante processamento, abortando atualização');
                return;
            }

            // IMPORTANTE: Sempre definir as mensagens, mesmo se parecem iguais
            // Isso força a renderização no primeiro carregamento
            setMessages(sessionMessages);
            messagesRef.current = [...sessionMessages];
            lastMessageCountRef.current = sessionMessages.length;

            // Quando carregamos mensagens com sucesso, não é mais uma nova conversa
            if (sessionMessages.length > 0) {
                setIsNewConversation(false);
                setHasEmptyChat(false);
            }

            console.log(`Definidas ${sessionMessages.length} mensagens para a sessão ${trimmedSessionId}`);

            // Verificar estado "pensando" com lógica ainda mais precisa
            const humanMessages = sessionMessages.filter(msg => msg.type === 'human');
            const aiMessages = sessionMessages.filter(msg => msg.type === 'ai');

            // A mensagem pendente tem prioridade absoluta
            if (pendingMessageRef.current !== null) {
                console.log('Mensagem pendente detectada, mantendo estado de processamento');
                setIsProcessing(true);
                return; // Importante: retornar imediatamente para evitar mudanças de estado incorretas
            }

            // Verificar a ordem das mensagens
            const lastMessage = sessionMessages.length > 0 ? sessionMessages[sessionMessages.length - 1] : null;
            const isLastMessageHuman = lastMessage ? lastMessage.type === 'human' : false;

            // Para cada mensagem humana deve haver uma mensagem do AI correspondente
            const isWaitingForResponse: boolean = humanMessages.length > aiMessages.length || isLastMessageHuman;

            // Log detalhado para depuração
            console.log('Estado de processamento:', {
                pendingMessage: pendingMessageRef.current !== null,
                humanCount: humanMessages.length,
                aiCount: aiMessages.length,
                lastMessageType: lastMessage?.type,
                isWaitingForResponse,
                currentIsProcessing: isProcessing
            });

            // Forçar atualização do status "pensando" com maior prioridade
            if (isWaitingForResponse !== isProcessing) {
                console.log('Atualizando estado de processamento:', isWaitingForResponse);
                setIsProcessing(isWaitingForResponse);

                // Se estamos mudando de processando para não processando (finalizou)
                if (!isWaitingForResponse && isProcessing) {
                    // Garantir que pendingMessageRef também seja limpo
                    pendingMessageRef.current = null;
                    console.log('Resposta completa recebida, limpando mensagem pendente');
                }
            }

            // Contar mensagens humanas para verificar limite
            const humanCount = humanMessages.length;
            const limitReached = humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION;

            if (limitReached !== sessionLimitReached) {
                setSessionLimitReached(limitReached);
                if (limitReached) {
                    console.log('Limite de mensagens atingido para esta sessão');
                }
            }

            // ADICIONADO: Carregar título da sessão se não tivermos essa informação
            if (sessionId && userId) {
                const trimmedSessionId = sessionId.trim();
                const currentInfo = sessionInfos.get(trimmedSessionId);

                if (!currentInfo || !currentInfo.title || currentInfo.title === 'Nova Conversa') {
                    const title = await loadSessionTitle(trimmedSessionId);

                    // Atualizar o título no estado local
                    if (title) {
                        const updatedInfos = new Map(sessionInfos);
                        updatedInfos.set(trimmedSessionId, {
                            id: trimmedSessionId,
                            title,
                            ...(currentInfo || {})
                        });
                        setSessionInfos(updatedInfos);
                    }
                }
            }
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
            // Não definir erro aqui, apenas logar, para não interromper o polling
        }
    }, [isProcessing, sessionLimitReached, isNewConversation, sessionId, sessionInfos, userId]);

    // Proteger contra estados de processamento presos
    useEffect(() => {
        let processingGuardTimer: NodeJS.Timeout | null = null;
        let doubleCheckTimer: NodeJS.Timeout | null = null;

        // Se estamos processando, configurar timers de segurança
        if (isProcessing) {
            console.log('Configurando timer de segurança para estado de processamento');

            // Primeiro, verificar se temos alguma resposta após 5 segundos
            doubleCheckTimer = setTimeout(async () => {
                if (isProcessing) {
                    console.log('Verificação intermediária do estado de processamento...');
                    // Forçar uma checagem imediata para ver se já temos resposta
                    await loadMessagesForSession(sessionId.trim());
                }
            }, 5000); // Verificar após 5 segundos

            // Timer principal para resetar após 15 segundos
            processingGuardTimer = setTimeout(() => {
                if (isProcessing) {
                    console.log('AVISO: Estado de processamento preso por tempo excessivo. Resetando...');
                    pendingMessageRef.current = null;
                    setIsProcessing(false);

                    // Forçar última tentativa de carregamento
                    loadMessagesForSession(sessionId.trim());
                }
            }, 15000); // 15 segundos para timeout total
        }

        return () => {
            if (doubleCheckTimer !== null) {
                clearTimeout(doubleCheckTimer);
            }
            if (processingGuardTimer !== null) {
                clearTimeout(processingGuardTimer);
            }
        };
    }, [isProcessing, sessionId, loadMessagesForSession]);

    // MODIFICADA: loadActiveSessions agora usa a tabela user_chat_sessions
    const loadActiveSessions = async () => {
        if (!userId) {
            console.log('Usuário não definido, não é possível carregar sessões');
            return [];
        }

        return await loadUserSessions();
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

    // NOVA FUNÇÃO: Garantir que o polling esteja ativo para a sessão correta
    const ensurePollingActive = useCallback((specificSessionId = null) => {
        const targetSessionId = specificSessionId || sessionId;
        if (!targetSessionId) return;

        const trimmedId = targetSessionId.trim();

        // Se já temos um polling ativo, verificar se é para a sessão correta
        if (pollingIntervalRef.current !== null) {
            // Se a sessão é diferente, reiniciar o polling
            if (sessionManager.currentSessionId !== trimmedId) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            } else {
                // Mesmo ID, manter o polling existente
                return;
            }
        }

        // Iniciar novo polling
        console.log(`Iniciando polling para sessão: ${trimmedId}`);
        pollingIntervalRef.current = setInterval(() => {
            if (!isCreatingSessionRef.current &&
                sessionManager.currentSessionId === trimmedId) {
                loadMessagesForSession(trimmedId, true);
            }
        }, POLLING_INTERVAL);
    }, [sessionId, loadMessagesForSession]);

    // MODIFICADA: createNewSession para evitar múltiplas conversas novas vazias
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

            // Parar o polling temporariamente
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('Polling interrompido durante criação de nova sessão');
            }

            // Limpar qualquer mensagem pendente
            pendingMessageRef.current = null;

            // Usar o ID específico se fornecido, ou gerar um novo
            const newSessionId = specificId ? specificId : uuidv4();
            console.log('ID da nova sessão:', newSessionId);

            // MODIFICADO: Não criar na tabela user_chat_sessions aqui!
            // Isso será feito apenas quando a primeira mensagem for enviada

            // Atualizar gerenciador de sessões
            sessionManager.currentSessionId = newSessionId;

            // Limpar os estados
            setSessionLimitReached(false);
            setIsProcessing(false);
            setError(null);
            setMessages([]);

            // Atualizar as informações da sessão no estado local
            const updatedInfos = new Map(sessionInfos);
            updatedInfos.set(newSessionId, {
                id: newSessionId,
                title: 'Nova Conversa',
                isNew: false
            });
            setSessionInfos(updatedInfos);

            // Definir que temos uma conversa em branco e é nova
            setHasEmptyChat(true);
            setIsNewConversation(true);

            // Atualizar o ID da sessão atual
            setSessionId(newSessionId);
            console.log('ID da sessão atual atualizado para:', newSessionId);

            // Limpar timers existentes
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }

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

    // MODIFICADA: changeSession para forçar carregamento imediato
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

            // Cancelar polling existente
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }

            // IMPORTANTE: Definir loading como true imediatamente
            setLoading(true);

            // Limpar qualquer mensagem pendente
            pendingMessageRef.current = null;

            // Garantir que o novo sessionId esteja limpo
            const trimmedNewSessionId = newSessionId.trim();

            // Atualizar o gerenciador de sessões
            sessionManager.currentSessionId = trimmedNewSessionId;
            setIsNewConversation(false);
            setHasEmptyChat(false);
            setSessionId(trimmedNewSessionId);
            setError(null);

            // CARREGAMENTO FORÇADO: Carregar mensagens imediatamente
            console.log('Forçando carregamento inicial para sessão:', trimmedNewSessionId);

            // Força dupla consulta para garantir carregamento
            const forceLoad = async () => {
                try {
                    // Primeira tentativa de carregamento
                    await loadMessagesForSession(trimmedNewSessionId, true);

                    // Se ainda não temos mensagens, tentar novamente após um breve intervalo
                    if (messagesRef.current.length === 0) {
                        console.log('Primeira consulta não retornou mensagens, tentando novamente...');
                        setTimeout(async () => {
                            await loadMessagesForSession(trimmedNewSessionId, true);
                            setLoading(false);
                        }, 300);
                    } else {
                        setLoading(false);
                    }

                    // Iniciar polling normal após o carregamento inicial
                    if (sessionManager.currentSessionId === trimmedNewSessionId) {
                        pollingIntervalRef.current = setInterval(() => {
                            if (!isCreatingSessionRef.current &&
                                sessionManager.currentSessionId === trimmedNewSessionId) {
                                loadMessagesForSession(trimmedNewSessionId, true);
                            }
                        }, POLLING_INTERVAL);
                    }
                } catch (err) {
                    console.error('Erro no carregamento forçado:', err);
                    setLoading(false);
                } finally {
                    sessionManager.isChangingSession = false;
                }
            };

            forceLoad();
        } catch (error) {
            console.error('Erro ao mudar sessão:', error);
            sessionManager.isChangingSession = false;
            setLoading(false);
        }
    };

    // MODIFICADA: sendMessage para criar registro na tabela apenas na primeira mensagem
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

            // Armazenar a mensagem pendente para referência
            pendingMessageRef.current = userMessage;

            // MODIFICADO: Guardar o estado atual de isNewConversation
            const wasNewConversation = isNewConversation;

            // Atualizar UI imediatamente (apenas localmente)
            setMessages(prev => [...prev, userMessage]);

            // Ativar o indicador "pensando" imediatamente
            setIsProcessing(true);

            // Verificar se é a primeira mensagem na sessão
            const isFirstMessage = wasNewConversation || messages.length === 0;

            // MODIFICADO: Se for primeira mensagem, registrar na tabela user_chat_sessions
            if (isFirstMessage && userId) {
                console.log('Esta é a primeira mensagem na sessão, registrando na tabela user_chat_sessions');

                // Verificar se já existe um registro para esta sessão
                const { data: existingSession, error: checkError } = await supabase
                    .from('user_chat_sessions')
                    .select('id')
                    .eq('session_id', trimmedSessionId)
                    .eq('user_id', userId)
                    .limit(1);

                if (checkError) {
                    console.error('Erro ao verificar sessão existente:', checkError);
                }
                // Se não existe, criar agora
                else if (!existingSession || existingSession.length === 0) {
                    console.log('Criando novo registro na tabela user_chat_sessions');

                    // Título inicial baseado na primeira mensagem
                    const initialTitle = content.length > 30
                        ? content.substring(0, 30) + '...'
                        : content;

                    const { error: insertError } = await supabase
                        .from('user_chat_sessions')
                        .insert({
                            session_id: trimmedSessionId,
                            user_id: userId,
                            title: initialTitle
                        });

                    if (insertError) {
                        console.error('Erro ao criar registro de sessão:', insertError);
                    } else {
                        // Atualizar o título no estado local também
                        const updatedInfos = new Map(sessionInfos);
                        updatedInfos.set(trimmedSessionId, {
                            id: trimmedSessionId,
                            title: initialTitle,
                            isNew: false
                        });
                        setSessionInfos(updatedInfos);
                    }
                }

                // Desativar estado de "nova conversa" e "conversa vazia"
                setIsNewConversation(false);
                setHasEmptyChat(false);

                // Adicionar à lista de sessões ativas se não estiver lá
                if (!activeSessions.includes(trimmedSessionId)) {
                    setActiveSessions(prev => [trimmedSessionId, ...prev]);
                }
            }

            // Se for a primeira mensagem, iniciar polling mais agressivo
            if (isFirstMessage) {
                console.log(`Iniciando polling mais frequente para a primeira mensagem`);
                if (pollingIntervalRef.current !== null) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }

                // Forçar uma verificação imediata com forceLoad=true
                await loadMessagesForSession(trimmedSessionId, true);

                // Usar uma estratégia de polling mais agressiva inicialmente
                let attemptCount = 0;
                const maxAttempts = 15;
                const initialInterval = 800;

                pollingIntervalRef.current = setInterval(async () => {
                    if (!isCreatingSessionRef.current &&
                        sessionManager.currentSessionId === trimmedSessionId) {

                        console.log(`Polling rápido para primeira mensagem: ${++attemptCount}/${maxAttempts}`);
                        await loadMessagesForSession(trimmedSessionId, true);

                        // Verificar se já recebemos a resposta
                        const hasResponse = messagesRef.current.some(msg => msg.type === 'ai');

                        // Se já recebemos resposta ou tentamos o suficiente, voltar ao polling normal
                        if (hasResponse || attemptCount >= maxAttempts) {
                            console.log('Alternando para polling normal após primeira mensagem');
                            if (pollingIntervalRef.current !== null) {
                                clearInterval(pollingIntervalRef.current);
                                pollingIntervalRef.current = null;
                            }

                            // Configurar o polling normal
                            pollingIntervalRef.current = setInterval(() => {
                                if (!isCreatingSessionRef.current &&
                                    sessionManager.currentSessionId === trimmedSessionId) {
                                    loadMessagesForSession(trimmedSessionId, true);
                                }
                            }, POLLING_INTERVAL);
                        }
                    } else {
                        // Se a sessão mudou, limpar este intervalo
                        if (pollingIntervalRef.current !== null) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                    }
                }, initialInterval);
            }

            // Verificar limite de mensagens
            const humanCount = await countHumanMessages(trimmedSessionId);
            console.log(`Contagem de mensagens humanas: ${humanCount}/${MAX_HUMAN_MESSAGES_PER_SESSION}`);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                setSessionLimitReached(true);
                setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
                return;
            }

            setError(null);

            // Atualizar o timestamp para forçar a atualização da lista de conversas
            setLastMessageTimestamp(Date.now());

            // Após enviar a mensagem para o webhook, atualizar o timestamp da sessão
            try {
                // Atualizar updated_at na tabela user_chat_sessions para refletir atividade recente
                if (userId) {
                    await supabase
                        .from('user_chat_sessions')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('user_id', userId)
                        .eq('session_id', trimmedSessionId);
                }
            } catch (updateError) {
                console.error('Erro ao atualizar timestamp da sessão:', updateError);
                // Não interromper o fluxo se essa atualização falhar
            }

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

            // Estabelecer um timer de backup para verificar se a resposta chegou
            setTimeout(async () => {
                if (isProcessing && pendingMessageRef.current !== null) {
                    console.log('Verificação pós-envio: forçando polling para verificar resposta');
                    await loadMessagesForSession(trimmedSessionId, true);
                }
            }, 3000); // Verificar 3 segundos após o envio

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

        return () => {
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('Polling interrompido');
            }
        };
    }, [userId]);

    // Configurar polling apenas quando explicitamente solicitado
    // (Não fazemos mais isso automaticamente quando o sessionId muda)
    useEffect(() => {
        // Cleanup quando o componente for desmontado
        return () => {
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('Polling interrompido ao desmontar o componente');
            }
        };
    }, []);

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
        hasEmptyChat // Nova propriedade
    };
}