'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
// import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import MessageLimitOverlay from '@/components/chat/MessageLimitOverlay';
import { v4 as uuidv4 } from 'uuid';

// Componente Toast para exibir erros
const ErrorToast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, 5000); // Fecha automaticamente após 5 segundos

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--error-color)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxWidth: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Erro</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{message}</p>
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    marginLeft: '12px',
                    padding: '4px'
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const creatingSessionRef = useRef<boolean>(false);
    const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
    const [manualSessionChange, setManualSessionChange] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showErrorToast, setShowErrorToast] = useState(false); // Novo estado para controlar o toast

    // Função para mostrar erros de forma genérica
    const handleError = (errorMessage: string) => {
        console.error("Erro original:", errorMessage);
        // Mensagem de erro genérica
        setLocalError("Ocorreu um erro ao processar sua solicitação. Tente novamente.");
        setShowErrorToast(true);
    };

    // Este useEffect será movido para depois da declaração do hook useChat

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
        vectorStoreId,
        selectVectorStore,
        loading,
        error,
        sendMessage,
        changeSession,
        createNewSession,
        activeSessions,
        sessionInfos,
        isProcessing,
        sessionLimitReached,
        isNewConversation,
        lastMessageTimestamp,
        resetProcessingState,
        renameSession,
        deleteSession,
        hasEmptyChat,
        streamingContent,
    } = useChat(user?.id);

    // Monitorar erros do hook useChat (movido para depois da declaração do useChat)
    useEffect(() => {
        if (error && error !== 'Selecione uma conversa existente ou crie uma nova.') {
            handleError(error);
        }
    }, [error]);

    // Rolar para o final da conversa quando novas mensagens chegarem ou ao receber conteúdo streaming
    useEffect(() => {
        if (chatContainerRef.current) {
            if (messages.length > 0 || streamingContent) {
                const container = chatContainerRef.current;
                // Usar um timeout mais longo para garantir que o DOM foi atualizado
                setTimeout(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                }, 200); // Aumentar para 200ms para dar mais tempo
            }
        }
    }, [messages, streamingContent]);

    // Verificar se o estado de processamento está travado por muito tempo
    useEffect(() => {
        let processingTimer: NodeJS.Timeout | null = null;

        if (isProcessing) {
            // Timer principal para resetar após 45 segundos incondicionalmente
            processingTimer = setTimeout(() => {
                console.log('Estado de processamento ativo por muito tempo, resetando...');
                resetProcessingState();
            }, 45000);
        }

        return () => {
            if (processingTimer) {
                clearTimeout(processingTimer);
            }
        };
    }, [isProcessing, resetProcessingState]);

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

        // Não permitir criar nova sessão se estiver processando uma resposta
        if (isProcessing) {
            console.log("Processando uma resposta. Não é possível criar nova sessão agora.");
            handleError("Aguarde a resposta atual antes de criar uma nova conversa");
            return null;
        }

        // MODIFICADO: Se já temos uma conversa vazia, usar essa ao invés de criar nova
        if (hasEmptyChat && isNewConversation) {
            console.log("Já existe uma conversa vazia. Reaproveitando...");
            return sessionId;
        }

        try {
            // Resetar o estado de processamento se estiver ativo
            if (isProcessing) {
                resetProcessingState();
            }

            // Iniciar estado de "criando nova sessão"
            setIsCreatingNewSession(true);
            creatingSessionRef.current = true;

            console.log(">> Iniciando criação de nova sessão na página de chat...");

            // Gerar um novo UUID para a sessão
            const generatedSessionId = uuidv4();
            console.log(">> Novo UUID gerado:", generatedSessionId);

            // Chamar a função do hook com o ID específico
            // Não passar título inicial aqui - será definido na primeira mensagem
            const result = await createNewSession(generatedSessionId);

            console.log(">> Resultado da criação da nova sessão:", result);

            // Rolar para o topo para mostrar o chat vazio
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = 0;
            }

            console.log(">> Nova conversa iniciada com ID:", generatedSessionId);
            return generatedSessionId;
        } catch (error) {
            console.error(">> Erro ao criar nova sessão:", error);
            handleError("Erro ao criar nova sessão");
            return null;
        } finally {
            setTimeout(() => {
                creatingSessionRef.current = false;
                setIsCreatingNewSession(false);
            }, 500);
        }
    };

    // MODIFICADO: handleSessionSelect sem utilizar setMessages diretamente
    const handleSessionSelect = (newSessionId: string) => {
        // Limpar qualquer estado anterior
        if (isProcessing) {
            resetProcessingState();
        }

        // Marcar que esta é uma mudança manual
        setManualSessionChange(true);

        console.log('Mudança manual de sessão para:', newSessionId);

        // Chamar a função de mudança sem nenhuma tentativa de manipular as mensagens aqui
        changeSession(newSessionId);

        // Reset após um tempo suficiente
        setTimeout(() => {
            setManualSessionChange(false);
        }, 1500);
    };

    // Função para renomear uma sessão de chat (modificada para usar handleError)
    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        try {
            // Chamar diretamente a função do hook
            const success = await renameSession(sessionId, newTitle);

            if (!success) {
                handleError("Não foi possível renomear a conversa");
            }

            return success;
        } catch (error) {
            console.error("Erro ao renomear sessão:", error);
            handleError("Erro ao renomear a conversa");
            return false;
        }
    };

    // Função para excluir uma sessão de chat
    const handleDeleteSession = async (sessionId: string) => {
        try {
            return await deleteSession(sessionId);
        } catch {
            handleError("Erro ao excluir a conversa");
            return false;
        }
    };

    // Função para selecionar uma vector store
    const handleSelectVectorStore = (id: string) => {
        console.log("Selecionando vector store:", id);
        selectVectorStore(id);
    };

    // MODIFICADO: handleSendMessage com verificações para primeira mensagem
    const handleSendMessage = async (content: string) => {
        // Se estamos criando uma nova sessão, não permitir envio
        if (isCreatingNewSession) {
            console.log("Aguardando criação da nova sessão para enviar mensagem...");
            return;
        }

        // Se não temos uma sessão ativa selecionada, criar uma nova
        if (!sessionId) {
            console.log("Não há sessão selecionada, criando nova...");
            const newSessionId = await handleNewSession();
            if (newSessionId) {
                // Aguardar um momento para a sessão ser criada
                setTimeout(() => {
                    sendMessage(content);
                }, 300);
            }
            return;
        }

        // Se o estado isProcessing estiver preso, resetar manualmente
        if (isProcessing && messages.length >= 2 && messages[messages.length - 1].type === 'ai') {
            console.log('Estado de processamento parece inconsistente, resetando...');
            resetProcessingState();
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
            try {
                // Tentar enviar a mensagem
                await sendMessage(content);

                // Forçar um scroll para o fim após enviar a mensagem
                if (chatContainerRef.current) {
                    setTimeout(() => {
                        if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                handleError("Erro ao enviar mensagem");
            }
        }
    };

    // MODIFICADO: Condição de loading para evitar tela cheia durante mudanças de sessão
    if (loading && !isNewConversation && messages.length === 0 && !isCreatingNewSession && !manualSessionChange) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-main">
                <div className="w-12 h-12 border-4 border-border-color border-t-primary-color rounded-full animate-spin"></div>
            </div>
        );
    }

    const userName = user?.email?.split('@')[0] || user?.user_metadata?.name || '';

    // VERIFICAR: Se não há sessão ativa e não está criando uma nova
    const isWelcomeScreenActive = !sessionId && !isNewConversation && !isCreatingNewSession;

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: 'var(--background-main)',
            transition: 'background-color 0.3s'
        }}>
            {/* Sidebar - Modificado para incluir novas props */}
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={handleToggleSidebar}
                activeSessions={activeSessions}
                sessionInfos={sessionInfos}
                currentSessionId={sessionId}
                onSessionSelect={handleSessionSelect}
                onNewSession={handleNewSession}
                onRenameSession={handleRenameSession}
                onDeleteSession={handleDeleteSession}
                userId={user?.id}
                isCreatingSession={isCreatingNewSession}
                isNewConversation={isNewConversation}
                lastMessageTimestamp={lastMessageTimestamp}
                isProcessing={isProcessing} // Nova prop passada para o Sidebar
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

                {/* Toast de erro */}
                {showErrorToast && localError && (
                    <ErrorToast
                        message={localError}
                        onClose={() => {
                            setShowErrorToast(false);
                            setLocalError(null);
                        }}
                    />
                )}

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
                            padding: '24px',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            minWidth: '280px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                borderWidth: '4px',
                                borderStyle: 'solid',
                                borderColor: 'var(--border-color)',
                                borderTopColor: 'var(--primary-color)',
                                animation: 'spin 1s linear infinite',
                                marginBottom: '8px'
                            }}></div>
                            <p style={{
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                                width: '100%',
                                fontWeight: '500',
                                fontSize: '16px',
                                margin: 0,
                                padding: 0,
                                lineHeight: '24px',
                                letterSpacing: '0.1px'
                            }}>Criando nova conversa...</p>
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
                    {/* NOVA CONDIÇÃO: Mostrar tela de boas-vindas se não há sessão ativa */}
                    {isWelcomeScreenActive ? (
                        <WelcomeScreen
                            onNewChat={handleNewSession}
                            hasPreviousChats={activeSessions.length > 0}
                            isCreating={isCreatingNewSession}
                        />
                    ) : (
                        <>
                            {/* Indicador de loading localizado */}
                            {manualSessionChange && messages.length === 0 ? (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div className="w-8 h-8 border-3 border-border-color border-t-primary-color rounded-full animate-spin"></div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Carregando conversa...</p>
                                </div>
                            ) : (
                                <div style={{
                                    maxWidth: '900px',
                                    margin: '0 auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    paddingBottom: '24px' // Espaço para o indicador "pensando"
                                }}>
                                    {/* Notificação avançada quando o limite de mensagens é atingido */}
                                    {sessionLimitReached && !isCreatingNewSession && (
                                        <>
                                            {/* Banner de alerta no topo da conversa */}
                                            <div style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                borderLeft: '4px solid var(--error-color)',
                                                color: 'var(--text-primary)',
                                                padding: '16px',
                                                marginBottom: '16px',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                        borderRadius: '50%',
                                                        width: '36px',
                                                        height: '36px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 500 }}>Limite de mensagens desta conversa atingido</p>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                            Para continuar conversando, inicie uma nova conversa
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleNewSession}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: 'var(--primary-color)',
                                                        color: 'white',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12h14" />
                                                    </svg>
                                                    Nova Conversa
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* MODIFICADO: Condição para mostrar tela inicial ou mensagens */}
                                    {(isNewConversation && messages.length === 0) ? (
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
                                                width: '100px',
                                                height: '100px',
                                                marginBottom: '30px',
                                                backgroundColor: 'var(--background-subtle)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: 'var(--shadow-md)'
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    {/* Olho principal */}
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>

                                                    {/* Raios ao redor do olho */}
                                                    <line x1="12" y1="5" x2="12" y2="3"></line>
                                                    <line x1="17" y1="7" x2="19" y2="5"></line>
                                                    <line x1="19" y1="12" x2="21" y2="12"></line>
                                                    <line x1="17" y1="17" x2="19" y2="19"></line>
                                                    <line x1="12" y1="19" x2="12" y2="21"></line>
                                                    <line x1="7" y1="17" x2="5" y2="19"></line>
                                                    <line x1="5" y1="12" x2="3" y2="12"></line>
                                                    <line x1="7" y1="7" x2="5" y2="5"></line>
                                                </svg>
                                            </div>
                                            <h2 style={{
                                                fontSize: '24px',
                                                fontWeight: '600',
                                                color: 'var(--text-primary)',
                                                marginBottom: '12px'
                                            }}>
                                                O que você quer saber sobre sua empresa?
                                            </h2>
                                            <p style={{
                                                color: 'var(--text-secondary)',
                                                maxWidth: '500px',
                                                margin: '0 auto'
                                            }}>
                                                Envie uma mensagem para iniciar o chat com o Oráculo
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Renderizar mensagens existentes */}
                                            {messages.map((message, index) => (
                                                <ChatBubble
                                                    key={`msg-${sessionId}-${index}-${message.type}`}
                                                    message={message}
                                                    userName={userName}
                                                    // Streaming apenas para a última mensagem do AI, se estiver em processamento
                                                    isStreaming={isProcessing && index === messages.length - 1 && message.type === 'ai'}
                                                    streamingContent={isProcessing && index === messages.length - 1 && message.type === 'ai' ? streamingContent : undefined}
                                                />
                                            ))}

                                            {/* Adicionar mensagem de streaming quando necessário - quando usuário enviou mensagem e estamos aguardando resposta */}
                                            {isProcessing && messages.length > 0 && messages[messages.length - 1].type === 'human' && (
                                                <ChatBubble
                                                    key={`stream-${sessionId}-${messages.length}`}
                                                    message={{ type: 'ai', content: '' }}
                                                    userName={userName}
                                                    isStreaming={true}
                                                    streamingContent={''}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer: ChatInput somente */}
                {!isWelcomeScreenActive && (
                    <div style={{ width: '100%', position: 'relative' }}>
                        {/* Overlay de limite de mensagens */}
                        {sessionLimitReached && !isCreatingNewSession ? (
                            <MessageLimitOverlay onNewSession={handleNewSession} />
                        ) : (
                            <ChatInput
                                onSendMessage={handleSendMessage}
                                disabled={loading || sessionLimitReached || isCreatingNewSession}
                                isThinking={isProcessing}
                                placeholder={
                                    isCreatingNewSession
                                        ? "Criando nova conversa..."
                                        : sessionLimitReached
                                            ? "Limite de mensagens atingido. Crie uma nova conversa."
                                            : "O que você quer saber?"
                                }
                                // Novas props para o seletor de vector store
                                onSelectVectorStore={handleSelectVectorStore}
                                selectedVectorStoreId={vectorStoreId}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}