import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    activeSessions: string[];
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => Promise<string | null>;
    userId?: string;
    isCreatingSession?: boolean; // Nova propriedade
}

interface SessionInfo {
    id: string;
    firstMessage: string;
}

export default function Sidebar({
    isOpen,
    toggleSidebar,
    activeSessions,
    currentSessionId,
    onSessionSelect,
    onNewSession,
    userId,
    isCreatingSession = false
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [sessionInfos, setSessionInfos] = useState<Map<string, SessionInfo>>(new Map());
    const { isDarkMode } = useTheme();

    // Usar a prop isCreatingSession para controlar o estado
    useEffect(() => {
        if (isCreatingSession) {
            setCreating(true);
        } else {
            // Esperar um momento antes de esconder a animação
            const timer = setTimeout(() => {
                setCreating(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isCreatingSession]);

    // Carregar primeira mensagem para cada sessão
    useEffect(() => {
        const loadSessionInfos = async () => {
            if (activeSessions.length === 0) return;

            console.log('Carregando informações para sessões:', activeSessions);
            const newSessionInfos = new Map<string, SessionInfo>();

            for (const sessionId of activeSessions) {
                try {
                    // Garantir que o ID da sessão esteja sem espaços extras
                    const trimmedSessionId = sessionId.trim();
                    console.log('Carregando info para sessão:', trimmedSessionId);

                    // Buscar mensagens desta sessão considerando possíveis versões com espaço
                    const { data, error } = await supabase
                        .from('n8n_chat_histories')
                        .select('message')
                        .or(`session_id.eq.${trimmedSessionId},session_id.eq. ${trimmedSessionId}`)
                        .order('id');

                    if (error) {
                        console.error('Erro ao carregar mensagens:', error);
                        throw error;
                    }

                    console.log(`Encontrados ${data?.length || 0} registros`);

                    let firstMessage = 'Nova conversa';

                    if (data && data.length > 0) {
                        // Filtrar mensagens humanas válidas
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
                            // Pegar a primeira mensagem humana
                            const content = humanMessages[0].message.content;

                            // Truncar se necessário
                            firstMessage = content.length > 25
                                ? content.substring(0, 25) + '...'
                                : content;

                            console.log('Primeira mensagem:', firstMessage);
                        }
                    }

                    newSessionInfos.set(trimmedSessionId, {
                        id: trimmedSessionId,
                        firstMessage
                    });

                } catch (err) {
                    console.error('Erro ao processar sessão:', err);
                    // Usar nome padrão em caso de erro
                    const trimmedId = sessionId.trim();
                    newSessionInfos.set(trimmedId, {
                        id: trimmedId,
                        firstMessage: `Conversa ${trimmedId.substring(0, 5)}...`
                    });
                }
            }

            setSessionInfos(newSessionInfos);
        };

        loadSessionInfos();
    }, [activeSessions]);

    const handleNewSession = async () => {
        if (creating || isCreatingSession) return; // Evitar múltiplos cliques

        setCreating(true);
        try {
            console.log("Iniciando criação de nova sessão...");
            await onNewSession();
        } catch (error) {
            console.error("Erro ao criar nova sessão:", error);
        }
    };

    // Função para obter nome amigável para a sessão
    const getSessionName = (sessionId: string, index: number): string => {
        // Se temos informações sobre a sessão, usar a primeira mensagem
        const trimmedId = sessionId.trim();
        if (sessionInfos.has(trimmedId)) {
            return sessionInfos.get(trimmedId)!.firstMessage;
        }

        // Fallback para índice
        return `Conversa ${index + 1}`;
    };

    // Função para verificar se todas as sessões têm o mesmo ID
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

    // Em telas maiores, não esconder a sidebar
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        sidebarStyle.position = 'relative';
        sidebarStyle.transform = 'translateX(0)';
    }

    // Remover sessões duplicadas (com espaços extras)
    const uniqueSessions = Array.from(new Set(activeSessions.map(id => id.trim())));

    console.log('Sessões únicas exibidas na sidebar:', uniqueSessions);

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

            {/* Aviso caso todas as sessões tenham o mesmo ID */}
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
                        {uniqueSessions.map((session, index) => {
                            const trimmedSession = session.trim();
                            const isActive = currentSessionId.trim() === trimmedSession;

                            return (
                                <li key={trimmedSession}>
                                    <button
                                        onClick={() => !creating && onSessionSelect(trimmedSession)}
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
                                            {getSessionName(trimmedSession, index)}
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