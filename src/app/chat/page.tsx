'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/hooks/useChat';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading: authLoading, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const router = useRouter();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageCountRef = useRef<number>(0);
    const creatingSessionRef = useRef<boolean>(false);
    const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
    const [newSessionId, setNewSessionId] = useState<string | null>(null);

    // Proteger a rota - redirecionar se não estiver autenticado
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Usar o hook de chat com o ID do usuário atual
    const {
        messages,
        sessionId,
        loading,
        error,
        sendMessage,
        changeSession,
        createNewSession,
        activeSessions,
        isProcessing,
        sessionLimitReached
    } = useChat(user?.id);

    // Efeito para garantir que o ID da nova sessão seja aplicado corretamente
    useEffect(() => {
        if (newSessionId && sessionId !== newSessionId) {
            // Se temos um novo ID de sessão mas ele ainda não foi aplicado no hook
            console.log(`Atualizando ID da sessão: ${sessionId} -> ${newSessionId}`);
            changeSession(newSessionId);
        } else if (newSessionId && sessionId === newSessionId && isCreatingNewSession) {
            // Se a sessão foi atualizada, finalizamos a criação
            console.log('Nova sessão aplicada com sucesso:', newSessionId);
            setIsCreatingNewSession(false);
            setNewSessionId(null);
        }
    }, [newSessionId, sessionId, isCreatingNewSession, changeSession]);

    // Rolar para o final da conversa quando novas mensagens chegarem
    useEffect(() => {
        if (chatContainerRef.current && messages.length > 0) {
            // Verificar se há novas mensagens comparando com a contagem anterior
            if (messages.length > lastMessageCountRef.current) {
                console.log(`Novas mensagens detectadas: ${messages.length} (anterior: ${lastMessageCountRef.current})`);
                const container = chatContainerRef.current;
                // Usar setTimeout para garantir que o DOM foi atualizado antes de rolar
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                    console.log('Rolagem aplicada');
                }, 100);
            }
            // Atualizar a contagem para comparação futura
            lastMessageCountRef.current = messages.length;
        }
    }, [messages]);

    // Mostrar um loading state enquanto verifica a autenticação
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-main">
                <div className="w-12 h-12 border-4 border-border-color border-t-primary-color rounded-full animate-spin"></div>
            </div>
        );
    }

    // Se não estiver autenticado, não renderizar nada (será redirecionado pelo useEffect)
    if (!user) {
        return null;
    }

    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    // Função melhorada para criar nova sessão com transição suave
    const handleNewSession = async () => {
        // Evitar duplicação
        if (creatingSessionRef.current || isCreatingNewSession) return null;

        try {
            // Iniciar estado de "criando nova sessão"
            setIsCreatingNewSession(true);
            creatingSessionRef.current = true;

            console.log(">> Iniciando criação de nova sessão na página de chat...");

            // Gerar um novo UUID para a sessão
            const generatedSessionId = uuidv4();
            console.log(">> Novo UUID gerado:", generatedSessionId);

            // Armazenar o novo ID
            setNewSessionId(generatedSessionId);

            // Chamar a função do hook com o ID específico
            const result = await createNewSession(generatedSessionId);

            console.log(">> Resultado da criação da nova sessão:", result);

            // Garantir que o novo ID é usado
            if (result) {
                // Forçamos uma atualização imediata da interface
                changeSession(generatedSessionId);

                // Rolar para o topo para mostrar o chat vazio
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = 0;
                }

                console.log(">> Nova conversa iniciada com ID:", generatedSessionId);
                return generatedSessionId;
            }

            return result;
        } catch (error) {
            console.error(">> Erro ao criar nova sessão:", error);
            setIsCreatingNewSession(false);
            setNewSessionId(null);
            return null;
        } finally {
            setTimeout(() => {
                creatingSessionRef.current = false;
            }, 500);
        }
    };

    const handleSendMessage = async (content: string) => {
        // Se estamos criando uma nova sessão, não permitir envio
        if (isCreatingNewSession) {
            console.log("Aguardando criação da nova sessão para enviar mensagem...");
            return;
        }

        if (sessionLimitReached) {
            // Criar automaticamente uma nova sessão se o limite for atingido
            const newSessionId = await handleNewSession();
            if (newSessionId) {
                // Aguardar um momento para a mudança de estado ocorrer
                setTimeout(() => {
                    sendMessage(content);
                }, 300);
            }
        } else {
            await sendMessage(content);
        }
    };

    if (loading && messages.length === 0 && !isCreatingNewSession) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-main">
                <div className="w-12 h-12 border-4 border-border-color border-t-primary-color rounded-full animate-spin"></div>
            </div>
        );
    }

    const userName = user?.email?.split('@')[0] || user?.user_metadata?.name || '';

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: 'var(--background-main)',
            transition: 'background-color 0.3s'
        }}>
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={handleToggleSidebar}
                activeSessions={activeSessions}
                currentSessionId={sessionId}
                onSessionSelect={changeSession}
                onNewSession={handleNewSession}
                userId={user?.id}
                isCreatingSession={isCreatingNewSession}
            />

            {/* Main content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                height: '100%',
                overflow: 'hidden'
            }}>
                <Header
                    toggleSidebar={handleToggleSidebar}
                    onLogout={handleLogout}
                    userName={userName}
                />

                {/* Overlay durante a criação de nova sessão */}
                {isCreatingNewSession && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            backgroundColor: 'var(--background-elevated)',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div className="w-12 h-12 border-4 border-border-color border-t-primary-color rounded-full animate-spin"></div>
                            <p style={{ color: 'var(--text-primary)' }}>Criando nova conversa...</p>
                        </div>
                    </div>
                )}

                {/* Chat container */}
                <div
                    ref={chatContainerRef}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        backgroundColor: 'var(--background-main)',
                        transition: 'background-color 0.3s',
                        position: 'relative'
                    }}
                >
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingBottom: '24px' // Espaço para o indicador "pensando"
                    }}>
                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderLeft: '4px solid var(--error-color)',
                                color: 'var(--error-color)',
                                padding: '16px',
                                marginBottom: '16px',
                                borderRadius: '4px'
                            }}>
                                <p>{error}</p>
                                {sessionLimitReached && (
                                    <button
                                        onClick={handleNewSession}
                                        style={{
                                            marginTop: '8px',
                                            padding: '6px 12px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Iniciar Nova Conversa
                                    </button>
                                )}
                            </div>
                        )}

                        {messages.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    marginBottom: '24px',
                                    backgroundColor: 'var(--background-subtle)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        <line x1="9" y1="10" x2="15" y2="10"></line>
                                        <line x1="12" y1="7" x2="12" y2="13"></line>
                                    </svg>
                                </div>
                                <h2 style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    marginBottom: '12px'
                                }}>
                                    Comece uma nova conversa
                                </h2>
                                <p style={{
                                    color: 'var(--text-secondary)',
                                    maxWidth: '500px',
                                    margin: '0 auto'
                                }}>
                                    Envie uma mensagem para iniciar o chat com o Oráculo Empresarial
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Renderizar todas as mensagens */}
                                {messages.map((message, index) => (
                                    <ChatBubble
                                        key={`${sessionId}-${index}-${message.type}-${message.content.substring(0, 10)}`}
                                        message={message}
                                        userName={userName}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Indicador "O Oráculo está pensando..." */}
                {isProcessing && !isCreatingNewSession && (
                    <div style={{
                        position: 'relative',
                        marginBottom: '20px', // Espaço acima do campo de entrada
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}>
                        <div style={{
                            backgroundColor: 'var(--background-subtle)',
                            borderRadius: '99px',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-secondary)',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span style={{
                                    height: '8px',
                                    width: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4f46e5',
                                    animation: 'pulse 1.5s infinite'
                                }}></span>
                                <span style={{
                                    height: '8px',
                                    width: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4f46e5',
                                    animation: 'pulse 1.5s infinite 0.3s'
                                }}></span>
                                <span style={{
                                    height: '8px',
                                    width: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4f46e5',
                                    animation: 'pulse 1.5s infinite 0.6s'
                                }}></span>
                            </div>
                            O Oráculo está pensando...
                        </div>
                    </div>
                )}

                {/* Input area */}
                <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={loading || sessionLimitReached || isCreatingNewSession}
                    isThinking={isProcessing}
                    placeholder={
                        isCreatingNewSession
                            ? "Criando nova conversa..."
                            : sessionLimitReached
                                ? "Limite de mensagens atingido. Crie uma nova conversa."
                                : "Digite sua mensagem..."
                    }
                />
            </div>
        </div>
    );
}