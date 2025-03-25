import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface MessageLimitOverlayProps {
    onNewSession: () => Promise<string | null>;
}

// Componente de sobreposição quando o limite de mensagens é atingido
const MessageLimitOverlay: React.FC<MessageLimitOverlayProps> = ({ onNewSession }) => {
    const { isDarkMode } = useTheme();
    const [isMobile, setIsMobile] = useState(false);

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

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDarkMode ? 'rgba(24, 33, 47, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: isMobile ? 'none' : 'blur(8px)', // Remover blur no mobile
            padding: isMobile ? '16px' : '20px',
            borderTop: `1px solid ${isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'var(--border-color)'}`,
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
            animation: 'slideUp 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '12px' : '16px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '12px',
                flexDirection: isMobile ? 'column' : 'row'
            }}>
                {/* Ícone de alerta */}
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '50%',
                    width: isMobile ? '36px' : '48px',
                    height: isMobile ? '36px' : '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    alignSelf: isMobile ? 'center' : 'flex-start',
                    marginBottom: isMobile ? '8px' : '0'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "20" : "24"} height={isMobile ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <div style={{
                    textAlign: isMobile ? 'center' : 'left',
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: '600',
                        color: isDarkMode ? '#ffffff' : 'var(--text-primary)',
                        letterSpacing: '0.3px'
                    }}>Limite de mensagens atingido</h3>
                    <p style={{
                        margin: '4px 0 0 0',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
                        maxWidth: '600px',
                        fontSize: isMobile ? '14px' : '15px',
                        lineHeight: '1.4'
                    }}>
                        Esta conversa atingiu o número máximo de mensagens permitido. Para continuar, inicie uma nova conversa.
                    </p>
                </div>
            </div>

            <button
                onClick={onNewSession}
                style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: isMobile ? '10px 16px' : '12px 24px',
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s ease',
                    width: isMobile ? '100%' : 'auto',
                    maxWidth: isMobile ? '280px' : 'none',
                    letterSpacing: '0.3px',
                    textRendering: 'optimizeLegibility', // Melhorar a renderização de fontes
                    WebkitFontSmoothing: 'antialiased', // Melhorar a renderização em dispositivos Apple
                    MozOsxFontSmoothing: 'grayscale' // Melhorar a renderização em dispositivos Apple
                }}
                onMouseOver={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                    }
                }}
                onMouseOut={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                </svg>
                Iniciar Nova Conversa
            </button>

            {/* Barra de progresso visual para indicar que o limite foi atingido */}
            <div style={{
                width: '100%',
                maxWidth: isMobile ? '100%' : '500px',
                marginTop: isMobile ? '6px' : '0'
            }}>
                <div style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'var(--error-color)',
                        borderRadius: '4px'
                    }}></div>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '6px',
                    fontSize: '12px',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-tertiary)',
                    fontWeight: '500'
                }}>
                    <span>Limite atingido (100%)</span>
                </div>
            </div>
        </div>
    );
};

export default MessageLimitOverlay;