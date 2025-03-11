// src/app/chat/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabase';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const router = useRouter();

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

    // Verificação periódica da sessão a cada 5 minutos (300000ms)
    useEffect(() => {
        // Se não há usuário, redirecionar para o login
        if (!user) {
            router.push('/login');
            return;
        }

        // Verificar a sessão periodicamente
        const intervalId = setInterval(async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    // Sessão expirada, redirecionar para login
                    router.push('/login?expired=true');
                }
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
            }
        }, 300000);

        return () => clearInterval(intervalId);
    }, [user, router]);

    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;
        await sendMessage(content);
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
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const userName = user?.email?.split('@')[0] || user?.user_metadata?.name || '';

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={handleToggleSidebar}
                activeSessions={activeSessions}
                currentSessionId={sessionId}
                onSessionSelect={changeSession}
                onNewSession={handleNewSession}
            />

            {/* Main content */}
            <div className="flex flex-col flex-1 h-full">
                <Header
                    toggleSidebar={handleToggleSidebar}
                    onLogout={handleLogout}
                    userName={userName}
                />

                {/* Chat container */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                                <p>{error}</p>
                            </div>
                        )}

                        {messages.length === 0 ? (
                            <div className="text-center py-10">
                                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Comece uma nova conversa
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Envie uma mensagem para iniciar o chat com o Oráculo Empresarial
                                </p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <ChatBubble key={index} message={message} />
                            ))
                        )}
                    </div>
                </div>

                {/* Input area */}
                <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
            </div>
        </div>
    );
}