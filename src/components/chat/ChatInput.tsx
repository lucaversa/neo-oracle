import { useState, FormEvent, KeyboardEvent } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface ChatInputProps {
    onSendMessage: (message: string) => Promise<void>;
    disabled?: boolean;
    isThinking?: boolean; // Nova prop para indicar se o Oráculo está "pensando"
}

export default function ChatInput({ onSendMessage, disabled = false, isThinking = false }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { isDarkMode } = useTheme();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!message.trim() || isSending || isThinking) return;

        setIsSending(true);
        try {
            await onSendMessage(message);
            setMessage('');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enviar com Enter (sem Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div style={{
            borderTop: '1px solid var(--border-color)',
            padding: '16px',
            backgroundColor: 'var(--background-elevated)',
            transition: 'background-color 0.3s',
            position: 'relative'
        }}>
            {/* Indicador de "pensando" */}
            {isThinking && (
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--background-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '8px 16px',
                    borderRadius: '99px',
                    fontSize: '14px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 10,
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center'
                    }}>
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
            )}

            <form
                onSubmit={handleSubmit}
                style={{
                    maxWidth: '900px',
                    margin: '0 auto'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px'
                }}>
                    <div style={{
                        flexGrow: 1,
                        position: 'relative'
                    }}>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isThinking ? "Aguarde o Oráculo terminar de pensar..." : "Digite sua mensagem..."}
                            disabled={disabled || isSending || isThinking}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                paddingRight: '50px',
                                backgroundColor: 'var(--background-main)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                outline: 'none',
                                resize: 'none',
                                minHeight: '60px',
                                maxHeight: '200px',
                                transition: 'border-color 0.2s, background-color 0.3s',
                                fontSize: '15px',
                                lineHeight: '1.5',
                                color: 'var(--text-primary)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            rows={1}
                        />

                        <button
                            type="submit"
                            disabled={disabled || isSending || !message.trim() || isThinking}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                bottom: '10px',
                                padding: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                cursor: (disabled || isSending || !message.trim() || isThinking) ? 'not-allowed' : 'pointer',
                                opacity: (disabled || isSending || !message.trim() || isThinking) ? 0.5 : 1,
                                transition: 'background-color 0.2s, transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: (disabled || isSending || !message.trim() || isThinking) ? 'scale(0.95)' : 'scale(1)',
                                boxShadow: 'var(--shadow-sm)'
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <p style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginTop: '8px',
                    textAlign: 'center'
                }}>
                    Pressione Shift + Enter para adicionar uma nova linha
                </p>
            </form>
        </div>
    );
}