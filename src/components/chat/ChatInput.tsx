import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import VectorStoreSelector from './VectorStoreSelector';
import { getSearchableVectorStores } from '@/services/vectorStoreService';

// Interface para os comandos rápidos
interface QuickCommand {
    command: string;
    description: string;
    template: string;
}

interface ChatInputProps {
    onSendMessage: (message: string) => Promise<void>;
    disabled?: boolean;
    isThinking?: boolean;
    placeholder?: string;
    onSelectVectorStore?: (vectorStoreId: string) => void;  // Prop para selecionar base de conhecimento
    selectedVectorStoreId?: string | null;                 // Prop para o ID selecionado
    vectorStoresCount?: number;                           // Nova prop para contar vector stores disponíveis
}

export default function ChatInput({
    onSendMessage,
    disabled = false,
    isThinking = false,
    placeholder = "O que você quer saber?",
    onSelectVectorStore,
    selectedVectorStoreId,
    vectorStoresCount = 0
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [commandFilter, setCommandFilter] = useState('');
    const { isDarkMode } = useTheme();
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const commandsRef = useRef<HTMLDivElement>(null);
    const [showKnowledgeTooltip, setShowKnowledgeTooltip] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [actualVectorStoresCount, setActualVectorStoresCount] = useState(vectorStoresCount);

    // Detectar se é mobile
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Verificar inicialmente
        checkIfMobile();

        // Adicionar listener para redimensionamento da janela
        window.addEventListener('resize', checkIfMobile);

        // Limpar o listener
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    // Efeito para buscar e atualizar a contagem de vector stores
    useEffect(() => {
        const fetchVectorStoresCount = async () => {
            try {
                const stores = await getSearchableVectorStores();
                setActualVectorStoresCount(stores.length);
            } catch (error) {
                console.error("Erro ao buscar vector stores:", error);
            }
        };

        fetchVectorStoresCount();

        // Atualizar a contagem quando a prop mudar também
        if (vectorStoresCount > 0) {
            setActualVectorStoresCount(vectorStoresCount);
        }
    }, [vectorStoresCount]);

    // Lista de comandos rápidos
    const quickCommands: QuickCommand[] = [
        {
            command: '/padrão',
            description: 'Prompt padrão para qualquer solicitação',
            template: 'Busque informações considerando múltiplas tabelas, variações de nomes de tabelas e pessoas, e forneça uma resposta clara: [solicitação].'
        },
        {
            command: '/resumir',
            description: 'Resumir uma informação complexa',
            template: 'Poderia resumir o seguinte assunto de forma simples e direta: [assunto]'
        },
        {
            command: '/comparar',
            description: 'Comparar dois itens ou conceitos',
            template: 'Compare [item 1] e [item 2] destacando as principais diferenças e semelhanças.'
        },
        {
            command: '/explicar',
            description: 'Explicar um conceito de forma detalhada',
            template: 'Explique o conceito de [conceito] de forma detalhada, com exemplos práticos.'
        },
        {
            command: '/exemplo',
            description: 'Obter exemplos práticos',
            template: 'Forneça 3 exemplos práticos de [tópico].'
        },
        {
            command: '/passos',
            description: 'Listar passos para resolver um problema',
            template: 'Liste os passos necessários para [objetivo].'
        }
    ];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!message.trim() || isSending || isThinking || disabled) return;

        setIsSending(true);
        try {
            await onSendMessage(message);
            setMessage('');
            // Resetar qualquer state de comando
            setShowCommands(false);
            setCommandFilter('');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enviar com Enter (sem Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
            return;
        }

        // Detectar / para mostrar comandos
        if (e.key === '/' && message === '') {
            setShowCommands(true);
            setCommandFilter('');
        }

        // Fechar comandos com Escape
        if (e.key === 'Escape' && showCommands) {
            setShowCommands(false);
        }

        // Navegação nos comandos
        if (showCommands && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            // Aqui você implementaria a navegação pelos comandos
        }

        // Selecionar comando com Tab
        if (showCommands && e.key === 'Tab') {
            e.preventDefault();
            // Implementar seleção do comando destacado
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Atualizar filtro se começar com /
        if (value.startsWith('/')) {
            setShowCommands(true);
            setCommandFilter(value.substring(1));
        } else {
            setShowCommands(false);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [message]);

    // Fechar commands ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (commandsRef.current && !commandsRef.current.contains(event.target as Node)) {
                setShowCommands(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filtrar comandos
    const filteredCommands = quickCommands.filter(cmd =>
        cmd.command.toLowerCase().includes(commandFilter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(commandFilter.toLowerCase())
    );

    // Aplicar um comando
    const applyCommand = (command: QuickCommand) => {
        setMessage(command.template);
        setShowCommands(false);
        if (textAreaRef.current) {
            textAreaRef.current.focus();
        }
    };

    const inputDisabled = disabled || isSending || isThinking;

    // Melhorar o feedback visual quando o chat estiver desabilitado
    const getInputBackgroundColor = () => {
        if (disabled && sessionLimitReached) {
            return isDarkMode
                ? 'rgba(55, 65, 81, 0.2)' // Mais escuro no dark mode
                : 'rgba(243, 244, 246, 0.8)'; // Mais claro no light mode
        }
        return isDarkMode
            ? 'rgba(55, 65, 81, 0.3)'
            : 'rgba(249, 250, 251, 0.8)';
    };

    // Verificar se o limitador é por limite de sessão
    const sessionLimitReached = disabled && placeholder?.includes("Limite de mensagens atingido");

    // Verifica se deve mostrar o seletor de vector store (apenas se houver mais de 1)
    const shouldShowVectorStoreSelector = onSelectVectorStore && actualVectorStoresCount > 1;

    return (
        <div style={{
            borderTop: '1px solid var(--border-color)',
            padding: '16px',
            backgroundColor: isDarkMode
                ? 'rgba(31, 41, 55, 0.8)'
                : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            transition: 'background-color 0.3s',
            position: 'sticky',
            bottom: 0,
        }}>
            <form
                onSubmit={handleSubmit}
                style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    position: 'relative'
                }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '8px' : '12px',
                    position: 'relative'
                }}>
                    {/* Container principal do input e seletor */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        position: 'relative',
                        width: '100%'
                    }}>
                        {/* Knowledge Base Selector - Só exibe quando há mais de 1 vector store */}
                        {shouldShowVectorStoreSelector && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                marginBottom: '-2px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
                                    padding: '8px 12px',
                                    boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.05)',
                                    backdropFilter: 'blur(5px)',
                                    maxWidth: isMobile ? '90%' : '400px',
                                    margin: '0 auto',
                                    width: '100%'
                                }}>
                                    {/* Ícone de base de conhecimento */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: selectedVectorStoreId === 'automatic' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        marginRight: '6px',
                                        flexShrink: 0
                                    }}>
                                        {selectedVectorStoreId === 'automatic' ? (
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
                                            >
                                                <path d="M17.2 14.9l-.6 1c-1 1.5-2.7 1.9-4.2 1.1-.8-.5-1.4-1.1-1.9-1.9-.5-1-1.1-2-1.7-3M14 14l-6-6M6.8 9.1l.6-1c1-1.5 2.7-1.9 4.2-1.1.8.5 1.4 1.1 1.9 1.9.5 1 1.1 2 1.7 3" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Texto "Fonte de conhecimento" - ocultado em mobile */}
                                    {!isMobile && (
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            marginRight: '8px',
                                            flexShrink: 0
                                        }}>
                                            Fonte de Conhecimento:
                                        </div>
                                    )}

                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexGrow: 1,
                                        minWidth: 0,
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            display: 'flex',
                                            backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            transition: 'all 0.2s',
                                            padding: '1px',
                                            overflow: 'hidden'
                                        }}>
                                            <VectorStoreSelector
                                                selectedId={selectedVectorStoreId || null}  // Garantir que seja string | null, não undefined
                                                onSelect={onSelectVectorStore}
                                                disabled={disabled || isThinking}
                                            />
                                        </div>
                                    </div>

                                    {/* Ícone de informação com tooltip */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'var(--text-tertiary)',
                                            cursor: 'help',
                                            marginLeft: '6px',
                                            position: 'relative',
                                            flexShrink: 0
                                        }}
                                        onMouseEnter={() => setShowKnowledgeTooltip(true)}
                                        onMouseLeave={() => setShowKnowledgeTooltip(false)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M12 16v-4"></path>
                                            <path d="M12 8h.01"></path>
                                        </svg>

                                        {showKnowledgeTooltip && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '24px',
                                                right: '-10px',
                                                width: '220px',
                                                padding: '8px 12px',
                                                backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                zIndex: 100,
                                                backdropFilter: 'blur(8px)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {selectedVectorStoreId === 'automatic' ?
                                                    'Modo Automático: a IA escolherá a melhor fonte de conhecimento para sua pergunta' :
                                                    'Selecione a base de conhecimento que o Oráculo usará para responder suas perguntas'}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '-5px',
                                                    right: '12px',
                                                    width: '10px',
                                                    height: '10px',
                                                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                    transform: 'rotate(45deg)',
                                                    border: '1px solid var(--border-color)',
                                                    borderTop: 'none',
                                                    borderLeft: 'none'
                                                }}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{
                            flexGrow: 1,
                            position: 'relative'
                        }}>
                            <textarea
                                ref={textAreaRef}
                                value={message}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isThinking ? "Aguarde o Oráculo terminar de pensar..." : placeholder}
                                disabled={inputDisabled}
                                style={{
                                    width: '100%',
                                    padding: '16px 60px 16px 20px',
                                    backgroundColor: getInputBackgroundColor(),
                                    borderRadius: '20px',
                                    border: sessionLimitReached
                                        ? '1px solid var(--error-color)' // Borda vermelha para limite atingido
                                        : '1px solid var(--border-color)',
                                    outline: 'none',
                                    resize: 'none',
                                    minHeight: '60px',
                                    maxHeight: '200px',
                                    transition: 'border-color 0.2s, background-color 0.3s, box-shadow 0.3s',
                                    fontSize: '15px',
                                    lineHeight: '1.5',
                                    color: 'var(--text-primary)',
                                    boxShadow: isDarkMode
                                        ? 'none'
                                        : sessionLimitReached
                                            ? '0 2px 6px rgba(239, 68, 68, 0.15)' // Sombra vermelha para limite atingido
                                            : '0 2px 6px rgba(0, 0, 0, 0.05)',
                                    opacity: inputDisabled ? 0.75 : 1,
                                    backdropFilter: 'blur(5px)'
                                }}
                                rows={1}
                            />

                            {/* Comandos rápidos tooltip */}
                            {showCommands && filteredCommands.length > 0 && (
                                <div
                                    ref={commandsRef}
                                    style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '0',
                                        width: '100%',
                                        backgroundColor: 'var(--background-elevated)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-lg)',
                                        marginBottom: '8px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        zIndex: 10,
                                    }}
                                >
                                    <div style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        Comandos Rápidos
                                    </div>
                                    <div>
                                        {filteredCommands.map((cmd) => (
                                            <div
                                                key={cmd.command}
                                                onClick={() => applyCommand(cmd)}
                                                style={{
                                                    padding: '12px 16px',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s',
                                                    borderBottom: '1px solid var(--border-subtle)'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--background-subtle)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <div style={{
                                                    fontWeight: '600',
                                                    marginBottom: '4px',
                                                    color: 'var(--primary-color)'
                                                }}>
                                                    {cmd.command}
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {cmd.description}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ícone no input quando há limite de mensagens atingido */}
                            {sessionLimitReached && (
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--error-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={inputDisabled || !message.trim()}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    width: '40px',
                                    height: '40px',
                                    padding: '0',
                                    borderRadius: '50%',
                                    background: sessionLimitReached
                                        ? 'linear-gradient(135deg, var(--error-color) 0%, rgb(185, 28, 28) 100%)'  // Vermelho para limite atingido
                                        : 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)', // Padrão
                                    color: 'white',
                                    border: 'none',
                                    cursor: (inputDisabled || !message.trim()) ? 'not-allowed' : 'pointer',
                                    opacity: (inputDisabled || !message.trim()) ? 0.5 : 1,
                                    transition: 'transform 0.2s, opacity 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: (inputDisabled || !message.trim())
                                        ? 'translateY(-50%) scale(0.95)'
                                        : 'translateY(-50%) scale(1)',
                                    boxShadow: sessionLimitReached
                                        ? '0 4px 12px rgba(239, 68, 68, 0.3)' // Sombra vermelha
                                        : '0 4px 12px rgba(8, 145, 178, 0.3)' // Sombra padrão turquesa
                                }}
                            >
                                {isSending ? (
                                    <svg
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            animation: 'spin 1s linear infinite'
                                        }}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : sessionLimitReached ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dicas de uso ou mensagem de limite atingido */}
                <div style={{
                    display: 'flex',
                    justifyContent: sessionLimitReached ? 'center' : 'space-between',
                    fontSize: '12px',
                    color: sessionLimitReached ? 'var(--error-color)' : 'var(--text-tertiary)',
                    marginTop: '8px',
                    padding: '0 8px',
                    fontWeight: sessionLimitReached ? '500' : 'normal'
                }}>
                    {sessionLimitReached ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Limite de mensagens atingido. Por favor, inicie uma nova conversa.
                        </div>
                    ) : (
                        <>
                            <div>
                                Digite <span style={{ fontFamily: 'monospace', backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)', padding: '2px 4px', borderRadius: '4px' }}>/</span> para comandos rápidos
                            </div>
                            <div>
                                <span style={{ opacity: 0.8 }}>Shift + Enter</span> para nova linha
                            </div>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}