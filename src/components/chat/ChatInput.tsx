import { useState, FormEvent, KeyboardEvent } from 'react';
import { useTheme } from '@/context/ThemeContext';

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
    const { isDarkMode } = useTheme();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!message.trim() || isSending || isThinking || disabled) return;

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

    const inputDisabled = disabled || isSending || isThinking;

    return (
        <div style={{
            borderTop: '1px solid var(--border-color)',
            padding: '16px',
            backgroundColor: 'var(--background-elevated)',
            transition: 'background-color 0.3s',
            position: 'relative'
        }}>
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
                            placeholder={isThinking ? "Aguarde o Oráculo terminar de pensar..." : placeholder}
                            disabled={inputDisabled}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                paddingRight: '60px', /* Aumentado para dar mais espaço ao botão */
                                backgroundColor: inputDisabled ? 'var(--background-subtle)' : 'var(--background-main)',
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
                                boxShadow: 'var(--shadow-sm)',
                                opacity: inputDisabled ? 0.6 : 1
                            }}
                            rows={1}
                        />

                        <button
                            type="submit"
                            disabled={inputDisabled || !message.trim()}
                            style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50%',
                                width: '36px',
                                height: '36px',
                                padding: '0',
                                borderRadius: '50%',
                                backgroundColor: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                cursor: (inputDisabled || !message.trim()) ? 'not-allowed' : 'pointer',
                                opacity: (inputDisabled || !message.trim()) ? 0.5 : 1,
                                transition: 'background-color 0.2s, transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: (inputDisabled || !message.trim())
                                    ? 'translateY(-50%) scale(0.95)'
                                    : 'translateY(-50%) scale(1)',
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