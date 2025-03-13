// src/components/chat/ThinkingIndicator.tsx
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface ThinkingIndicatorProps {
    variant?: 'dots' | 'pulse' | 'typing' | 'brain';
    customText?: string;
}

const ThinkingIndicator = ({
    variant = 'typing',
    customText = 'Oráculo está pensando'
}: ThinkingIndicatorProps) => {
    const { isDarkMode } = useTheme();
    const [dots, setDots] = useState('');

    // Para animação dos pontos flutuantes
    useEffect(() => {
        if (variant === 'dots') {
            const interval = setInterval(() => {
                setDots(prev => {
                    if (prev.length >= 3) return '';
                    return prev + '.';
                });
            }, 500);
            return () => clearInterval(interval);
        }
    }, [variant]);

    // Animação de escrita para efeito de typing (1 letra por vez)
    const [typingText, setTypingText] = useState('');
    const [index, setIndex] = useState(0);
    const [showCursor, setShowCursor] = useState(true);

    useEffect(() => {
        if (variant === 'typing') {
            // Reiniciar quando o texto mudar
            setIndex(0);
            setTypingText('');

            // Animar o cursor piscando
            const cursorInterval = setInterval(() => {
                setShowCursor(prev => !prev);
            }, 500);

            return () => clearInterval(cursorInterval);
        }
    }, [variant, customText]);

    useEffect(() => {
        if (variant === 'typing' && index < customText.length) {
            // Timer para adicionar uma letra por vez
            const timer = setTimeout(() => {
                setTypingText(customText.substring(0, index + 1));
                setIndex(prevIndex => prevIndex + 1);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [variant, index, customText]);

    // Estilos para animações
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        borderRadius: '12px',
        backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.7)',
        color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(55, 65, 81, 0.9)',
        fontWeight: 500,
        fontSize: '15px',
        boxShadow: 'var(--shadow-sm)',
        border: `1px solid ${isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)'}`,
        backdropFilter: 'blur(4px)',
        position: 'relative',
        overflow: 'hidden'
    };

    // Renderização condicional baseada na variante
    switch (variant) {
        case 'dots':
            return (
                <div style={containerStyle}>
                    <IconOraculo animated={true} />
                    <span>{customText}{dots}</span>
                </div>
            );

        case 'pulse':
            return (
                <div style={containerStyle}>
                    <div style={{ position: 'relative' }}>
                        <IconOraculo animated={true} />
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, rgba(79, 70, 229, 0) 70%)',
                            animation: 'pulse 2s infinite'
                        }}></div>
                    </div>
                    <span>{customText}</span>
                    <div className="thinking-waves">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div
                                key={i}
                                className="thinking-wave"
                                style={{
                                    width: '3px',
                                    height: '15px',
                                    margin: '0 2px',
                                    borderRadius: '2px',
                                    background: 'var(--primary-color)',
                                    animation: `waveAnimation 1s ease-in-out ${i * 0.15}s infinite alternate`,
                                }}
                            ></div>
                        ))}
                    </div>
                </div>
            );

        case 'typing':
            return (
                <div style={containerStyle}>
                    <IconOraculo animated={true} />
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            display: 'inline-block',
                            minWidth: '180px',
                            textAlign: 'left'
                        }}>
                            {typingText}
                            {index < customText.length && showCursor && (
                                <span
                                    className="typing-cursor"
                                    style={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '16px',
                                        backgroundColor: 'currentColor',
                                        marginLeft: '1px',
                                        verticalAlign: 'middle',
                                        opacity: showCursor ? 1 : 0
                                    }}
                                />
                            )}
                        </span>
                    </div>
                </div>
            );

        case 'brain':
            return (
                <div style={containerStyle}>
                    <div className="brain-animation">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                animation: 'pulse 2s infinite',
                            }}
                        >
                            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-3.04Z"></path>
                            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-3.04Z"></path>
                        </svg>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, rgba(79, 70, 229, 0) 70%)',
                            animation: 'pulse 2s infinite'
                        }}></div>
                    </div>
                    <span>{customText}</span>
                    <span className="dots-loading">
                        <span className="dot" style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: 'currentColor',
                            display: 'inline-block',
                            margin: '0 2px',
                            animation: 'dotFade 1.4s infinite ease-in-out both',
                            animationDelay: '0s'
                        }}></span>
                        <span className="dot" style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: 'currentColor',
                            display: 'inline-block',
                            margin: '0 2px',
                            animation: 'dotFade 1.4s infinite ease-in-out both',
                            animationDelay: '0.2s'
                        }}></span>
                        <span className="dot" style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: 'currentColor',
                            display: 'inline-block',
                            margin: '0 2px',
                            animation: 'dotFade 1.4s infinite ease-in-out both',
                            animationDelay: '0.4s'
                        }}></span>
                    </span>
                </div>
            );

        default:
            return (
                <div style={containerStyle}>
                    <IconOraculo animated={true} />
                    <span>{customText}...</span>
                </div>
            );
    }
};

// Componente do ícone do Oráculo
const IconOraculo = ({ animated = false }: { animated?: boolean }) => {
    const animationStyle = animated ? {
        animation: 'pulse 2s infinite'
    } : {};

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            ...animationStyle
        }}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                {animated && (
                    <>
                        <line x1="12" y1="5" x2="12" y2="3" className="pulse-line"></line>
                        <line x1="17" y1="7" x2="19" y2="5" className="pulse-line"></line>
                        <line x1="19" y1="12" x2="21" y2="12" className="pulse-line"></line>
                        <line x1="17" y1="17" x2="19" y2="19" className="pulse-line"></line>
                        <line x1="12" y1="19" x2="12" y2="21" className="pulse-line"></line>
                        <line x1="7" y1="17" x2="5" y2="19" className="pulse-line"></line>
                        <line x1="5" y1="12" x2="3" y2="12" className="pulse-line"></line>
                        <line x1="7" y1="7" x2="5" y2="5" className="pulse-line"></line>
                    </>
                )}
            </svg>
        </div>
    );
};

export default ThinkingIndicator;