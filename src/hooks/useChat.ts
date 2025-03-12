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
    isNewConversation: boolean; // Propriedade para indicar se é uma conversa nova
    lastMessageTimestamp: number; // Nova propriedade para forçar atualização
    resetProcessingState: () => void; // Função para resetar o estado de processamento manualmente
}

export function useChat(userId?: string): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [activeSessions, setActiveSessions] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [sessionLimitReached, setSessionLimitReached] = useState<boolean>(false);
    const [isNewConversation, setIsNewConversation] = useState<boolean>(true); // Nova propriedade para controlar estado inicial
    const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0); // Timestamp da última mensagem enviada
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

    // Função para carregar sessões únicas do Supabase
    const loadActiveSessions = async () => {
        try {
            console.log('Carregando sessões ativas...');
            const { data, error } = await supabase
                .from('n8n_chat_histories')
                .select('session_id, id')
                .order('id', { ascending: false });  // Ordenar por ID em ordem decrescente (mais recentes primeiro)

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

            // Manter a ordem do banco de dados (agora ordenada por ID)
            data.forEach(item => {
                if (item && item.session_id) {
                    const trimmedId = item.session_id.trim();
                    // Usar o ID limpo como chave para evitar duplicidades
                    if (!uniqueSessionIds.has(trimmedId)) {
                        uniqueSessionIds.set(trimmedId, trimmedId);
                    }
                }
            });

            const sessions = Array.from(uniqueSessionIds.values());
            console.log('Sessões únicas encontradas (ordenadas):', sessions);
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

        // Se estamos em uma nova conversa ou criando uma nova sessão, não carregar mensagens automaticamente
        if (isNewConversation || isCreatingSessionRef.current) {
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

                // Verificamos se temos uma mensagem pendente - se sim, não limpamos as mensagens
                // Isso mantém a mensagem do usuário visível enquanto o backend processa
                if (!pendingMessageRef.current && !isCreatingSessionRef.current) {
                    setMessages([]);
                }

                // Não mudamos o estado de processamento aqui, para manter o indicador "pensando"
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

            // Verificar se temos novas mensagens ou se as mensagens mudaram
            const currentMessagesJSON = JSON.stringify(messagesRef.current);
            const newMessagesJSON = JSON.stringify(sessionMessages);

            // Forçar atualização se for a primeira mensagem após 'isNewConversation'
            const isFirstMessageAfterNewConversation =
                messagesRef.current.length === 1 &&
                messagesRef.current[0].type === 'human' &&
                sessionMessages.length === 2;

            if (newMessagesJSON !== currentMessagesJSON || isFirstMessageAfterNewConversation) {
                console.log(`Atualizando ${sessionMessages.length} mensagens`);

                // Forçar esta atualização com alta prioridade para garantir que a UI reflita as mudanças
                // imediatamente
                setMessages(sessionMessages);

                // Atualizar também a referência
                messagesRef.current = [...sessionMessages];
                lastMessageCountRef.current = sessionMessages.length;

                // Se detectamos que a primeira mensagem foi respondida, forçar verificação adicional
                if (isFirstMessageAfterNewConversation) {
                    console.log('Primeira mensagem respondida detectada, verificando estado...');
                    // Forçar isProcessing para false se a primeira mensagem foi respondida
                    if (sessionMessages[1] && sessionMessages[1].type === 'ai') {
                        console.log('Resposta da IA recebida, definindo isProcessing como false');
                        setIsProcessing(false);
                    }
                }
            } else {
                console.log('Nenhuma alteração nas mensagens, mantendo estado atual');
            }

            // Verificar estado "pensando"
            // Continuamos processando se ainda temos uma mensagem pendente 
            // ou se o número de mensagens AI != number de mensagens human
            const humanMessages = sessionMessages.filter(msg => msg.type === 'human');
            const aiMessages = sessionMessages.filter(msg => msg.type === 'ai');

            // Lógica aprimorada para determinar se estamos esperando resposta
            const isWaitingForResponse = pendingMessageRef.current !== null ||
                humanMessages.length > aiMessages.length;

            // Forçar atualização do status "pensando" mesmo se nenhuma mensagem mudou
            if (isWaitingForResponse !== isProcessing) {
                console.log('Atualizando estado de processamento:', isWaitingForResponse);
                setIsProcessing(isWaitingForResponse);
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
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
            // Não definir erro aqui, apenas logar, para não interromper o polling
        }
    }, [isProcessing, sessionLimitReached, isNewConversation, sessionId]);

    // Inicializar o hook
    useEffect(() => {
        if (!userId) return;

        const initialize = async () => {
            try {
                console.log('Inicializando chat para usuário:', userId);
                setLoading(true);

                // Carregamos apenas a lista de sessões ativas, mas não carregamos nenhuma mensagem
                const sessions = await loadActiveSessions();
                setActiveSessions(sessions);

                // Criar novo sessionId para conversa em branco, 
                // mas não aplicar até que o usuário realmente interaja
                const newSessionId = uuidv4();
                console.log('Gerando ID para nova possível sessão:', newSessionId);
                setSessionId(newSessionId);

                // Definir explicitamente que estamos em uma nova conversa
                setIsNewConversation(true);

                // Resetar todas as mensagens para mostrar tela vazia
                setMessages([]);

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

    // Configurar polling apenas quando explicitamente solicitado
    // (Não fazemos mais isso automaticamente quando o sessionId muda)
    useEffect(() => {
        // Cleanup quando o componente for desmontado
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                console.log('Polling interrompido ao desmontar o componente');
            }
        };
    }, []);

    // Mudar sessão - agora com transição mais suave
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

            // Cancelar polling existente
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log('Polling anterior cancelado');
            }

            // Definir loading temporário para esta ação específica
            setLoading(true);

            // Limpar qualquer mensagem pendente ao mudar de sessão
            pendingMessageRef.current = null;

            // Garantir que o novo sessionId esteja limpo
            const trimmedNewSessionId = newSessionId.trim();
            console.log('Mudando para sessão:', trimmedNewSessionId);

            // Atualizar o gerenciador de sessões
            sessionManager.currentSessionId = trimmedNewSessionId;

            // Definir que não estamos mais em uma nova conversa
            setIsNewConversation(false);

            // Atualizar o sessionId
            setSessionId(trimmedNewSessionId);
            setError(null);

            // NÃO limpar as mensagens imediatamente para evitar piscar
            // Vamos carregar as novas mensagens e depois substituir em uma única atualização

            // Carregar as mensagens desta sessão explicitamente
            loadMessagesForSession(trimmedNewSessionId).then(() => {
                // Só iniciar polling se ainda estamos na mesma sessão
                if (sessionManager.currentSessionId === trimmedNewSessionId) {
                    console.log(`Iniciando polling para sessão selecionada: ${trimmedNewSessionId}`);
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                    }

                    pollingIntervalRef.current = setInterval(() => {
                        // Verificar sessão atual antes de cada polling
                        if (!isCreatingSessionRef.current &&
                            sessionManager.currentSessionId === trimmedNewSessionId &&
                            !sessionManager.isChangingSession) {
                            loadMessagesForSession(trimmedNewSessionId);
                        }
                    }, POLLING_INTERVAL);
                } else {
                    console.log('Sessão mudou durante o carregamento, polling não iniciado');
                }

                // Desativar loading
                setLoading(false);
            }).catch(err => {
                console.error('Erro ao carregar mensagens da sessão:', err);
                setLoading(false);
            }).finally(() => {
                // Liberar o bloqueio de mudança de sessão
                sessionManager.isChangingSession = false;
            });
        } catch (error) {
            console.error('Erro ao mudar sessão:', error);
            // Garantir que o estado de mudança de sessão seja liberado em caso de erro
            sessionManager.isChangingSession = false;
            setLoading(false);
        }
    };

    // Criar nova sessão - MODIFICADA sem chamadas de hook internas
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
                pollingIntervalRef.current = null;
                console.log('Polling interrompido durante criação de nova sessão');
            }

            // Limpar qualquer mensagem pendente
            pendingMessageRef.current = null;

            // Usar o ID específico se fornecido, ou gerar um novo
            const newSessionId = specificId ? specificId : uuidv4();
            console.log('ID da nova sessão:', newSessionId);

            // Atualizar gerenciador de sessões
            sessionManager.currentSessionId = newSessionId;

            // Limpar os estados - tudo em um batch para evitar re-renderizações intermediárias
            setSessionLimitReached(false);
            setIsProcessing(false);
            setError(null);
            setMessages([]);

            // Indicar que estamos em uma nova conversa
            setIsNewConversation(true);

            // Atualizar a lista de sessões ativas colocando a nova sessão no topo
            // Usar versão funcional do setState para garantir o estado mais recente
            setActiveSessions(prevSessions => [newSessionId, ...prevSessions.filter(id => id.trim() !== newSessionId.trim())]);

            // Atualizar o ID da sessão atual
            setSessionId(newSessionId);
            console.log('ID da sessão atual atualizado para:', newSessionId);

            // Limpar timers existentes
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }

            // Permitir que novas sessões sejam criadas novamente após um breve delay
            setTimeout(() => {
                isCreatingSessionRef.current = false;
                console.log('Estado de criação de sessão resetado');
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

            // Criar objeto de mensagem do usuário
            const userMessage: ChatMessage = {
                type: 'human',
                content: content.trim()
            };

            // Armazenar a mensagem pendente para referência
            pendingMessageRef.current = userMessage;

            // Atualizar UI imediatamente (apenas localmente)
            setMessages(prev => [...prev, userMessage]);

            // Ativar o indicador "pensando" imediatamente, sem esperar pelo polling
            setIsProcessing(true);

            // Verificar se estamos em uma nova conversa
            if (isNewConversation) {
                console.log('Esta é a primeira mensagem em uma nova conversa');
                // Não precisamos fazer nada especial, apenas usar o ID de sessão atual
                // e marcar que não estamos mais em uma nova conversa
                setIsNewConversation(false);

                // Se for a primeira mensagem de uma nova conversa, 
                // garantir que esta sessão apareça na lista de sessões ativas imediatamente
                const currentTrimmedId = trimmedSessionId.trim();
                // Verificar se esta sessão já está na lista
                if (!activeSessions.some(id => id.trim() === currentTrimmedId)) {
                    // Adicionar no topo da lista de sessões ativas
                    setActiveSessions(prev => [currentTrimmedId, ...prev]);
                    console.log('Adicionada nova sessão à lista ativa:', currentTrimmedId);
                }

                // Iniciar polling agora que temos uma conversa ativa - com verificação adicional
                console.log(`Iniciando polling a cada ${POLLING_INTERVAL}ms para a nova conversa`);
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }

                // Forçar um carregamento inicial imediato antes de iniciar o polling
                await loadMessagesForSession(trimmedSessionId);

                pollingIntervalRef.current = setInterval(() => {
                    // Verificação adicional - confirmar que ainda estamos na mesma sessão
                    if (!isCreatingSessionRef.current && sessionId.trim() === trimmedSessionId) {
                        console.log(`Executando polling para mensagem inicial: ${trimmedSessionId}`);
                        loadMessagesForSession(trimmedSessionId);
                    } else {
                        console.log('Sessão mudou, ajustando polling');
                        // Se a sessão mudou, atualizar o polling para a nova sessão
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = setInterval(() => {
                                const currentSessionIdTrimmed = sessionId.trim();
                                loadMessagesForSession(currentSessionIdTrimmed);
                            }, POLLING_INTERVAL);
                        }
                    }
                }, POLLING_INTERVAL);
            }

            // Verificar limite de mensagens novamente
            const humanCount = await countHumanMessages(trimmedSessionId);
            console.log(`Contagem de mensagens humanas: ${humanCount}/${MAX_HUMAN_MESSAGES_PER_SESSION}`);

            if (humanCount >= MAX_HUMAN_MESSAGES_PER_SESSION) {
                setSessionLimitReached(true);
                setError('Limite de mensagens atingido para esta conversa. Crie uma nova conversa para continuar.');
                return;
            }

            setError(null);

            // Se for a primeira mensagem de uma nova conversa, 
            // garantir que esta sessão apareça na lista de sessões ativas imediatamente
            if (isNewConversation) {
                const currentTrimmedId = trimmedSessionId.trim();
                // Verificar se esta sessão já está na lista
                if (!activeSessions.some(id => id.trim() === currentTrimmedId)) {
                    // Adicionar no topo da lista de sessões ativas
                    setActiveSessions(prev => [currentTrimmedId, ...prev]);
                    console.log('Adicionada nova sessão à lista ativa:', currentTrimmedId);
                }
            }

            // Atualizar o timestamp para forçar a atualização da lista de conversas
            setLastMessageTimestamp(Date.now());

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
        sessionLimitReached,
        isNewConversation,
        lastMessageTimestamp,
        resetProcessingState
    };
}