'use client'

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login } = useAuth();

    // Verificar se já está autenticado ou se há mensagens no URL
    useEffect(() => {
        // Se já estiver logado, redirecionar para o chat
        if (user) {
            router.push('/chat');
            return;
        }

        // Verificar mensagens do URL
        const registered = searchParams.get('registered');
        const expired = searchParams.get('expired');
        const errorParam = searchParams.get('error');

        if (registered === 'true') {
            setSuccessMessage('Conta criada com sucesso! Você já pode fazer login.');
        }

        if (expired === 'true') {
            setError('Sua sessão expirou por inatividade. Por favor, faça login novamente.');
        }

        if (errorParam) {
            setError(decodeURIComponent(errorParam));
        }
    }, [user, router, searchParams]);

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Usar o método de login do contexto de autenticação
            const result = await login(email, password);

            if (!result.success) {
                setError(result.error || 'Credenciais inválidas. Por favor, tente novamente.');
                return;
            }

            // Login bem-sucedido
            setSuccessMessage('Login realizado com sucesso! Redirecionando...');

            // Redirecionar para a página de chat
            router.push('/chat');

        } catch (err: any) {
            console.error('Erro ao processar login:', err);
            setError('Ocorreu um erro durante o login. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
            }}>
                {/* Cabeçalho */}
                <div style={{
                    padding: '40px 30px 30px',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 20px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: 'bold',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                    }}>
                        OR
                    </div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        marginBottom: '8px'
                    }}>
                        Oráculo Empresarial
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        opacity: '0.9'
                    }}>
                        Acesse sua conta para continuar
                    </p>
                </div>

                {/* Formulário */}
                <div style={{ padding: '30px' }}>
                    {successMessage && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderLeft: '4px solid #10b981',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            color: '#065f46',
                            fontSize: '14px'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid #ef4444',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            color: '#b91c1c',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label
                                htmlFor="email"
                                style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151'
                                }}
                            >
                                Email
                            </label>
                            <div style={{
                                position: 'relative'
                            }}>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        outline: 'none'
                                    }}
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '20px',
                                        height: '20px',
                                        color: '#9ca3af'
                                    }}
                                >
                                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                                </svg>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}>
                                <label
                                    htmlFor="password"
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#374151'
                                    }}
                                >
                                    Senha
                                </label>
                                <a
                                    href="#"
                                    style={{
                                        fontSize: '13px',
                                        color: '#3b82f6',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Esqueceu?
                                </a>
                            </div>
                            <div style={{
                                position: 'relative'
                            }}>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        outline: 'none'
                                    }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '20px',
                                        height: '20px',
                                        color: '#9ca3af'
                                    }}
                                >
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}>
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '4px',
                                    marginRight: '8px'
                                }}
                            />
                            <label
                                htmlFor="remember-me"
                                style={{
                                    fontSize: '14px',
                                    color: '#4b5563'
                                }}
                            >
                                Lembrar de mim
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '500',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? '0.7' : '1',
                                marginBottom: '12px'
                            }}
                        >
                            {loading ? (
                                <>
                                    <svg
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            marginRight: '8px',
                                            animation: 'spin 1s linear infinite'
                                        }}
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            style={{ opacity: 0.25 }}
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            style={{ opacity: 0.75 }}
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Entrando...
                                </>
                            ) : 'Entrar'}
                        </button>
                    </form>

                    <div style={{
                        marginTop: '24px',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '14px'
                    }}>
                        <p>Acesso restrito para usuários autorizados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}