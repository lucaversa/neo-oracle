// src/app/chat/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Importe o cliente Supabase

export default function SimpleChat() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<{ content: string, isUser: boolean }[]>([
        { content: 'Olá! Como posso ajudar você hoje?', isUser: false }
    ]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Verificar se o usuário está logado
    useEffect(() => {
        const checkUser = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Error fetching session:', error);
                return;
            }

            if (data.session) {
                setUser(data.session.user);
            } else {
                router.push('/login');
            }

            setLoading(false);
        };

        checkUser();
    }, [router]);

    const handleSendMessage = () => {
        if (!message.trim()) return;

        // Adicionar mensagem do usuário
        setMessages(prev => [...prev, { content: message, isUser: true }]);

        // Simular resposta (em produção, isso seria a chamada ao webhook)
        setTimeout(() => {
            setMessages(prev => [...prev, {
                content: `Recebi sua mensagem: "${message}"`,
                isUser: false
            }]);
        }, 1000);

        setMessage('');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#ffffff',
                padding: '16px 20px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1e293b'
                }}>
                    Oráculo Empresarial
                </h1>

                <div style={{
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '14px',
                        marginRight: '16px'
                    }}>
                        {user?.email || 'Usuário'}
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Sair
                    </button>
                </div>
            </header>

            {/* Chat area */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            style={{
                                alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.isUser ? '#3b82f6' : '#ffffff',
                                color: msg.isUser ? 'white' : '#1e293b',
                                padding: '12px 16px',
                                borderRadius: msg.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                maxWidth: '70%',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                        >
                            {msg.content}
                        </div>
                    ))}
                </div>
            </div>

            {/* Input area */}
            <div style={{
                padding: '16px 20px',
                backgroundColor: 'white',
                borderTop: '1px solid #e5e7eb'
            }}>
                <div style={{
                    display: 'flex',
                    maxWidth: '800px',
                    margin: '0 auto',
                    gap: '12px'
                }}>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Digite sua mensagem..."
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            outline: 'none',
                            fontSize: '15px'
                        }}
                    />

                    <button
                        onClick={handleSendMessage}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}