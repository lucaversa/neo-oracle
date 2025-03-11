'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useChat } from '@/hooks/useChat';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const { user, loading: authLoading, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const router = useRouter();

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
        activeSessions
    } = useChat(user?.id);

    // Mostrar um loading state enquanto verifica a autenticação
    if (authLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: 'var(--background-main)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid var(--border-color)',
                    borderTopColor: '#4f46e5',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    // Se não estiver autenticado, não renderizar nada (será redirecionado pelo useEffect)
    if (!user) {
        return null;
    }

    // Versão modificada do sendMessage que mostra o estado "pensando"
    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;

        // Mostrar indicador de "pensando"
        setIsThinking(true);

        try {
            await sendMessage(content);
        } finally {
            // Esconder indicador após alguns segundos para simular resposta
            setTimeout(() => {
                setIsThinking(false);
            }, 2000);
        }
    };

    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleLogout = async () => {
        await logout();
    };

    const handleNewSession = async () => {
        return await createNewSession();
    };

    if (loading && messages.length === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: 'var(--background-main)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid var(--border-color)',
                    borderTopColor: '#4f46e5',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
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

                {/* Chat container */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    backgroundColor: 'var(--background-main)',
                    transition: 'background-color 0.3s'
                }}>
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
                            messages.map((message, index) => (
                                <ChatBubble
                                    key={index}
                                    message={message}
                                    userName={userName}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Input area */}
                <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={loading}
                    isThinking={isThinking}
                />
            </div>
        </div>
    );
}