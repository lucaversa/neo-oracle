// src/components/layout/Sidebar.tsx
import { useState, useEffect, useRef } from 'react';
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
    isProcessing?: boolean; // Nova prop para controlar estado de processamento
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
    isProcessing = false // Valor padrão
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const { isDarkMode } = useTheme();
    const sessionsContainerRef = useRef<HTMLDivElement>(null);

    // Estado para paginação com lazy loading
    const [displayCount, setDisplayCount] = useState<number>(10);
    const [visibleSessions, setVisibleSessions] = useState<string[]>([]);
    const [allUniqueSessions, setAllUniqueSessions] = useState<string[]>([]);
    const [canLoadMore, setCanLoadMore] = useState(false);

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

    // Processar as sessões ativas para remover duplicatas e a sessão vazia atual
    useEffect(() => {
        // Filtrar sessões duplicadas e a sessão vazia atual
        const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())))
            .filter(id => !(isNewConversation && id === currentSessionId));

        setAllUniqueSessions(uniqueSessions);

        // Atualizar as sessões visíveis com base no displayCount atual
        setVisibleSessions(uniqueSessions.slice(0, displayCount));

        // Verificar se ainda há mais sessões para carregar
        setCanLoadMore(uniqueSessions.length > displayCount);
    }, [activeSessions, currentSessionId, displayCount, isNewConversation, lastMessageTimestamp]);

    // Adicionar evento de scroll para detectar quando o usuário chegou ao final da lista
    useEffect(() => {
        const container = sessionsContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Verificar se chegamos perto do final da lista
            // offsetHeight = altura visível, scrollTop = quanto já rolou, scrollHeight = altura total
            const { scrollTop, scrollHeight, clientHeight } = container;

            // Se estamos a 100px do final e ainda há mais sessões para carregar
            if (scrollHeight - scrollTop - clientHeight < 100 && canLoadMore) {
                // Carregar mais 10 sessões
                setDisplayCount(prev => prev + 10);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [canLoadMore]);

    const handleNewSession = async () => {
        // Não criar nova sessão se já estiver criando ou se já há uma conversa nova ou se estiver processando
        if (creating || isCreatingSession || isNewConversation || isProcessing) {
            console.log("Já existe uma conversa nova, está criando ou processando. Ignorando.");
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
                    disabled={creating || isCreatingSession || isNewConversation || isProcessing}
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
                        cursor: (creating || isCreatingSession || isNewConversation || isProcessing) ? 'not-allowed' : 'pointer',
                        opacity: (creating || isCreatingSession || isNewConversation || isProcessing) ? 0.7 : 1,
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

            {/* Container com referência para detectar scroll */}
            <div
                ref={sessionsContainerRef}
                style={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    padding: '8px 12px'
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

                        {/* Indicador de carregamento se houver mais chats a serem carregados */}
                        {canLoadMore && (
                            <li style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                fontSize: '14px',
                                color: 'var(--text-tertiary)'
                            }}>
                                <div style={{
                                    display: 'inline-block',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--border-color)',
                                    borderTopColor: 'var(--primary-color)',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                <span style={{ marginLeft: '8px' }}>Carregando mais...</span>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}