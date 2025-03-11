// src/app/debug-auth/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DebugAuth() {
    const [user, setUser] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [redirectResult, setRedirectResult] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toISOString()} - ${message}`]);
    };

    const checkAuth = async () => {
        addLog('Verificando autenticação...');
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                addLog(`Erro ao obter sessão: ${error.message}`);
                return;
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);
                addLog('Sessão ativa encontrada');
            } else {
                addLog('Nenhuma sessão ativa');
            }
        } catch (err: any) {
            addLog(`Exceção ao verificar autenticação: ${err.message}`);
        }
    };

    const testRedirect = async () => {
        addLog('Testando redirecionamento para /chat...');
        try {
            // Testar redirecionamento com router.push
            addLog('Tentando router.push()...');
            router.push('/chat');

            // Configurar timer para verificar se o redirecionamento falhou
            setTimeout(() => {
                if (window.location.pathname !== '/chat') {
                    addLog('router.push() não redirecionou após 1 segundo');
                    setRedirectResult('Router push falhou após 1 segundo');
                }
            }, 1000);
        } catch (err: any) {
            addLog(`Erro ao redirecionar: ${err.message}`);
            setRedirectResult(`Erro: ${err.message}`);
        }
    };

    const forceRedirect = () => {
        addLog('Forçando redirecionamento com window.location...');
        window.location.href = '/chat';
    };

    const logoutAndRedirect = async () => {
        addLog('Fazendo logout...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                addLog(`Erro ao fazer logout: ${error.message}`);
                return;
            }
            addLog('Logout bem-sucedido. Redirecionando...');
            window.location.href = '/login';
        } catch (err: any) {
            addLog(`Exceção ao fazer logout: ${err.message}`);
        }
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                Diagnóstico de Autenticação
            </h1>

            <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                    Status de Autenticação
                </h2>
                <p><strong>Autenticado:</strong> {user ? 'Sim' : 'Não'}</p>
                {user && (
                    <div>
                        <p><strong>ID do Usuário:</strong> {user.id}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Último login:</strong> {new Date(user.last_sign_in_at).toLocaleString()}</p>
                    </div>
                )}
            </div>

            {session && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                        Detalhes da Sessão
                    </h2>
                    <p><strong>Expira em:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
                    <p><strong>Tipo de Token:</strong> {session.token_type}</p>
                    <p><strong>Provider:</strong> {session.provider}</p>

                    <div style={{ marginTop: '10px' }}>
                        <details>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                                Dados completos da sessão (técnico)
                            </summary>
                            <pre style={{
                                marginTop: '10px',
                                padding: '10px',
                                backgroundColor: '#f1f1f1',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {JSON.stringify(session, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}

            <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                    Ferramentas de Diagnóstico
                </h2>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button
                        onClick={checkAuth}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Verificar Autenticação
                    </button>

                    <button
                        onClick={testRedirect}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#198754',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Testar Redirecionamento
                    </button>

                    <button
                        onClick={forceRedirect}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#fd7e14',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Forçar Redirecionamento
                    </button>

                    <button
                        onClick={logoutAndRedirect}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Logout e Redirecionamento
                    </button>
                </div>

                {redirectResult && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: redirectResult.includes('Erro') ? '#f8d7da' : '#d4edda',
                        border: `1px solid ${redirectResult.includes('Erro') ? '#f5c6cb' : '#c3e6cb'}`,
                        borderRadius: '4px',
                        marginBottom: '15px'
                    }}>
                        {redirectResult}
                    </div>
                )}
            </div>

            <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                    Logs
                </h2>
                <div style={{
                    backgroundColor: '#212529',
                    color: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                }}>
                    {logs.length === 0 ? (
                        <p>Nenhum log disponível.</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))
                    )}
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a
                    href="/login"
                    style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        marginRight: '10px'
                    }}
                >
                    Voltar para Login
                </a>

                <a
                    href="/test-auth"
                    style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px'
                    }}
                >
                    Ir para Test Auth
                </a>
            </div>
        </div>
    );
}