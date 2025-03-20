'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VectorStore } from '@/types/admin';
import { getSearchableVectorStores } from '@/services/vectorStoreService';

interface VectorStoreSelectorProps {
    selectedId: string | null;
    onSelect: (vectorStoreId: string) => void;
    disabled?: boolean;
}

export default function VectorStoreSelector({
    selectedId,
    onSelect,
    disabled = false,
}: VectorStoreSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStore, setSelectedStore] = useState<VectorStore | null>(null);
    const [isBrowser, setIsBrowser] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Necessário para o Portal funcionar corretamente no SSR
    useEffect(() => {
        setIsBrowser(true);
    }, []);

    useEffect(() => {
        // Find the selected vector store when selectedId changes
        if (selectedId) {
            const store = vectorStores.find(vs => vs.vector_store_id === selectedId);
            if (store) {
                setSelectedStore(store);
            }
        }
    }, [selectedId, vectorStores]);

    const loadVectorStores = async () => {
        if (loading) return;

        try {
            setLoading(true);
            setError(null);
            const stores = await getSearchableVectorStores();
            setVectorStores(stores);

            // If there's a selected ID, find it in the fetched stores
            if (selectedId) {
                const selected = stores.find(store => store.vector_store_id === selectedId);
                if (selected) {
                    setSelectedStore(selected);
                } else if (stores.length > 0) {
                    // If selected ID not found, use the first store (which should be the default)
                    setSelectedStore(stores[0]);
                    onSelect(stores[0].vector_store_id);
                }
            } else if (stores.length > 0) {
                // If no selectedId, use the first store (which should be the default)
                setSelectedStore(stores[0]);
                onSelect(stores[0].vector_store_id);
            }
        } catch (err) {
            console.error('Error loading vector stores:', err);
            setError('Falha ao carregar bases de conhecimento');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVectorStores();
    }, []);

    const handleOpen = () => {
        if (disabled) return;
        loadVectorStores(); // Refresh the list when opening
        setIsOpen(true);
        setSearchTerm(''); // Limpa a pesquisa ao abrir o modal

        // Impedir rolagem do corpo da página quando o modal estiver aberto
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm(''); // Limpa a pesquisa ao fechar o modal

        // Restaurar rolagem do corpo da página quando o modal for fechado
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'auto';
        }
    };

    const handleSelect = (store: VectorStore) => {
        setSelectedStore(store);
        onSelect(store.vector_store_id);
        handleClose();
    };

    // Filtra as vector stores com base no termo de pesquisa
    const filteredVectorStores = vectorStores.filter(store => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
            store.name.toLowerCase().includes(searchTermLower) ||
            (store.description && store.description.toLowerCase().includes(searchTermLower))
        );
    });

    // Componente do modal a ser renderizado no Portal
    const Modal = () => {
        return (
            <div
                id="vector-store-modal-overlay"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 99999,
                }}
                onClick={handleClose}
            >
                <div
                    style={{
                        backgroundColor: 'var(--background-elevated)',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        width: '90%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '28px',
                        position: 'relative',
                        animation: 'fadeIn 0.3s ease-out',
                        margin: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}
                    >
                        <h2 style={{
                            fontSize: '22px',
                            fontWeight: '600',
                            color: 'var(--text-primary)'
                        }}>
                            Selecionar Base de Conhecimento
                        </h2>
                        <button
                            onClick={handleClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Barra de pesquisa */}
                    <div style={{
                        marginBottom: '20px',
                        position: 'relative',
                    }}>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Pesquisar bases de conhecimento..."
                                style={{
                                    backgroundColor: 'var(--background-subtle)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '12px 16px 12px 44px',
                                    width: '100%',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--primary-color)';
                                    e.target.style.boxShadow = '0 0 0 2px rgba(8, 145, 178, 0.2)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-color)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        borderRadius: '50%',
                                    }}
                                    title="Limpar pesquisa"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: '12px 16px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderLeft: '4px solid var(--error-color)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                color: 'var(--error-color)',
                                fontSize: '14px'
                            }}
                        >
                            {error}
                            <button
                                onClick={loadVectorStores}
                                style={{
                                    marginTop: '8px',
                                    padding: '4px 10px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'var(--error-color)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'block'
                                }}
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '20px'
                            }}
                        >
                            <div
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    borderWidth: '3px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--border-color)',
                                    borderTopColor: 'var(--primary-color)',
                                    animation: 'spin 1s linear infinite'
                                }}
                            ></div>
                        </div>
                    ) : filteredVectorStores.length === 0 ? (
                        <div
                            style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            {searchTerm ? (
                                <>
                                    <p>Nenhuma base de conhecimento encontrada para &quot;{searchTerm}&quot;</p>
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            marginTop: '8px',
                                            padding: '6px 12px',
                                            backgroundColor: 'var(--background-subtle)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Limpar pesquisa
                                    </button>
                                </>
                            ) : (
                                <p>Nenhuma base de conhecimento disponível</p>
                            )}
                        </div>
                    ) : (
                        <ul
                            style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}
                        >
                            {filteredVectorStores.map((store) => (
                                <li key={store.vector_store_id}>
                                    <button
                                        onClick={() => handleSelect(store)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '16px',
                                            backgroundColor: selectedStore?.vector_store_id === store.vector_store_id
                                                ? 'var(--background-subtle)'
                                                : 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            marginBottom: '8px'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--background-subtle)';
                                        }}
                                        onMouseOut={(e) => {
                                            if (selectedStore?.vector_store_id !== store.vector_store_id) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '48px',
                                                height: '48px',
                                                backgroundColor: 'var(--primary-color)',
                                                borderRadius: '50%',
                                                color: 'white',
                                                marginRight: '16px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                            </svg>
                                        </div>
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '16px',
                                                    fontWeight: '500',
                                                    color: 'var(--text-primary)',
                                                    marginBottom: '4px'
                                                }}
                                            >
                                                {store.name}
                                                {store.is_default && (
                                                    <span
                                                        style={{
                                                            marginLeft: '8px',
                                                            padding: '2px 8px',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                            color: 'var(--success-color)',
                                                            borderRadius: '999px',
                                                            fontSize: '11px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Padrão
                                                    </span>
                                                )}
                                            </div>
                                            {store.description && (
                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {store.description}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Botão seletor */}
            <button
                onClick={handleOpen}
                disabled={disabled}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--background-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.7 : 1,
                    transition: 'all 0.2s'
                }}
                title="Selecionar base de conhecimento para pesquisa"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {loading ? (
                    <span>Carregando...</span>
                ) : selectedStore ? (
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedStore.name}
                    </span>
                ) : (
                    'Base de conhecimento'
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {/* Renderizar o modal no Portal apenas se isBrowser=true e isOpen=true */}
            {isBrowser && isOpen && createPortal(<Modal />, document.body)}
        </div>
    );
}