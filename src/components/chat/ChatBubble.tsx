import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { useTheme } from '@/context/ThemeContext';

interface ChatBubbleProps {
    message: ChatMessage;
    userName?: string;
}

export default function ChatBubble({ message, userName = '' }: ChatBubbleProps) {
    const isUser = message.type === 'human';
    const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
    const { isDarkMode } = useTheme();
    const [copied, setCopied] = useState(false);

    // Função para copiar o conteúdo da mensagem
    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content)
            .then(() => {
                setCopied(true);
                // Resetar o estado após 2 segundos
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
            });
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '24px',
            gap: '12px',
            alignItems: 'flex-start',
            position: 'relative',
        }}>
            {/* Avatar - aparece à esquerda para mensagens do AI */}
            {!isUser && (
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: 'var(--shadow-md)',
                    flexShrink: 0
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                        <path d="M12 8v4l3 3" />
                        <path d="M12 16h.01" />
                    </svg>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '80%'
            }}>
                {/* Bolha de mensagem */}
                <div style={{
                    borderRadius: '18px',
                    padding: '12px 16px',
                    backgroundColor: isUser
                        ? '#4f46e5'
                        : (isDarkMode ? 'var(--background-subtle)' : 'var(--background-subtle)'),
                    color: isUser
                        ? 'white'
                        : 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    borderBottomLeftRadius: !isUser ? '4px' : undefined,
                    borderBottomRightRadius: isUser ? '4px' : undefined
                }}>
                    <div style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '15px',
                        lineHeight: '1.5'
                    }}>
                        {message.content}
                    </div>
                </div>

                {/* Botão de copiar - apenas para mensagens do AI */}
                {!isUser && (
                    <button
                        onClick={copyToClipboard}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-sm)',
                            backgroundColor: isDarkMode ? 'var(--background-elevated)' : 'var(--background-main)',
                        }}
                        title="Copiar para a área de transferência"
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Copiado!
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copiar
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Avatar do usuário */}
            {isUser && (
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: 'var(--shadow-md)',
                    flexShrink: 0
                }}>
                    {initial}
                </div>
            )}
        </div>
    );
}