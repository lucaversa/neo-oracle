import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { SessionInfo } from '@/types/chat';
import SessionEditor from '@/components/chat/SessionEditor';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    activeSessions: string[];
    sessionInfos: Map<string, SessionInfo>;
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => Promise<string | null>;
    onRenameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
    onDeleteSession: (sessionId: string) => Promise<boolean>;
    userId?: string;
    isCreatingSession?: boolean;
    isNewConversation?: boolean;
    lastMessageTimestamp?: number;
    isProcessing?: boolean;
}

export default function Sidebar({
    isOpen,
    toggleSidebar,
    activeSessions,
    sessionInfos,
    currentSessionId,
    onSessionSelect,
    onNewSession,
    onRenameSession,
    onDeleteSession,
    userId,
    isCreatingSession = false,
    isNewConversation = false,
    lastMessageTimestamp = 0,
    isProcessing = false
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const { isDarkMode } = useTheme();

    // Modificações para scroll infinito
    const [displayLimit, setDisplayLimit] = useState<number>(20); // Exibir inicialmente apenas 10 chats
    const [visibleSessions, setVisibleSessions] = useState<string[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const sessionsContainerRef = useRef<HTMLDivElement>(null);

    // Estado para controlar a altura do container de sessões
    const [containerHeight, setContainerHeight] = useState<number>(450); // Altura padrão inicial maior

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

    // Update visible sessions when active sessions change
    useEffect(() => {
        // Filter the current empty session if it's new
        const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())))
            .filter(id => !(isNewConversation && id === currentSessionId));

        // Set visible sessions based on display limit
        setVisibleSessions(uniqueSessions.slice(0, displayLimit));

        // Verificar se precisamos carregar mais em caso de container grande
        setTimeout(() => {
            const container = sessionsContainerRef.current;
            if (container) {
                const { scrollHeight, clientHeight } = container;
                // Se após o carregamento inicial não temos scroll suficiente, carregar mais
                if (scrollHeight <= clientHeight && uniqueSessions.length > displayLimit) {
                    loadMoreSessions();
                }
            }
        }, 300); // Pequeno delay para garantir que o DOM foi atualizado
    }, [activeSessions, currentSessionId, displayLimit, isNewConversation, lastMessageTimestamp]);

    // Função para carregar mais sessões quando o usuário rolar para baixo
    const loadMoreSessions = useCallback(() => {
        const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())))
            .filter(id => !(isNewConversation && id === currentSessionId));

        if (isLoadingMore || visibleSessions.length >= uniqueSessions.length) {
            return;
        }

        setIsLoadingMore(true);

        // Simular um pequeno atraso para o carregamento
        setTimeout(() => {
            setDisplayLimit(prevLimit => prevLimit + 10); // Carregar mais 10 sessões
            setIsLoadingMore(false);

            // Verificar se precisamos carregar mais em caso de container grande
            setTimeout(() => {
                const container = sessionsContainerRef.current;
                if (container) {
                    const { scrollHeight, clientHeight } = container;
                    // Se após carregar mais, ainda não temos scroll suficiente, carregar mais
                    if (scrollHeight <= clientHeight && visibleSessions.length < uniqueSessions.length) {
                        loadMoreSessions();
                    }
                }
            }, 100); // Pequeno delay para garantir que o DOM foi atualizado
        }, 200);
    }, [activeSessions, currentSessionId, isNewConversation, isLoadingMore, visibleSessions.length]);

    // Calcular a altura ideal do container baseado na altura da janela
    useEffect(() => {
        const calculateContainerHeight = () => {
            // Calcula uma altura que seja aproximadamente 85% da altura da janela,
            // mas não menos que 450px para garantir um tamanho adequado
            const windowHeight = window.innerHeight;
            const calculatedHeight = Math.max(450, windowHeight * 0.85 - 140); // 140px para cabeçalho e botão
            setContainerHeight(calculatedHeight);
        };

        // Calcular na inicialização
        calculateContainerHeight();

        // Recalcular quando a janela for redimensionada
        window.addEventListener('resize', calculateContainerHeight);
        return () => {
            window.removeEventListener('resize', calculateContainerHeight);
        };
    }, []);

    // Adicionar listener de scroll para detectar quando o usuário chega próximo ao fim da lista
    useEffect(() => {
        const container = sessionsContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;

            // Se o usuário rolou até próximo do final (80px do fim)
            if (scrollHeight - scrollTop - clientHeight < 80) {
                loadMoreSessions();
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [loadMoreSessions]);

    const handleNewSession = async () => {
        // Não criar nova sessão se já estiver criando ou se já há uma conversa nova ou se estiver processando
        if (creating || isCreatingSession || isNewConversation || isProcessing) {
            console.log("Já existe uma conversa vazia, está criando ou processando. Ignorando.");
            return;
        }

        setCreating(true);
        try {
            console.log("Iniciando criação de nova sessão...");
            await onNewSession();
        } catch (error) {
            console.error("Erro ao criar nova sessão:", error);
        } finally {
            // Garantir que o estado creating seja resetado
            setTimeout(() => {
                setCreating(false);
            }, 500);
        }
    };

    const handleSelectSession = (sessionId: string) => {
        if (creating || isProcessing) return;

        // Cancelar qualquer edição em andamento
        setEditingSessionId(null);
        setShowDeleteConfirm(null);

        const trimmedId = sessionId.trim();
        console.log('Selecionando sessão:', trimmedId);

        // Chamar o seletor de sessão imediatamente, sem delay
        onSessionSelect(trimmedId);
    };

    // Função simplificada para iniciar edição
    const handleStartEdit = (sessionId: string) => {
        setEditingSessionId(sessionId.trim());
    };

    // Função para lidar com sucesso na edição
    const handleEditSuccess = (sessionId: string, newTitle: string) => {
        console.log(`Título atualizado com sucesso para "${newTitle}"`);

        // Tenta chamar a função onRenameSession dos props
        onRenameSession(sessionId, newTitle)
            .then(success => {
                console.log('Resultado da operação de renomeação pelo hook:', success);
            })
            .catch(err => {
                console.error('Erro na operação de renomeação pelo hook:', err);
            });

        // Esconda o editor de qualquer forma
        setEditingSessionId(null);
    };

    const confirmDeleteSession = async (sessionId: string) => {
        try {
            const success = await onDeleteSession(sessionId);
            if (success) {
                console.log('Sessão excluída com sucesso');
                setShowDeleteConfirm(null);
            }
        } catch (error) {
            console.error('Erro ao excluir sessão:', error);
        }
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

    // Filter out duplicate sessions and current empty session if it's new
    const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())))
        .filter(id => !(isNewConversation && id === currentSessionId));

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

            <div style={{ padding: '16px 16px 24px 16px' }}>
                <button
                    onClick={handleNewSession}
                    disabled={creating || isCreatingSession || isNewConversation || isProcessing}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 16px',
                        backgroundColor: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: (creating || isCreatingSession || isNewConversation || isProcessing) ? 'not-allowed' : 'pointer',
                        opacity: (creating || isCreatingSession || isNewConversation || isProcessing) ? 0.7 : 1,
                        transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-md)',
                        transform: 'translateY(0)',
                        fontSize: '15px'
                    }}
                    onMouseOver={(e) => {
                        if (!(creating || isCreatingSession || isNewConversation || isProcessing)) {
                            e.currentTarget.style.backgroundColor = '#4338ca';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
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
                    ) : isProcessing ? (
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
                            Aguarde...
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

            <div
                ref={sessionsContainerRef}
                style={{
                    height: `${containerHeight}px`, // Altura fixa para garantir scroll
                    maxHeight: 'calc(100vh - 140px)', // Limitar altura máxima com base na altura da tela
                    overflowY: 'auto',
                    padding: '8px 12px',
                    // Adicionando elementos visuais de delimitação
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.4)',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                {visibleSessions.length === 0 ? (
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
                        {visibleSessions.map((session) => {
                            const trimmedSession = session.trim();
                            const isActive = currentSessionId.trim() === trimmedSession && !isNewConversation;
                            const sessionInfo = sessionInfos.get(trimmedSession);
                            const isEditing = editingSessionId === trimmedSession;
                            const isConfirmingDelete = showDeleteConfirm === trimmedSession;

                            return (
                                <li key={trimmedSession} className="session-item" style={{ position: 'relative' }}>
                                    {isEditing && userId ? (
                                        // Modo de edição do título com o novo componente
                                        <SessionEditor
                                            sessionId={trimmedSession}
                                            userId={userId}
                                            initialTitle={sessionInfo?.title || 'Nova Conversa'}
                                            onCancel={() => setEditingSessionId(null)}
                                            onSuccess={(newTitle) => handleEditSuccess(trimmedSession, newTitle)}
                                        />
                                    ) : isConfirmingDelete ? (
                                        // Confirmação de exclusão
                                        <div style={{
                                            padding: '10px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            borderRadius: '8px',
                                            borderLeft: '3px solid var(--error-color)'
                                        }}>
                                            <p style={{
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                marginBottom: '8px'
                                            }}>
                                                Excluir esta conversa?
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                gap: '6px',
                                                justifyContent: 'flex-end'
                                            }}>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(null)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        backgroundColor: 'var(--background-main)',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteSession(trimmedSession)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        backgroundColor: 'var(--error-color)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Exibição normal da sessão
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            borderRadius: '8px',
                                            backgroundColor: isActive
                                                ? 'var(--background-subtle)'
                                                : 'transparent',
                                            transition: 'background-color 0.2s',
                                            position: 'relative',
                                            padding: '4px'
                                        }}>
                                            <button
                                                onClick={() => handleSelectSession(trimmedSession)}
                                                style={{
                                                    flex: 1,
                                                    textAlign: 'left',
                                                    padding: '10px 12px',
                                                    backgroundColor: 'transparent',
                                                    color: isActive
                                                        ? 'var(--text-primary)'
                                                        : 'var(--text-secondary)',
                                                    border: 'none',
                                                    cursor: creating || isProcessing ? 'not-allowed' : 'pointer',
                                                    fontWeight: isActive ? '500' : 'normal',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    opacity: creating || isProcessing ? 0.6 : 1
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
                                                    {sessionInfo?.title || `Conversa ${trimmedSession.substring(0, 6)}`}
                                                </span>
                                            </button>

                                            {/* Botões de edição simplificados */}
                                            <div style={{
                                                display: 'flex',
                                                gap: '4px',
                                                marginRight: '8px'
                                            }}>
                                                {/* Botão de edição */}
                                                <button
                                                    onClick={() => handleStartEdit(trimmedSession)}
                                                    style={{
                                                        padding: '8px',
                                                        backgroundColor: 'var(--background-subtle)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>

                                                {/* Botão de exclusão */}
                                                <button
                                                    onClick={() => setShowDeleteConfirm(trimmedSession)}
                                                    style={{
                                                        padding: '8px',
                                                        backgroundColor: 'var(--background-subtle)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}

                        {/* Indicador de carregamento quando estiver carregando mais chats */}
                        {isLoadingMore && (
                            <li style={{
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '10px 0'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--border-color)',
                                    borderTopColor: 'var(--primary-color)',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                            </li>
                        )}

                        {/* Espaço adicional no final da lista para garantir que tem área suficiente para scroll */}
                        {visibleSessions.length > 0 && visibleSessions.length < uniqueSessions.length && (
                            <li style={{
                                height: '80px', // Espaço extra maior para garantir que tem área para scroll
                                opacity: 0
                            }}></li>
                        )}

                        {/* Indicador visual de fim da lista */}
                        {visibleSessions.length > 0 && (
                            <li style={{
                                padding: '15px 0',
                                textAlign: 'center',
                                fontSize: '13px',
                                color: 'var(--text-tertiary)',
                                borderTop: '1px solid var(--border-subtle)',
                                marginTop: '10px'
                            }}>
                                {visibleSessions.length < uniqueSessions.length
                                    ? 'Role para ver mais conversas'
                                    : 'Fim da lista de conversas'}
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Ícone do Oráculo (olho) para ocupar o espaço na parte inferior */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 0',
                marginTop: 'auto',
                opacity: 0.8
            }}>
                <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)',
                    boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    margin: '0 auto 10px auto',
                    transition: 'all 0.3s ease'
                }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="50"
                        height="50"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isDarkMode ? "rgba(255, 255, 255, 0.8)" : "rgba(79, 70, 229, 0.8)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Olho principal */}
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>

                        {/* Raios ao redor do olho */}
                        <line className="pulse-line" x1="12" y1="5" x2="12" y2="3"></line>
                        <line className="pulse-line" x1="17" y1="7" x2="19" y2="5"></line>
                        <line className="pulse-line" x1="19" y1="12" x2="21" y2="12"></line>
                        <line className="pulse-line" x1="17" y1="17" x2="19" y2="19"></line>
                        <line className="pulse-line" x1="12" y1="19" x2="12" y2="21"></line>
                        <line className="pulse-line" x1="7" y1="17" x2="5" y2="19"></line>
                        <line className="pulse-line" x1="5" y1="12" x2="3" y2="12"></line>
                        <line className="pulse-line" x1="7" y1="7" x2="5" y2="5"></line>
                    </svg>
                </div>
                <div style={{
                    textAlign: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(79, 70, 229, 0.7)',
                    fontSize: '14px',
                    fontWeight: '500',
                    letterSpacing: '0.5px'
                }}>
                    Oráculo
                </div>
                <div style={{
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '12px',
                    marginTop: '4px',
                    opacity: 0.7
                }}>
                    O que você quer saber?
                </div>
            </div>
        </div>
    );
}