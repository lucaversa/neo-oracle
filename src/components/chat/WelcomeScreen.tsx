// src/components/chat/WelcomeScreen.tsx
import React from 'react';

interface WelcomeScreenProps {
    onNewChat: () => void;
    hasPreviousChats: boolean;
    isCreating: boolean;
}

export default function WelcomeScreen({ onNewChat, hasPreviousChats, isCreating }: WelcomeScreenProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            height: '100%',
            padding: '20px',
            color: 'var(--text-secondary)'
        }}>

            <div style={{
                width: '100px',
                height: '100px',
                marginBottom: '30px',
                backgroundColor: 'var(--background-subtle)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)'
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--text-primary)'
            }}>
                Bem-vindo ao Oráculo
            </h1>

            <p style={{
                fontSize: '16px',
                maxWidth: '600px',
                marginBottom: '30px',
                lineHeight: '1.6'
            }}>
                {hasPreviousChats
                    ? 'Selecione uma conversa no painel lateral ou inicie uma nova conversa abaixo.'
                    : 'Começe uma nova conversa para fazer suas perguntas ao Oráculo.'}
            </p>

            <button
                onClick={onNewChat}
                disabled={isCreating}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 24px',
                    backgroundColor: 'var(--primary-color)', // Já usa a variável CSS, mas vamos garantir
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.7 : 1,
                    transition: 'background-color 0.2s',
                    boxShadow: 'var(--shadow-md)'
                }}
            >
                {isCreating ? (
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <svg
                            style={{
                                width: '20px',
                                height: '20px',
                                marginRight: '10px',
                                animation: 'spin 1s linear infinite'
                            }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Criando nova conversa...
                    </span>
                ) : (
                    <>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '10px' }}
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Iniciar Nova Conversa
                    </>
                )}
            </button>

            {hasPreviousChats && (
                <div style={{
                    marginTop: '40px',
                    backgroundColor: 'var(--background-subtle)',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    maxWidth: '450px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        Ou selecione uma conversa existente no painel lateral
                    </p>
                </div>
            )}
        </div>
    );
}