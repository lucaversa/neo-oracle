import { useState, useEffect } from 'react';
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
    lastMessageTimestamp = 0
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const { isDarkMode } = useTheme();

    // Pagination state
    const [displayLimit] = useState<number>(20);
    const [showAllChats, setShowAllChats] = useState<boolean>(false);
    const [visibleSessions, setVisibleSessions] = useState<string[]>([]);

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
    }, [activeSessions, currentSessionId, displayLimit, isNewConversation, lastMessageTimestamp]);

    const handleNewSession = async () => {
        // Não criar nova sessão se já estiver criando ou se já há uma conversa nova
        if (creating || isCreatingSession || isNewConversation) {
            console.log("Já existe uma conversa nova ou está criando. Ignorando.");
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
        if (creating) return;

        // Cancelar qualquer edição em andamento
        setEditingSessionId(null);
        setShowDeleteConfirm(null);

        const trimmedId = sessionId.trim();
        console.log('Selecionando sessão:', trimmedId);

        // Chamar o seletor de sessão imediatamente, sem delay
        onSessionSelect(trimmedId);

        // Close all sessions modal if open
        setShowAllChats(false);
    };

    // Função simplificada para iniciar edição
    const handleStartEdit = (sessionId: string) => {
        setEditingSessionId(sessionId.trim());
    };

    // Função para lidar com sucesso na edição
    const handleEditSuccess = (sessionId: string, newTitle: string) => {
        console.log(`Título atualizado com sucesso para "${newTitle}"`);

        // Atualizar o estado local mesmo que onRenameSession não funcione corretamente
        const updatedInfos = new Map(sessionInfos);
        const sessionInfo = updatedInfos.get(sessionId);

        if (sessionInfo) {
            updatedInfos.set(sessionId, {
                ...sessionInfo,
                title: newTitle
            });
            // Este é apenas o estado local, isso não fará uma atualização no banco
            // mas pelo menos a UI será atualizada
        }

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

    const toggleShowAllChats = () => {
        setShowAllChats(!showAllChats);
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

    // Check if we need to show 'See more' button
    const shouldShowSeeMoreButton = uniqueSessions.length > displayLimit;

    // All sessions for the modal view
    const allSessions = uniqueSessions;

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
                    disabled={creating || isCreatingSession || isNewConversation}
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
                        cursor: (creating || isCreatingSession || isNewConversation) ? 'not-allowed' : 'pointer',
                        opacity: (creating || isCreatingSession || isNewConversation) ? 0.7 : 1,
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
                                                    cursor: creating ? 'not-allowed' : 'pointer',
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
                    </ul>
                )}

                {/* Botão "Ver mais" - apenas mostra se houver mais do que o limite */}
                {shouldShowSeeMoreButton && (
                    <div style={{
                        padding: '12px 0',
                        textAlign: 'center',
                        borderTop: '1px solid var(--border-subtle)',
                        marginTop: '8px'
                    }}>
                        <button
                            onClick={toggleShowAllChats}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                margin: '0 auto',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            Ver mais ({uniqueSessions.length - displayLimit} restantes)
                        </button>
                    </div>
                )}
            </div>

            {/* Modal para exibir todas as conversas */}
            {showAllChats && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="chats-modal" style={{
                        backgroundColor: 'var(--background-elevated)',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '550px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Todas as Conversas ({allSessions.length})
                            </h3>
                            <button
                                onClick={toggleShowAllChats}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-tertiary)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div style={{
                            overflowY: 'auto',
                            flex: 1,
                            padding: '12px'
                        }}>
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                {allSessions.map((session) => {
                                    const trimmedSession = session.trim();
                                    const isActive = currentSessionId.trim() === trimmedSession && !isNewConversation;
                                    const sessionInfo = sessionInfos.get(trimmedSession);

                                    return (
                                        <li key={`all-${trimmedSession}`}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                backgroundColor: isActive
                                                    ? 'var(--background-subtle)'
                                                    : 'var(--background-main)',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                                onClick={() => {
                                                    handleSelectSession(trimmedSession);
                                                }}>
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
                                                    style={{ marginRight: '12px', color: 'var(--text-tertiary)' }}
                                                >
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                                <span style={{
                                                    fontWeight: isActive ? '600' : '500',
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {sessionInfo?.title || `Conversa ${trimmedSession.substring(0, 6)}`}
                                                </span>

                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px'
                                                }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleShowAllChats(); // Fechar o modal primeiro
                                                            setTimeout(() => {
                                                                handleStartEdit(trimmedSession);
                                                            }, 100);
                                                        }}
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor: 'var(--background-subtle)',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'var(--text-tertiary)'
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleShowAllChats(); // Fechar o modal primeiro
                                                            setTimeout(() => {
                                                                setShowDeleteConfirm(trimmedSession);
                                                            }, 100);
                                                        }}
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor: 'var(--background-subtle)',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'var(--text-tertiary)'
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid var(--border-color)',
                            textAlign: 'center'
                        }}>
                            <button
                                onClick={toggleShowAllChats}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    width: '100%'
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}