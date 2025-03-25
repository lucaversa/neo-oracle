'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { withAdminAccess } from '@/context/AdminContext';
import { VectorStore, CreateVectorStoreRequest } from '@/types/admin';
import {
    listVectorStores,
    createVectorStore,
    updateVectorStore,
    deleteVectorStore
} from '@/services/vectorStoreService';
import CreateVectorStoreModal from '@/components/admin/CreateVectorStoreModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import VectorStoreCard from '@/components/admin/VectorStoreCard';
import TutorialModal from '@/components/admin/TutorialModal';

function VectorStoresPage() {
    const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<VectorStore | null>(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        loadVectorStores();
    }, []);

    const loadVectorStores = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listVectorStores();
            setVectorStores(data);
        } catch (error) {
            console.error('Erro ao carregar vector stores:', error);
            setError('Falha ao carregar os dados. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefaultVectorStore = async (vectorStore: VectorStore) => {
        try {
            console.log('[PAGE] Definindo vector store padrão:', vectorStore.vector_store_id);

            const updatedVectorStore = await updateVectorStore(vectorStore.vector_store_id, {
                ...vectorStore,
                is_default: true
            });

            console.log('[PAGE] Vector store definida como padrão:', updatedVectorStore);

            // Update all vector stores to reflect the new default
            setVectorStores(prev =>
                prev.map(vs => ({
                    ...vs,
                    is_default: vs.vector_store_id === updatedVectorStore.vector_store_id
                }))
            );

        } catch (error) {
            console.error('[PAGE] Erro ao definir vector store padrão:', error);
            throw error;
        }
    };

    const handleCreateVectorStore = async (data: CreateVectorStoreRequest) => {
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        try {
            const newVectorStore = await createVectorStore(data, user.id);
            setVectorStores(prev => [newVectorStore, ...prev]);
        } catch (error) {
            console.error('Erro ao criar vector store:', error);
            throw error;
        }
    };

    const handleToggleStatus = async (vectorStore: VectorStore, newStatus: boolean) => {
        try {
            console.log('[PAGE] Alterando status da vector store:', vectorStore.vector_store_id);
            console.log('[PAGE] Novo status:', newStatus);

            const updatedVectorStore = await updateVectorStore(vectorStore.vector_store_id, {
                ...vectorStore,
                is_searchable: newStatus
            });

            console.log('[PAGE] Vector store atualizada:', updatedVectorStore);

            setVectorStores(prev =>
                prev.map(vs =>
                    vs.vector_store_id === updatedVectorStore.vector_store_id
                        ? updatedVectorStore
                        : vs
                )
            );

            // Não retorna nada explicitamente (retorna void)
        } catch (error) {
            console.error('[PAGE] Erro ao atualizar status:', error);
            throw error;
        }
    };

    const handleDeleteVectorStore = async () => {
        if (!deleteTarget) return;

        try {
            await deleteVectorStore(deleteTarget.vector_store_id);

            // Remover da lista local após exclusão bem-sucedida
            setVectorStores(prev =>
                prev.filter(vs => vs.vector_store_id !== deleteTarget.vector_store_id)
            );

            // Resetar o alvo de exclusão
            setDeleteTarget(null);
        } catch (error) {
            console.error('Erro ao excluir vector store:', error);
            throw error;
        }
    };

    const handleBack = () => {
        router.back();
    };

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
                        Gerenciar Vector Stores
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
                            borderRadius: '8px',
                            padding: '10px 16px',
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

                    {/* Botão Nova Vector Store */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
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
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nova Vector Store
                    </button>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '24px'
            }}>
                {error && (
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
                            onClick={loadVectorStores}
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
                )}

                {loading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
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
                                Carregando vector stores...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {vectorStores.length === 0 ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '60px 20px',
                                backgroundColor: 'var(--background-elevated)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-sm)',
                                border: '1px solid var(--border-color)',
                                minHeight: '300px'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--background-subtle)',
                                    borderRadius: '50%',
                                    marginBottom: '24px'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                                <h2 style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    marginBottom: '8px'
                                }}>
                                    Nenhuma Vector Store encontrada
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    maxWidth: '400px',
                                    marginBottom: '24px'
                                }}>
                                    Crie uma nova Vector Store para adicionar documentos e permitir consultas contextuais no chat.
                                </p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsTutorialOpen(true)}
                                        style={{
                                            backgroundColor: 'var(--background-subtle)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '10px 20px',
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
                                        Ver tutorial
                                    </button>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        style={{
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 20px',
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
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Criar primeira Vector Store
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    marginBottom: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <h2 style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {vectorStores.length} Vector Store{vectorStores.length !== 1 ? 's' : ''}
                                    </h2>
                                    <button
                                        onClick={loadVectorStores}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M23 4v6h-6"></path>
                                            <path d="M1 20v-6h6"></path>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                        </svg>
                                        Atualizar
                                    </button>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '20px'
                                }}>
                                    {vectorStores.map(vectorStore => (
                                        <VectorStoreCard
                                            key={vectorStore.vector_store_id}
                                            vectorStore={vectorStore}
                                            onDelete={setDeleteTarget}
                                            onToggleStatus={handleToggleStatus}
                                            onSetDefault={handleSetDefaultVectorStore}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modais */}
            <CreateVectorStoreModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateVectorStore}
            />

            <DeleteConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteVectorStore}
                itemName={deleteTarget?.name || ''}
                itemType="Vector Store"
            />

            {/* Modal Tutorial */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />
        </div>
    );
}

// Exportar com o wrapper de administrador
export default withAdminAccess(VectorStoresPage);