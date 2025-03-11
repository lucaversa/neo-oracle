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

    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '24px',
            gap: '12px',
            alignItems: 'flex-start'
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

            {/* Bolha de mensagem */}
            <div style={{
                maxWidth: '80%',
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