import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import TypingEffect from '@/components/chat/TypingEffect';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    activeSessions: string[];
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => Promise<string | null>;
    userId?: string;
    isCreatingSession?: boolean;
    isNewConversation?: boolean;
    lastMessageTimestamp?: number;
}

interface SessionInfo {
    id: string;
    firstMessage: string;
    isNew?: boolean;
}

// Chave para o localStorage - sessões que já mostraram efeito de digitação
const ANIMATION_SHOWN_SESSIONS_KEY = 'oracle_animation_shown_sessions';

export default function Sidebar({
    isOpen,
    toggleSidebar,
    activeSessions,
    currentSessionId,
    onSessionSelect,
    onNewSession,
    userId,
    isCreatingSession = false,
    isNewConversation = false,
    lastMessageTimestamp = 0
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [sessionInfos, setSessionInfos] = useState<Map<string, SessionInfo>>(new Map());
    const { isDarkMode } = useTheme();

    // Referência para controlar a carga inicial
    const isInitialLoad = useRef(true);
    // Referência para detectar se é o primeiro carregamento da página atual (diferente da carga inicial)
    const isFirstPageLoadRef = useRef(true);
    // Conjunto para armazenar IDs de sessões onde o efeito já foi mostrado
    const animationShownSessions = useRef<Set<string>>(new Set());
    // Última sessão criada
    const lastCreatedSessionId = useRef<string | null>(null);
    // Polling específico para novas sessões
    const newSessionPollingRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar lista de sessões que já mostraram animação do localStorage
    useEffect(() => {
        try {
            // Se for o primeiro carregamento desta página, ignorar o localStorage para permitir animações
            if (isFirstPageLoadRef.current) {
                console.log('Primeiro carregamento da página: permitindo animações para todas as sessões');
                // Não carregar do localStorage, deixar o conjunto vazio para permitir animações
                animationShownSessions.current = new Set();
                // Marcar que não é mais o primeiro carregamento
                isFirstPageLoadRef.current = false;
            } else {
                // Comportamento normal para recargas subsequentes
                const storedSessions = localStorage.getItem(ANIMATION_SHOWN_SESSIONS_KEY);
                if (storedSessions) {
                    const sessionsArray = JSON.parse(storedSessions);
                    if (Array.isArray(sessionsArray)) {
                        animationShownSessions.current = new Set(sessionsArray);
                        console.log('Sessões que já mostraram animação:', sessionsArray.length);
                    }
                }
            }
        } catch (err) {
            console.error('Erro ao carregar informações do localStorage:', err);
        }
    }, []);

    // Função para marcar uma sessão como já tendo mostrado a animação
    const markAnimationShown = (sessionId: string) => {
        const trimmedId = sessionId.trim();
        if (!animationShownSessions.current.has(trimmedId)) {
            animationShownSessions.current.add(trimmedId);

            // Persistir no localStorage
            try {
                localStorage.setItem(
                    ANIMATION_SHOWN_SESSIONS_KEY,
                    JSON.stringify(Array.from(animationShownSessions.current))
                );
            } catch (err) {
                console.error('Erro ao salvar no localStorage:', err);
            }
        }
    };

    // Usar a prop isCreatingSession para controlar o estado
    useEffect(() => {
        if (isCreatingSession) {
            setCreating(true);
        } else {
            const timer = setTimeout(() => {
                setCreating(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isCreatingSession]);

    // Implementar um polling específico para a última sessão criada
    useEffect(() => {
        // Limpar polling existente
        if (newSessionPollingRef.current) {
            clearInterval(newSessionPollingRef.current);
            newSessionPollingRef.current = null;
        }

        // Se tivermos uma nova sessão e o lastMessageTimestamp mudar (indicando atividade)
        if (lastCreatedSessionId.current && lastMessageTimestamp > 0) {
            console.log('Iniciando polling específico para nova sessão:', lastCreatedSessionId.current);

            // Função para carregar apenas a sessão específica
            const loadNewSessionInfo = async () => {
                if (!lastCreatedSessionId.current) return;

                const sessionId = lastCreatedSessionId.current;
                const trimmedSessionId = sessionId.trim();

                try {
                    console.log('Verificando atualização de título para sessão nova:', trimmedSessionId);

                    // Buscar mensagens para esta sessão específica
                    const { data, error } = await supabase
                        .from('n8n_chat_histories')
                        .select('message')
                        .or(`session_id.eq.${trimmedSessionId},session_id.eq. ${trimmedSessionId}`)
                        .order('id');

                    if (error) {
                        console.error('Erro ao buscar mensagens:', error);
                        return;
                    }

                    if (!data || data.length === 0) {
                        console.log('Nenhuma mensagem encontrada ainda para a nova sessão');
                        return;
                    }

                    // Filtrar mensagens humanas
                    const humanMessages = data.filter(item => {
                        try {
                            return item &&
                                item.message &&
                                typeof item.message === 'object' &&
                                item.message.type === 'human' &&
                                typeof item.message.content === 'string';
                        } catch {
                            return false;
                        }
                    });

                    if (humanMessages.length === 0) {
                        console.log('Nenhuma mensagem humana encontrada ainda');
                        return;
                    }

                    // Obter primeira mensagem humana
                    const content = humanMessages[0].message.content;
                    const firstMessage = content.length > 30
                        ? content.substring(0, 30) + '...'
                        : content;

                    console.log('Primeira mensagem para a nova sessão:', firstMessage);

                    // Verificar se a mensagem é diferente da atual
                    const currentInfo = sessionInfos.get(trimmedSessionId);
                    const currentMessage = currentInfo?.firstMessage || 'Nova conversa';

                    if (currentMessage === 'Nova conversa' && firstMessage !== 'Nova conversa') {
                        console.log('Atualizando título da nova sessão:', firstMessage);

                        // Atualizar o sessionInfos
                        const updatedInfos = new Map(sessionInfos);
                        updatedInfos.set(trimmedSessionId, {
                            id: trimmedSessionId,
                            firstMessage,
                            isNew: true // Mostrar efeito de digitação
                        });

                        setSessionInfos(updatedInfos);

                        // Parar o polling depois de encontrar o título
                        if (newSessionPollingRef.current) {
                            clearInterval(newSessionPollingRef.current);
                            newSessionPollingRef.current = null;
                        }
                    }
                } catch (err) {
                    console.error('Erro ao buscar título da nova sessão:', err);
                }
            };

            // Verificar imediatamente
            loadNewSessionInfo();

            // Iniciar polling para esta sessão específica (a cada 1 segundo)
            newSessionPollingRef.current = setInterval(loadNewSessionInfo, 1000);

            // Limpar após 30 segundos no máximo
            setTimeout(() => {
                if (newSessionPollingRef.current) {
                    clearInterval(newSessionPollingRef.current);
                    newSessionPollingRef.current = null;
                    console.log('Polling específico para nova sessão finalizado (timeout)');
                }
            }, 30000);

            // Limpar polling se o componente desmontar
            return () => {
                if (newSessionPollingRef.current) {
                    clearInterval(newSessionPollingRef.current);
                    newSessionPollingRef.current = null;
                }
            };
        }
    }, [lastMessageTimestamp, lastCreatedSessionId.current, sessionInfos]);

    // Efeito para carregar informações das sessões 
    useEffect(() => {
        const loadSessionInfos = async () => {
            if (activeSessions.length === 0) return;

            console.log('Carregando informações para sessões:', activeSessions);

            // Clone o Map para manter estados não alterados
            const newSessionInfos = new Map<string, SessionInfo>(sessionInfos);

            const sessionsToLoad = activeSessions.filter(sessionId => {
                const trimmedId = sessionId.trim();
                const existingInfo = sessionInfos.get(trimmedId);
                const isLastCreated = trimmedId === lastCreatedSessionId.current;

                // Lógica de quando carregar:
                // 1. Na primeira carga, carregamos todas
                // 2. Para a última sessão criada, sempre recarregamos (para pegar título atualizado)
                // 3. Para as demais, só carregamos se não existirem ou forem "Nova conversa"
                return isInitialLoad.current ||
                    isLastCreated ||
                    !existingInfo ||
                    existingInfo.firstMessage === "Nova conversa";
            });

            console.log(`Carregando ${sessionsToLoad.length} sessões (inicial: ${isInitialLoad.current})`);

            await Promise.all(sessionsToLoad.map(async (sessionId) => {
                try {
                    const trimmedSessionId = sessionId.trim();
                    console.log('Carregando info para sessão:', trimmedSessionId);

                    const { data, error } = await supabase
                        .from('n8n_chat_histories')
                        .select('message')
                        .or(`session_id.eq.${trimmedSessionId},session_id.eq. ${trimmedSessionId}`)
                        .order('id');

                    if (error) {
                        console.error('Erro ao carregar mensagens:', error);
                        throw error;
                    }

                    let firstMessage = 'Nova conversa';

                    if (data && data.length > 0) {
                        const humanMessages = data.filter(item => {
                            try {
                                return item &&
                                    item.message &&
                                    typeof item.message === 'object' &&
                                    item.message.type === 'human' &&
                                    typeof item.message.content === 'string';
                            } catch {
                                return false;
                            }
                        });

                        if (humanMessages.length > 0) {
                            const content = humanMessages[0].message.content;
                            firstMessage = content.length > 30
                                ? content.substring(0, 30) + '...'
                                : content;
                        }
                    }

                    const existingInfo = sessionInfos.get(trimmedSessionId);
                    const hasContent = firstMessage !== 'Nova conversa';
                    const isLastCreated = trimmedSessionId === lastCreatedSessionId.current;
                    const hasShownAnimation = animationShownSessions.current.has(trimmedSessionId);

                    // Lógica de quando mostrar animação:
                    let shouldAnimate = false;

                    if (isLastCreated && hasContent) {
                        // Para a última sessão criada, sempre animar quando tiver conteúdo
                        const currentMessage = existingInfo?.firstMessage || '';
                        shouldAnimate = currentMessage !== firstMessage;
                    } else if (isInitialLoad.current || isFirstPageLoadRef.current) {
                        // Na carga inicial da app OU primeiro carregamento da página, animar se tem conteúdo
                        shouldAnimate = hasContent;
                    } else if (existingInfo) {
                        // Para sessões existentes, animar apenas se mudou de "Nova conversa" para conteúdo real
                        // E não tiver mostrado animação antes
                        shouldAnimate = hasContent &&
                            existingInfo.firstMessage === 'Nova conversa' &&
                            !hasShownAnimation;
                    }

                    // Atualizar as informações da sessão
                    newSessionInfos.set(trimmedSessionId, {
                        id: trimmedSessionId,
                        firstMessage,
                        isNew: shouldAnimate
                    });

                    // Se esta é a sessão ativa, nunca mostrar animação
                    if (trimmedSessionId === currentSessionId && !isNewConversation) {
                        const info = newSessionInfos.get(trimmedSessionId);
                        if (info && info.isNew) {
                            newSessionInfos.set(trimmedSessionId, {
                                ...info,
                                isNew: false
                            });

                            // Marcar como já tendo mostrado
                            markAnimationShown(trimmedSessionId);
                        }
                    }
                } catch (err) {
                    console.error('Erro ao processar sessão:', err);
                    const trimmedId = sessionId.trim();
                    newSessionInfos.set(trimmedId, {
                        id: trimmedId,
                        firstMessage: `Conversa ${trimmedId.substring(0, 5)}...`,
                        isNew: false
                    });
                }
            }));

            // Atualizar estado
            setSessionInfos(newSessionInfos);

            // Após a primeira carga, desativar a flag
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            }
        };

        loadSessionInfos();
    }, [activeSessions, lastMessageTimestamp, currentSessionId, isNewConversation]);

    const handleNewSession = async () => {
        if (creating || isCreatingSession) return;

        setCreating(true);
        try {
            console.log("Iniciando criação de nova sessão...");
            const newSessionId = await onNewSession();

            if (newSessionId) {
                // Registrar a nova sessão
                lastCreatedSessionId.current = newSessionId;
                console.log("Nova sessão criada, ID registrado:", newSessionId);

                // Adicionar entrada inicial ao sessionInfos
                const trimmedId = newSessionId.trim();
                const updatedInfos = new Map(sessionInfos);
                updatedInfos.set(trimmedId, {
                    id: trimmedId,
                    firstMessage: 'Nova conversa',
                    isNew: false // Não mostrar animação até ter conteúdo real
                });
                setSessionInfos(updatedInfos);
            }
        } catch (error) {
            console.error("Erro ao criar nova sessão:", error);
        }
    };

    // MODIFICADO: handleSelectSession mais simples sem delays condicionais
    const handleSelectSession = (sessionId: string) => {
        if (creating) return;

        const trimmedId = sessionId.trim();
        console.log('Selecionando sessão:', trimmedId);

        // IMPORTANTE: Sempre desativar a flag de primeira carga quando o usuário interage
        isFirstPageLoadRef.current = false;

        // Desativar a animação nesta sessão e marcá-la como já mostrada
        const updatedInfos = new Map(sessionInfos);

        // Desativar animações para TODAS as sessões para evitar re-animações
        for (const [id, sessionInfo] of updatedInfos.entries()) {
            if (sessionInfo.isNew) {
                updatedInfos.set(id, { ...sessionInfo, isNew: false });
                markAnimationShown(id);
            }
        }

        setSessionInfos(updatedInfos);

        // Chamar o seletor de sessão imediatamente, sem delay
        onSessionSelect(trimmedId);
    };

    const hasDuplicateSessions = (): boolean => {
        if (activeSessions.length <= 1) return false;
        const uniqueIds = new Set(activeSessions.map(id => id.trim()));
        return uniqueIds.size !== activeSessions.length;
    };

    const sidebarStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        width: '280px',
        backgroundColor: 'var(--background-elevated)',
        borderRight: '1px solid var(--border-color)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out, background-color 0.3s'
    };

    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        sidebarStyle.position = 'relative';
        sidebarStyle.transform = 'translateX(0)';
    }

    const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())));

    return (
        <div style={sidebarStyle}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--text-primary)'
                }}>
                    Conversas
                </h2>
                <button
                    onClick={toggleSidebar}
                    style={{
                        padding: '8px',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: window.innerWidth < 768 ? 'block' : 'none'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 5L5 15M5 5L15 15" />
                    </svg>
                </button>
            </div>

            <div style={{ padding: '16px' }}>
                <button
                    onClick={handleNewSession}
                    disabled={creating || isCreatingSession}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 16px',
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: (creating || isCreatingSession) ? 'not-allowed' : 'pointer',
                        opacity: (creating || isCreatingSession) ? 0.7 : 1,
                        transition: 'background-color 0.2s',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {(creating || isCreatingSession) ? (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            <svg
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    marginRight: '8px',
                                    animation: 'spin 1s linear infinite'
                                }}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Criando...
                        </span>
                    ) : (
                        <>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: '8px' }}
                            >
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Nova Conversa
                        </>
                    )}
                </button>
            </div>

            {hasDuplicateSessions() && (
                <div style={{
                    padding: '12px 16px',
                    margin: '0 12px 12px 12px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderLeft: '4px solid var(--warning-color)',
                    color: 'var(--warning-color)',
                    borderRadius: '4px',
                    fontSize: '13px'
                }}>
                    <p>Foram encontradas conversas duplicadas. Isso será corrigido após atualização.</p>
                </div>
            )}

            <div style={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '8px 12px'
            }}>
                {uniqueSessions.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        padding: '24px 16px',
                        fontSize: '14px'
                    }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                margin: '0 auto 12px auto',
                                opacity: 0.5
                            }}
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <line x1="9" y1="10" x2="15" y2="10"></line>
                        </svg>
                        <p>Nenhuma conversa encontrada</p>
                        <p style={{ marginTop: '8px', fontSize: '13px' }}>Clique em Nova Conversa para começar</p>
                    </div>
                ) : (
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        {uniqueSessions.map((session) => {
                            const trimmedSession = session.trim();
                            const isActive = currentSessionId.trim() === trimmedSession && !isNewConversation;

                            return (
                                <li key={trimmedSession}>
                                    <button
                                        onClick={() => handleSelectSession(trimmedSession)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: isActive
                                                ? 'var(--background-subtle)'
                                                : 'transparent',
                                            color: isActive
                                                ? 'var(--text-primary)'
                                                : 'var(--text-secondary)',
                                            border: 'none',
                                            cursor: creating ? 'not-allowed' : 'pointer',
                                            transition: 'background-color 0.2s',
                                            fontWeight: isActive ? '500' : 'normal',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            opacity: creating ? 0.6 : 1
                                        }}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        <span style={{
                                            fontWeight: '500',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {sessionInfos.has(trimmedSession) && sessionInfos.get(trimmedSession)!.isNew ? (
                                                <TypingEffect
                                                    text={sessionInfos.get(trimmedSession)!.firstMessage}
                                                    typingSpeed={15}
                                                    onComplete={() => {
                                                        // Remover flag isNew e marcar como já mostrada
                                                        const updatedInfos = new Map(sessionInfos);
                                                        const info = updatedInfos.get(trimmedSession);
                                                        if (info) {
                                                            updatedInfos.set(trimmedSession, { ...info, isNew: false });
                                                            setSessionInfos(updatedInfos);

                                                            // Marcar como já mostrada
                                                            markAnimationShown(trimmedSession);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                sessionInfos.has(trimmedSession)
                                                    ? sessionInfos.get(trimmedSession)!.firstMessage
                                                    : `Conversa ${trimmedSession.substring(0, 8)}...`
                                            )}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border-color)'
            }}>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    padding: '0 4px',
                    marginBottom: '8px'
                }}>
                    Em breve:
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--background-subtle)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'not-allowed',
                            opacity: 0.7
                        }}
                        disabled
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Limpar conversas
                    </button>
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--background-subtle)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'not-allowed',
                            opacity: 0.7
                        }}
                        disabled
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Renomear conversa
                    </button>
                </div>
            </div>
        </div>
    );
}