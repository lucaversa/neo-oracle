// src/components/chat/SessionEditor.tsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SessionEditorProps {
    sessionId: string;
    userId: string;
    initialTitle: string;
    onCancel: () => void;
    onSuccess: (newTitle: string) => void;
}

export default function SessionEditor({
    sessionId,
    userId,
    initialTitle,
    onCancel,
    onSuccess
}: SessionEditorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focar no input quando o componente é montado
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('O título não pode estar vazio');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            console.log('Enviando solicitação para renomear sessão:');
            console.log('- sessionId:', sessionId);
            console.log('- userId:', userId);
            console.log('- novo título:', title.trim());

            // Avisar imediatamente o componente pai sobre a mudança para atualizar a UI rapidamente
            onSuccess(title.trim());

            // Depois fazer a atualização no Supabase
            const { data, error: updateError } = await supabase
                .from('user_chat_sessions')
                .update({ title: title.trim() })
                .eq('session_id', sessionId.trim())
                .eq('user_id', userId)
                .select();

            if (updateError) {
                console.error('Erro ao atualizar título no banco de dados:', updateError);
                // Não revertemos a UI porque já atualizamos o título localmente
                return;
            }

            console.log('Atualização realizada com sucesso no banco de dados:', data);
        } catch (err) {
            console.error('Exceção ao atualizar título:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '8px',
            backgroundColor: 'var(--background-subtle)',
            borderRadius: '8px',
            gap: '8px'
        }}>
            {error && (
                <div style={{
                    padding: '6px 10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--error-color)',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    {error}
                </div>
            )}

            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--background-main)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                    placeholder="Nome da conversa"
                />
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px'
            }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1
                    }}
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--primary-color)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <svg
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    animation: 'spin 1s linear infinite'
                                }}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Salvando...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Salvar
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}