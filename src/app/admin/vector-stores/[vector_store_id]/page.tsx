// src/app/admin/vector-stores/[vector_store_id]/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { withAdminAccess } from '@/context/AdminContext';
import { VectorStore } from '@/types/admin';
import { getVectorStore } from '@/services/vectorStoreService';
import FileList from '@/components/admin/FileList';
import FileUpload from '@/components/admin/FileUpload';
import HelpTooltip from '@/components/common/HelpTooltip';
import TutorialModal from '@/components/admin/TutorialModal';

function VectorStoreDetailPage() {
    // Usar o hook useParams() em vez de acessar props.params diretamente
    const params = useParams();
    const vector_store_id = String(params.vector_store_id || '');

    // Estado e hooks
    const [vectorStore, setVectorStore] = useState<VectorStore | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (vector_store_id) {
            loadVectorStore();
        }
    }, [vector_store_id, refreshTrigger]);

    const loadVectorStore = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getVectorStore(vector_store_id);
            setVectorStore(data);
        } catch (error) {
            console.error('Erro ao carregar vector store:', error);
            setError('Falha ao carregar os dados. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        borderColor: 'var(--border-color)',
                        borderTopColor: 'var(--primary-color)',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                    }}>
                        Carregando dados...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderLeft: '4px solid var(--error-color)',
                borderRadius: '8px',
                marginBottom: '24px',
                color: 'var(--error-color)',
                fontSize: '14px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                </div>
                <button
                    onClick={loadVectorStore}
                    style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--error-color)',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!vectorStore) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                color: 'var(--text-secondary)'
            }}>
                <p>Vector Store não encontrada</p>
                <button
                    onClick={handleBack}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--background-main)',
            transition: 'background-color 0.3s'
        }}>
            {/* Barra superior */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderBottom: '1px solid var(--border-color)',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            padding: '8px'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                    }}>
                        {vectorStore?.name || 'Carregando...'}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Botão Tutorial */}
                    <button
                        onClick={() => setIsTutorialOpen(true)}
                        style={{
                            backgroundColor: 'var(--background-subtle)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Tutorial
                    </button>

                    {/* Botão de Atualizar */}
                    <button
                        onClick={handleRefresh}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '24px'
            }}>
                {/* Informações da Vector Store */}
                <div style={{
                    backgroundColor: 'var(--background-elevated)',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                                <line x1="7" y1="2" x2="7" y2="22"></line>
                                <line x1="17" y1="2" x2="17" y2="22"></line>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <line x1="2" y1="7" x2="7" y2="7"></line>
                                <line x1="2" y1="17" x2="7" y2="17"></line>
                                <line x1="17" y1="17" x2="22" y2="17"></line>
                                <line x1="17" y1="7" x2="22" y2="7"></line>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '4px'
                            }}>
                                {vectorStore?.name || 'Carregando...'}
                            </h2>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: 'var(--text-secondary)',
                                fontSize: '14px'
                            }}>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    Criado em {vectorStore ? new Date(vectorStore.created_at).toLocaleString() : '...'}
                                </span>
                                <span style={{
                                    backgroundColor: vectorStore?.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: vectorStore?.is_active ? 'var(--success-color)' : 'var(--error-color)',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    {vectorStore?.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                                <span style={{
                                    backgroundColor: vectorStore?.is_searchable ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                    color: vectorStore?.is_searchable ? 'var(--info-color)' : 'var(--text-tertiary)',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    {vectorStore?.is_searchable ? 'Pesquisável' : 'Não pesquisável'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {vectorStore?.description && (
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: 'var(--background-subtle)',
                            borderRadius: '6px'
                        }}>
                            {vectorStore.description}
                        </p>
                    )}
                </div>

                {/* Seção de upload de arquivos */}
                <div style={{
                    backgroundColor: 'var(--background-elevated)',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Upload de Arquivos
                        </h2>

                        <button
                            onClick={() => setIsTutorialOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--text-tertiary)',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Ver requisitos
                        </button>
                    </div>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px'
                    }}>
                        Adicione documentos para melhorar a pesquisa contextual. Formatos aceitos: PDF, TXT, DOC e DOCX.
                    </p>
                    <FileUpload
                        vectorStoreId={vector_store_id}
                        onUploadSuccess={handleRefresh}
                    />
                </div>

                {/* Seção de listagem de arquivos */}
                <div style={{
                    backgroundColor: 'var(--background-elevated)',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Arquivos na Vector Store
                        <HelpTooltip content="Esta tabela mostra todos os arquivos adicionados a esta Vector Store. Você pode excluí-los individualmente se necessário." />
                    </h2>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px'
                    }}>
                        Gerencie os documentos indexados nesta Vector Store. A exclusão de um arquivo o remove permanentemente.
                    </p>
                    <FileList
                        vectorStoreId={vector_store_id}
                        onRefresh={handleRefresh}
                    />
                </div>
            </div>

            {/* Modal Tutorial */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />
        </div>
    );
}

export default withAdminAccess(VectorStoreDetailPage);