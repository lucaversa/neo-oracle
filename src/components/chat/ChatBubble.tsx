// src/components/chat/ChatBubble.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/chat';
import { useTheme } from '@/context/ThemeContext';

interface ChatBubbleProps {
    message: ChatMessage;
    userName?: string;
    streamingContent?: string;
    isStreaming?: boolean;
}

export default function ChatBubble({
    message,
    userName = '',
    streamingContent,
    isStreaming = false,
}: ChatBubbleProps) {
    const isUser = message.type === 'human';
    const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
    const { isDarkMode } = useTheme();
    const [copied, setCopied] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isHovering, setIsHovering] = useState(false);

    // Ref para rastrear se a animação já foi executada
    const hasAnimatedRef = useRef(false);
    // Controlador de animação
    const [isAnimated, setIsAnimated] = useState(false);

    // Inicia a animação após um breve atraso para garantir renderização suave
    // Modificado para usar o ref e evitar reanimar quando já animado
    useEffect(() => {
        // Primeiro garante que a mensagem está visível
        setIsVisible(true);

        // Se já foi animado, mantenha o estado
        if (hasAnimatedRef.current) {
            setIsAnimated(true);
            return;
        }

        // Pequeno atraso antes de iniciar a animação
        const animationDelay = setTimeout(() => {
            setIsAnimated(true);
            hasAnimatedRef.current = true; // Marque que já foi animado
        }, 50);

        return () => clearTimeout(animationDelay);
    }, []);

    // Garantir que a bolha permanece visível durante o streaming
    useEffect(() => {
        if (isStreaming) {
            setIsVisible(true);
            // Se está em streaming e visível, garantir que a animação está ativa
            if (!isAnimated) {
                setIsAnimated(true);
                hasAnimatedRef.current = true;
            }
        }
    }, [isStreaming, isAnimated]);

    // Display content
    const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

    // Função para copiar
    const copyToClipboard = () => {
        navigator.clipboard.writeText(displayContent)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
            });
    };

    // Se o componente não estiver visível, não renderizar nada
    if (!isVisible) return null;

    // Estilo para o avatar com animação sutil de fade-in
    const avatarStyle = {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: 'var(--shadow-md)',
        flexShrink: 0,
        opacity: isAnimated ? 1 : 0,
        transform: `translateY(${isAnimated ? 0 : '6px'})`,
        transition: 'opacity 0.2s ease, transform 0.2s ease'
    } as React.CSSProperties;

    // Estilo para a bolha com fade-in e movimento leve para cima
    const bubbleStyle = {
        borderRadius: '18px',
        padding: '12px 16px',
        color: isUser ? 'white' : 'var(--text-primary)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative' as const,
        borderBottomLeftRadius: !isUser ? '4px' : undefined,
        borderBottomRightRadius: isUser ? '4px' : undefined,
        backgroundColor: isUser
            ? 'var(--primary-color)'
            : (isDarkMode ? 'var(--background-subtle)' : 'var(--background-subtle)'),
        opacity: isAnimated ? 1 : 0,
        transform: `translateY(${isAnimated ? 0 : '8px'})`,
        transition: 'opacity 0.3s ease, transform 0.3s ease'
    };

    // Estilo para o botão copiar
    const copyButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        padding: '6px 12px',
        background: 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        fontSize: '13px',
        color: isUser ? 'var(--primary-color)' : 'var(--text-secondary)',
        cursor: 'pointer',
        alignSelf: 'flex-start',
        boxShadow: isHovering ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        backgroundColor: isDarkMode ? 'var(--background-elevated)' : 'var(--background-main)',
        transform: isHovering ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isAnimated ? (isHovering ? 1 : 0.85) : 0,
        transition: 'all 0.2s ease',
        transitionDelay: isAnimated ? '0s' : '0.15s'
    } as React.CSSProperties;

    // Container com animação mais sutil, sem "mola"
    const containerStyle = {
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '24px',
        gap: '12px',
        alignItems: 'flex-start',
        opacity: 1
    } as React.CSSProperties;

    // Estilo para o indicador de digitação moderno
    const typingIndicatorStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '0 5px'
    };

    // Estilo para cada bolha do indicador
    const bubbleIndicatorStyle = (index: number) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        opacity: 0.5,
        animation: `typingBubble 1.4s infinite ease-in-out both`,
        animationDelay: `${index * 0.16}s`
    });

    return (
        <div style={containerStyle}>
            {/* Avatar - aparece à esquerda para mensagens do AI */}
            {!isUser && (
                <div style={avatarStyle}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
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
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '80%'
            }}>
                {/* Bolha de mensagem */}
                <div style={bubbleStyle}>
                    <div style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '15px',
                        lineHeight: '1.5'
                    }}>
                        {/* Se está em streaming e não há conteúdo ainda, mostrar o indicador de digitação */}
                        {isStreaming && !displayContent ? (
                            <div style={typingIndicatorStyle}>
                                <div style={bubbleIndicatorStyle(0)}></div>
                                <div style={bubbleIndicatorStyle(1)}></div>
                                <div style={bubbleIndicatorStyle(2)}></div>
                            </div>
                        ) : (
                            <>
                                {displayContent}
                                {isStreaming && !isUser && displayContent && (
                                    <span className="typing-cursor" style={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '16px',
                                        backgroundColor: 'currentColor',
                                        marginLeft: '4px',
                                        verticalAlign: 'middle',
                                        animation: 'blinkCursor 0.8s step-start infinite'
                                    }}></span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Botão de copiar - para ambos os tipos de mensagens quando houver conteúdo */}
                {displayContent && (
                    <button
                        onClick={copyToClipboard}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        style={copyButtonStyle}
                        className="copy-button"
                    >
                        {copied ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                animation: 'fadeIn 0.3s ease-out'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Copiado!
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copiar
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* Avatar do usuário */}
            {isUser && (
                <div style={avatarStyle}>
                    {initial}
                </div>
            )}
        </div>
    );
}

// Adiciona os keyframes para o cursor e animações das bolhas
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blinkCursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes typingBubble {
            0%, 80%, 100% { 
                transform: scale(0.6);
                opacity: 0.5;
            }
            40% { 
                transform: scale(1);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}