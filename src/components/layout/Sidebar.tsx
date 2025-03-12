import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import TypingEffect from '@/components/chat/TypingEffect';
import { SessionInfo } from '@/types/chat';

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

// Chave para o localStorage - sessões que já mostraram efeito de digitação
const ANIMATION_SHOWN_SESSIONS_KEY = 'oracle_animation_shown_sessions';

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
    const [newTitle, setNewTitle] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const { isDarkMode } = useTheme();
    const editInputRef = useRef<HTMLInputElement>(null);

    // Referência para controlar a carga inicial
    const isInitialLoad = useRef(true);
    // Referência para detectar se é o primeiro carregamento da página atual
    const isFirstPageLoadRef = useRef(true);
    // Conjunto para armazenar IDs de sessões onde o efeito já foi mostrado
    const animationShownSessions = useRef<Set<string>>(new Set());
    // Última sessão criada
    const lastCreatedSessionId = useRef<string | null>(null);

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

    // Focar no input de edição quando estiver visível
    useEffect(() => {
        if (editingSessionId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingSessionId]);

    const handleNewSession = async () => {
        // Não criar nova sessão se já estiver criando ou se já há uma conversa nova
        if (creating || isCreatingSession || isNewConversation) {
            console.log("Já existe uma conversa nova ou está criando. Ignorando.");
            return;
        }

        setCreating(true);
        try {
            console.log("Iniciando criação de nova sessão...");
            const newSessionId = await onNewSession();

            if (newSessionId) {
                // Registrar a nova sessão
                lastCreatedSessionId.current = newSessionId;
                console.log("Nova sessão criada, ID registrado:", newSessionId);
            }
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

        // IMPORTANTE: Sempre desativar a flag de primeira carga quando o usuário interage
        isFirstPageLoadRef.current = false;

        // Desativar a animação nesta sessão e marcá-la como já mostrada
        for (const [id, sessionInfo] of sessionInfos.entries()) {
            if (sessionInfo.isNew) {
                markAnimationShown(id);
            }
        }

        // Chamar o seletor de sessão imediatamente, sem delay
        onSessionSelect(trimmedId);
    };

    const startEditSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Evitar que o clique selecione a sessão

        const trimmedId = sessionId.trim();
        const sessionInfo = sessionInfos.get(trimmedId);

        if (sessionInfo) {
            setEditingSessionId(trimmedId);
            setNewTitle(sessionInfo.title || 'Nova Conversa');
        }
    };

    const handleSaveTitle = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingSessionId || !newTitle.trim()) {
            setEditingSessionId(null);
            return;
        }

        try {
            const success = await onRenameSession(editingSessionId, newTitle.trim());
            if (success) {
                console.log('Título atualizado com sucesso');
            }
        } catch (error) {
            console.error('Erro ao salvar título:', error);
        } finally {
            setEditingSessionId(null);
        }
    };

    const cancelEdit = () => {
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

    // Filtra a conversa vazia atual da lista se for o caso
    // Isso evita que a conversa vazia atual apareça no sidebar
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
                            const sessionInfo = sessionInfos.get(trimmedSession);
                            const isEditing = editingSessionId === trimmedSession;
                            const isConfirmingDelete = showDeleteConfirm === trimmedSession;

                            return (
                                <li key={trimmedSession} className="session-item">
                                    {isEditing ? (
                                        // Modo de edição do título
                                        <form onSubmit={handleSaveTitle} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '6px',
                                            backgroundColor: 'var(--background-subtle)',
                                            borderRadius: '8px',
                                            gap: '6px'
                                        }}>
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    border: 'none',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: 'var(--background-main)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14px'
                                                }}
                                                placeholder="Nome da conversa"
                                            />
                                            <button
                                                type="submit"
                                                style={{
                                                    padding: '6px',
                                                    color: 'var(--primary-color)',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Salvar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                style={{
                                                    padding: '6px',
                                                    color: 'var(--text-tertiary)',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Cancelar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </form>
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
                                            position: 'relative'
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
                                                    {sessionInfo?.isNew ? (
                                                        <TypingEffect
                                                            text={sessionInfo.title || 'Nova Conversa'}
                                                            typingSpeed={15}
                                                            onComplete={() => {
                                                                markAnimationShown(trimmedSession);
                                                            }}
                                                        />
                                                    ) : (
                                                        sessionInfo?.title || 'Nova Conversa'
                                                    )}
                                                </span>
                                            </button>

                                            {/* Botões de ação (apenas visíveis em hover ou para sessão ativa) */}
                                            <div className="session-actions">
                                                <button
                                                    onClick={(e) => startEditSession(e, trimmedSession)}
                                                    className="action-button"
                                                    title="Renomear"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteConfirm(trimmedSession);
                                                    }}
                                                    className="action-button"
                                                    title="Excluir"
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
                    Recursos disponíveis:
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{
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
                    }}>
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
                        Renomear conversas
                    </div>
                    <div style={{
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
                    }}>
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
                        Excluir conversas
                    </div>
                </div>
            </div>

            {/* Estilo para os botões de ação ficarem visíveis em hover */}
            <style jsx>{`
                li:hover .session-actions {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}