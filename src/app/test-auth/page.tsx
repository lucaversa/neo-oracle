// src/app/test-auth/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TestAuth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [supabaseConfig, setSupabaseConfig] = useState({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'URL não encontrada',
        keyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
            `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...` :
            'Chave não encontrada'
    });

    const testLogin = async () => {
        setLoading(true);
        setResult(null);

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Variáveis de ambiente não configuradas');
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            console.log('Tentando login direto com:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            setResult({
                success: true,
                userId: data.user?.id,
                email: data.user?.email,
                message: 'Login bem-sucedido!'
            });

        } catch (error: any) {
            console.error('Erro de autenticação:', error);
            setResult({
                success: false,
                error: error.message || 'Erro desconhecido',
                message: 'Falha na autenticação'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '500px',
            margin: '40px auto',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
                Teste Direto de Autenticação Supabase
            </h1>

            <div style={{
                backgroundColor: '#e9ecef',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '20px'
            }}>
                <h3>Configuração do Supabase:</h3>
                <p><strong>URL:</strong> {supabaseConfig.url}</p>
                <p><strong>Key Preview:</strong> {supabaseConfig.keyPreview}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ced4da'
                    }}
                />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Senha:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ced4da'
                    }}
                />
            </div>

            <button
                onClick={testLogin}
                disabled={loading || !email || !password}
                style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || !email || !password ? 0.7 : 1
                }}
            >
                {loading ? 'Testando...' : 'Testar Login'}
            </button>

            {result && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    borderRadius: '6px',
                    backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                    color: result.success ? '#155724' : '#721c24',
                    border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    <h3>{result.message}</h3>
                    {result.success ? (
                        <div>
                            <p><strong>User ID:</strong> {result.userId}</p>
                            <p><strong>Email:</strong> {result.email}</p>
                        </div>
                    ) : (
                        <p><strong>Erro:</strong> {result.error}</p>
                    )}
                </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
                    Voltar para a página inicial
                </a>
            </div>
        </div>
    );
}