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
import WelcomeScreen from '@/components/chat/WelcomeScreen';
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
    const [manualSessionChange, setManualSessionChange] = useState<boolean>(false);

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
        sessionInfos,
        isProcessing,
        sessionLimitReached,
        isNewConversation,
        lastMessageTimestamp,
        resetProcessingState,
        updateLastMessageTimestamp,
        renameSession,
        deleteSession,
        hasEmptyChat
    } = useChat(user?.id);

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

    // NOVO: Effect para garantir carregamento após seleção
    useEffect(() => {
        if (manualSessionChange && sessionId && !loading) {
            const timer = setTimeout(() => {
                if (messages.length === 0) {
                    console.log('Sem mensagens após timeout, forçando carregamento');
                    changeSession(sessionId);
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [manualSessionChange, messages.length, sessionId, loading, changeSession]);

    // NOVO: Verificar se precisamos atualizar a UI para primeira mensagem
    useEffect(() => {
        // Verificar se precisamos atualizar a UI
        if (messages.length === 1 && messages[0].type === 'human' && isProcessing) {
            // Uma única mensagem do usuário com estado de processamento ativo
            // Configurar uma verificação periódica
            const checkTimer = setInterval(() => {
                console.log('Verificando atualizações para primeira mensagem');
                // Forçar recarregamento da conversa atual
                if (messages.length === 1 && messages[0].type === 'human' && isProcessing) {
                    console.log('Ainda aguardando resposta, forçando atualização');
                    // Use a função fornecida pelo hook
                    updateLastMessageTimestamp();
                } else {
                    clearInterval(checkTimer);
                }
            }, 1000);

            return () => clearInterval(checkTimer);
        }
    }, [messages, isProcessing, updateLastMessageTimestamp]);

    // Verificar se o estado de processamento está travado por muito tempo
    useEffect(() => {
        let processingTimer: NodeJS.Timeout | null = null;
        let midCheckTimer: NodeJS.Timeout | null = null;

        if (isProcessing) {
            // Verificação intermediária após 10 segundos
            midCheckTimer = setTimeout(() => {
                console.log('Verificação intermediária do estado de processamento...');
                // Se ainda estamos processando e temos mensagens, verificar se a última é do tipo 'ai'
                if (isProcessing && messages.length > 0) {
                    const lastMessage = messages[messages.length - 1];
                    // Se a última mensagem for do tipo 'ai', mas ainda estamos em processamento, 
                    // provavelmente o estado ficou preso
                    if (lastMessage.type === 'ai') {
                        console.log('Última mensagem é do AI mas estado ainda está processando. Corrigindo...');
                        resetProcessingState();
                    }
                }
            }, 10000); // 10 segundos

            // Timer principal para resetar após 20 segundos incondicionalmente
            processingTimer = setTimeout(() => {
                console.log('Estado de processamento ativo por muito tempo, resetando...');
                resetProcessingState();
            }, 20000); // 20 segundos
        }

        return () => {
            if (midCheckTimer) {
                clearTimeout(midCheckTimer);
            }
            if (processingTimer) {
                clearTimeout(processingTimer);
            }
        };
    }, [isProcessing, resetProcessingState, messages]);

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

            // Verificação adicional para garantir que as mensagens foram carregadas
            if (messages.length === 0 && !isNewConversation) {
                console.log('Verificação secundária: forçando recarregamento');
                changeSession(newSessionId);
            }
        }, 1500);
    };

    // Função para renomear uma sessão de chat
    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        return await renameSession(sessionId, newTitle);
    };

    // Função para excluir uma sessão de chat
    const handleDeleteSession = async (sessionId: string) => {
        return await deleteSession(sessionId);
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

        // Verificar se é a primeira mensagem de uma nova conversa
        const isFirstMessageInNewConversation = isNewConversation && messages.length === 0;

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

                // NOVO: Verificações específicas para primeira mensagem em nova conversa
                if (isFirstMessageInNewConversation) {
                    console.log('Primeira mensagem em nova conversa enviada, verificando estado...');

                    // Forçar atualização da UI
                    setTimeout(() => {
                        // Se a mensagem não está visível, tentar forçar um refresh
                        if (messages.length === 0 || (messages.length === 1 && messages[0].type === 'human')) {
                            console.log('Forçando atualização da UI após primeira mensagem');
                            // Use a função fornecida pelo hook
                            updateLastMessageTimestamp();
                        }
                    }, 500);
                }

                // Após o envio bem-sucedido, verificar estado de processamento
                if (!isProcessing && messages.length > 0 && messages[messages.length - 1].type === 'human') {
                    console.log('Estado de processamento não aplicado, forçando verificação...');

                    // Tentar carregar as mensagens novamente após um breve intervalo para ver se a resposta chegou
                    setTimeout(() => {
                        // Verificar novamente depois de um momento
                        if (!isProcessing && messages.length > 0 && messages[messages.length - 1].type === 'human') {
                            console.log('Estado ainda incorreto, tentando corrigir...');
                            // Se ainda está incorreto, tente uma abordagem mais agressiva
                            resetProcessingState(); // Limpa estado primeiro

                            // Aguardar um pouco e tentar enviar novamente se necessário
                            setTimeout(() => {
                                if (messages.length > 0 && messages[messages.length - 1].type === 'human' && !isProcessing) {
                                    console.log('Último recurso: tentando reenviar mensagem...');
                                    sendMessage(content);
                                }
                            }, 500);
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
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
                            <p style={{
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                                width: '100%',
                                fontWeight: '500'
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
                                    {error && error !== 'Selecione uma conversa existente ou crie uma nova.' && (
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
                            )}
                        </>
                    )}
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

                {/* Input area - MODIFICADO: Ocultar em tela de boas-vindas */}
                {!isWelcomeScreenActive && (
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
                )}
            </div>
        </div>
    );
}