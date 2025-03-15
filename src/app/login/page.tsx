'use client'

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();

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

        // Correção para o bloco catch do handleLogin
        try {
            setError('');
            setLoading(true);

            // Usar o método de login do contexto de autenticação
            const result = await login(email, password);

            if (!result.success) {
                // Tratando diferentes tipos de erro com mensagens específicas
                if (result.error?.includes('Invalid')) {
                    setError('Credenciais inválidas. Verifique seu email e senha.');
                } else if (result.error?.includes('not found') || result.error?.includes('user') || result.error?.includes('no user')) {
                    setError('Usuário não encontrado. Verifique seu email ou contacte o administrador.');
                } else if (result.error?.includes('locked') || result.error?.includes('disabled')) {
                    setError('Conta bloqueada ou desativada. Entre em contato com o administrador.');
                } else if (result.error?.includes('network') || result.error?.includes('connection')) {
                    setError('Erro de conexão. Verifique sua internet e tente novamente.');
                } else if (result.error?.includes('many') || result.error?.includes('attempts')) {
                    setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
                } else {
                    setError(result.error || 'Erro ao realizar login. Por favor, tente novamente.');
                }
                return;
            }

            // Login bem-sucedido
            setSuccessMessage('Login realizado com sucesso! Redirecionando...');

            // Redirecionar para a página de chat
            router.push('/chat');

        } catch (err: unknown) {
            console.error('Erro ao processar login:', err);

            // Criando uma interface para tipos de erro que podem ter propriedades específicas
            interface ExtendedError {
                message?: string;
                code?: string;
                status?: number;
            }

            // Converter para o tipo extendido
            const error = err as ExtendedError;

            // Tratamento mais detalhado de erros de exceção
            if (error.message?.includes('network') || error.code === 'NETWORK_ERROR' || !navigator.onLine) {
                setError('Erro de conexão. Verifique sua internet e tente novamente.');
            } else if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
                setError('O servidor demorou para responder. Tente novamente em alguns instantes.');
            } else if (error.message?.includes('server') || error.status && error.status >= 500) {
                setError('Erro no servidor. Nossa equipe foi notificada. Tente novamente mais tarde.');
            } else if (error.status === 429) {
                setError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
            } else if (error.status === 403) {
                setError('Acesso negado. Verifique se você tem permissão para acessar o sistema.');
            } else {
                setError('Ocorreu um erro durante o login. Por favor, tente novamente.');
            }
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
            backgroundColor: 'var(--background-main)',
            backgroundImage: isDarkMode
                ? 'radial-gradient(circle at top right, rgba(79, 70, 229, 0.1) 0%, transparent 60%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05) 0%, transparent 50%)'
                : 'radial-gradient(circle at top right, rgba(79, 70, 229, 0.15) 0%, transparent 60%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
            padding: '20px',
            transition: 'background-color 0.3s, color 0.3s'
        }}>
            {/* Toggle Theme Button */}
            <button
                onClick={toggleDarkMode}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'background-color 0.3s'
                }}
                aria-label={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
                {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                )}
            </button>

            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                transition: 'background-color 0.3s, box-shadow 0.3s',
                animation: 'fadeIn 0.5s ease-out'
            }}>
                {/* Cabeçalho */}
                <div style={{
                    padding: '40px 30px 30px',
                    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                    color: 'white',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Elementos decorativos */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: 1
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-30px',
                        left: '-30px',
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: 1
                    }}></div>

                    <div style={{
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                            backdropFilter: 'blur(4px)',
                            border: '2px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            OR
                        </div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            marginBottom: '8px'
                        }}>
                            Oráculo
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            opacity: '0.9'
                        }}>
                            Acesse sua conta para continuar
                        </p>
                    </div>
                </div>

                {/* Formulário */}
                <div style={{
                    padding: '30px',
                    transition: 'background-color 0.3s'
                }}>
                    {successMessage && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderLeft: '4px solid var(--success-color)',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            color: 'var(--success-color)',
                            fontSize: '14px',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                {successMessage}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid var(--error-color)',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            color: 'var(--error-color)',
                            fontSize: '14px',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                {error}
                            </div>
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
                                    color: 'var(--text-primary)',
                                    transition: 'color 0.3s'
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
                                        padding: '14px 14px 14px 46px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        outline: 'none',
                                        backgroundColor: 'var(--background-main)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.3s',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '22px',
                                    height: '22px',
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.3s'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
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
                                        color: 'var(--text-primary)',
                                        transition: 'color 0.3s'
                                    }}
                                >
                                    Senha
                                </label>
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
                                        padding: '14px 14px 14px 46px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        outline: 'none',
                                        backgroundColor: 'var(--background-main)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.3s',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '22px',
                                    height: '22px',
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.3s'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}>
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    style={{
                                        position: 'absolute',
                                        opacity: 0,
                                        width: '0',
                                        height: '0'
                                    }}
                                />
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    marginRight: '10px',
                                    border: '2px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--background-main)'
                                }} onClick={() => {
                                    const checkbox = document.getElementById('remember-me') as HTMLInputElement;
                                    checkbox.checked = !checkbox.checked;
                                }}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <label
                                    htmlFor="remember-me"
                                    style={{
                                        fontSize: '14px',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'color 0.3s'
                                    }}
                                >
                                    Lembrar de mim
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                padding: '14px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? '0.7' : '1',
                                marginBottom: '16px',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-md)'
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
                        color: 'var(--text-tertiary)',
                        fontSize: '14px',
                        transition: 'color 0.3s'
                    }}>
                        <p>Acesso restrito para usuários autorizados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}