'use client'

import { useState } from 'react';
import { CreateVectorStoreRequest } from '@/types/admin';

interface CreateVectorStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateVectorStoreRequest) => Promise<void>;
}

export default function CreateVectorStoreModal({
    isOpen,
    onClose,
    onSubmit
}: CreateVectorStoreModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSearchable, setIsSearchable] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('O nome é obrigatório');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            await onSubmit({
                name: name.trim(),
                description: description.trim(),
                is_searchable: isSearchable
            });

            // Limpar formulário após sucesso
            setName('');
            setDescription('');
            setIsSearchable(true);

            // Fechar modal
            onClose();
        } catch (error) {
            console.error('Erro ao criar vector store:', error);
            setError(error instanceof Error ? error.message : 'Ocorreu um erro ao criar a Vector Store');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '500px',
                padding: '24px',
                position: 'relative',
                animation: 'modalFadeIn 0.3s ease-out'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px'
                    }}
                    disabled={isSubmitting}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '20px',
                    color: 'var(--text-primary)',
                    paddingRight: '24px'
                }}>
                    Nova Vector Store
                </h2>

                {error && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderLeft: '4px solid var(--error-color)',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        color: 'var(--error-color)',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label
                            htmlFor="name"
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Nome <span style={{ color: 'var(--error-color)' }}>*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Ex: Base de Conhecimento RH"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: 'var(--background-main)',
                                color: 'var(--text-primary)',
                                transition: 'border-color 0.3s',
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label
                            htmlFor="description"
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Descrição
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Descreva esta Vector Store (opcional)"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: 'var(--background-main)',
                                color: 'var(--text-primary)',
                                transition: 'border-color 0.3s',
                                minHeight: '100px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <input
                                id="is_searchable"
                                type="checkbox"
                                checked={isSearchable}
                                onChange={(e) => setIsSearchable(e.target.checked)}
                                disabled={isSubmitting}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: 'var(--primary-color)'
                                }}
                            />
                            <label
                                htmlFor="is_searchable"
                                style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                Permitir busca nesta Vector Store
                            </label>
                        </div>
                        <p style={{
                            marginTop: '4px',
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            marginLeft: '26px'
                        }}>
                            Quando ativado, esta Vector Store será usada para consultas no chat.
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: 'none',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg
                                        style={{
                                            width: '16px',
                                            height: '16px',
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
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Criar Vector Store
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}