// src/components/admin/VectorStoreCard.tsx
'use client'

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VectorStore } from '@/types/admin';
import { useRouter } from 'next/navigation';

interface VectorStoreCardProps {
    vectorStore: VectorStore;
    onDelete: (vectorStore: VectorStore) => void;
    onToggleStatus: (vectorStore: VectorStore, newStatus: boolean) => Promise<void>;
}

export default function VectorStoreCard({
    vectorStore,
    onDelete,
    onToggleStatus
}: VectorStoreCardProps) {
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleToggleStatus = async () => {
        try {
            console.log('[CARD] Iniciando alteração de status para vector store:', vectorStore.vector_store_id);
            console.log('[CARD] Status atual:', vectorStore.is_searchable);
            console.log('[CARD] Novo status:', !vectorStore.is_searchable);

            setError(null);
            setIsTogglingStatus(true);

            await onToggleStatus(vectorStore, !vectorStore.is_searchable);

            console.log('[CARD] Status alterado com sucesso');
        } catch (error) {
            console.error('[CARD] Erro ao alterar status:', error);
            setError('Falha ao alterar status. Tente novamente.');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'Data desconhecida';
        }
    };

    const navigateToDetails = () => {
        router.push(`/admin/vector-stores/${vectorStore.vector_store_id}`);
    };

    return (
        <div style={{
            backgroundColor: 'var(--background-elevated)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            transition: 'all 0.2s',
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Cabeçalho */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                    <div>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {vectorStore.name}
                        </h3>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                fontSize: '12px',
                                color: 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                {formatDate(vectorStore.created_at)}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                backgroundColor: vectorStore.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: vectorStore.is_active ? 'var(--success-color)' : 'var(--error-color)',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontWeight: '500'
                            }}>
                                {vectorStore.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <span style={{
                                fontSize: '12px',
                                backgroundColor: vectorStore.is_searchable ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: vectorStore.is_searchable ? 'var(--info-color)' : 'var(--text-tertiary)',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontWeight: '500'
                            }}>
                                {vectorStore.is_searchable ? 'Pesquisável' : 'Não pesquisável'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Corpo */}
            <div style={{
                padding: '16px 20px',
                flex: 1
            }}>
                {vectorStore.description ? (
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {vectorStore.description}
                    </p>
                ) : (
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--text-tertiary)',
                        fontStyle: 'italic',
                        marginBottom: '16px'
                    }}>
                        Sem descrição
                    </p>
                )}

                {error && (
                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderLeft: '3px solid var(--error-color)',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        color: 'var(--error-color)',
                        fontSize: '13px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Botão para ver arquivos */}
                <button
                    onClick={navigateToDetails}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'var(--background-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        transition: 'all 0.2s'
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Gerenciar Arquivos
                </button>
            </div>

            {/* Rodapé com ações */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div>
                    <button
                        onClick={handleToggleStatus}
                        disabled={isTogglingStatus}
                        style={{
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--primary-color)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isTogglingStatus ? (
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
                        ) : (
                            <>
                                {vectorStore.is_searchable ? (
                                    // Ícone para desativar busca
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    // Ícone para ativar busca
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </>
                        )}
                        {vectorStore.is_searchable ? 'Desativar busca' : 'Ativar busca'}
                    </button>
                </div>
                <div>
                    <button
                        onClick={() => onDelete(vectorStore)}
                        style={{
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--error-color)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}