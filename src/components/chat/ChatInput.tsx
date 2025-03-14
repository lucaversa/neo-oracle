import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

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
}

export default function ChatInput({
    onSendMessage,
    disabled = false,
    isThinking = false,
    placeholder = "O que você quer saber?"
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [commandFilter, setCommandFilter] = useState('');
    const { isDarkMode } = useTheme();
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const commandsRef = useRef<HTMLDivElement>(null);

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
                    alignItems: 'flex-end',
                    gap: '12px',
                    position: 'relative'
                }}>
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
                                backgroundColor: isDarkMode
                                    ? 'rgba(55, 65, 81, 0.3)'
                                    : 'rgba(249, 250, 251, 0.8)',
                                borderRadius: '20px',
                                border: '1px solid var(--border-color)',
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
                                    : '0 2px 6px rgba(0, 0, 0, 0.05)',
                                opacity: inputDisabled ? 0.6 : 1,
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
                                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
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
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
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
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dicas de uso */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginTop: '8px',
                    padding: '0 8px'
                }}>
                    <div>
                        Digite <span style={{ fontFamily: 'monospace', backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)', padding: '2px 4px', borderRadius: '4px' }}>/</span> para comandos rápidos
                    </div>
                    <div>
                        <span style={{ opacity: 0.8 }}>Shift + Enter</span> para nova linha
                    </div>
                </div>
            </form>
        </div>
    );
}