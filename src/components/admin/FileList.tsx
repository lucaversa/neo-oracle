// src/components/admin/FileList.tsx
import { useState, useEffect } from 'react';
import { VectorStoreFile } from '@/types/admin';
import { listVectorStoreFiles, deleteFileFromVectorStore, getFileDetails } from '@/services/vectorStoreService';

interface FileListProps {
    vectorStoreId: string;
    onRefresh?: () => void;
}

export default function FileList({ vectorStoreId, onRefresh }: FileListProps) {
    const [files, setFiles] = useState<VectorStoreFile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<VectorStoreFile | null>(null);
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Paginação
    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const ITEMS_PER_PAGE = 10;

    // Cache de nomes de arquivos
    const [fileNames, setFileNames] = useState<Record<string, string>>({});
    const [loadingFileNames, setLoadingFileNames] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (vectorStoreId) {
            loadFiles(1);
        }
    }, [vectorStoreId]);

    const loadFiles = async (pageNum: number = 1) => {
        try {
            setIsLoadingMore(pageNum > 1);
            if (pageNum === 1) {
                setLoading(true);
                setFiles([]);  // Limpar arquivos ao iniciar nova busca
            }
            setError(null);

            // Parâmetros de paginação usando o cursor
            const params = new URLSearchParams();
            params.append('limit', ITEMS_PER_PAGE.toString());

            if (pageNum > 1 && nextCursor) {
                params.append('after', nextCursor);
            }

            const url = `/api/admin/vector-stores/${vectorStoreId}/files?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch files: ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('API response for files:', responseData);

            const newFiles = responseData.data || [];

            // Armazenar o cursor para a próxima página, se existir
            setNextCursor(responseData.last_id || null);
            setHasMore(responseData.has_more === true);

            if (pageNum === 1) {
                setFiles(newFiles);
            } else {
                // Anexar novos arquivos sem duplicatas
                setFiles(prevFiles => {
                    const combined = [...prevFiles];
                    newFiles.forEach((file: any) => {
                        if (!combined.some(f => f.id === file.id)) {
                            combined.push(file);
                        }
                    });
                    return combined;
                });
            }

            setPage(pageNum);

            // Iniciar carregamento de detalhes para cada arquivo
            newFiles.forEach((file: any) => {
                if (!fileNames[file.id]) {
                    loadFileDetails(file.id);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar arquivos:', error);
            setError('Falha ao carregar os arquivos. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    // Função para carregar detalhes do arquivo
    const loadFileDetails = async (fileId: string) => {
        if (loadingFileNames[fileId] || fileNames[fileId]) return;

        try {
            setLoadingFileNames(prev => ({ ...prev, [fileId]: true }));
            const details = await getFileDetails(fileId);

            if (details && details.filename) {
                setFileNames(prev => ({ ...prev, [fileId]: details.filename }));
            }
        } catch (error) {
            console.error(`Erro ao carregar detalhes do arquivo ${fileId}:`, error);
        } finally {
            setLoadingFileNames(prev => ({ ...prev, [fileId]: false }));
        }
    };

    const loadMore = () => {
        if (hasMore && !isLoadingMore && nextCursor) {
            loadFiles(page + 1);
        }
    };

    const handleConfirmDelete = (fileId: string) => {
        setConfirmDelete(fileId);
    };

    const handleCancelDelete = () => {
        setConfirmDelete(null);
    };

    const handleDeleteFile = async (fileId: string) => {
        try {
            setDeletingFile(fileId);
            setError(null);

            await deleteFileFromVectorStore(vectorStoreId, fileId);
            setFiles(prev => prev.filter(file => file.id !== fileId));
            setConfirmDelete(null);

            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Erro ao excluir arquivo:', error);
            setError('Falha ao excluir o arquivo. Tente novamente mais tarde.');
        } finally {
            setDeletingFile(null);
        }
    };

    const handleViewDetails = async (file: VectorStoreFile) => {
        try {
            setSelectedFile(file);
            setShowDetails(true);

            // Obter detalhes adicionais do arquivo
            const details = await getFileDetails(file.id);
            setFileDetails(details);
        } catch (error) {
            console.error('Erro ao obter detalhes do arquivo:', error);
        }
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Obter o tipo do arquivo com base no nome
    const getFileType = (fileId: string): string => {
        const fileName = fileNames[fileId] || '';

        if (fileName.includes('.')) {
            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            return extension.toUpperCase();
        }

        return 'N/A';
    };

    // Obter ícone baseado no tipo do arquivo
    const getFileIcon = (fileId: string) => {
        const fileType = getFileType(fileId).toLowerCase();

        switch (fileType) {
            case 'pdf':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M9 15h6"></path>
                        <path d="M9 18h6"></path>
                        <path d="M9 12h2"></path>
                    </svg>
                );
            case 'txt':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280' }}>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="8" y1="13" x2="16" y2="13"></line>
                        <line x1="8" y1="17" x2="16" y2="17"></line>
                        <line x1="8" y1="9" x2="12" y2="9"></line>
                    </svg>
                );
            case 'doc':
            case 'docx':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M8 13h8"></path>
                        <path d="M8 17h8"></path>
                        <path d="M8 9h2"></path>
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280' }}>
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                );
        }
    };

    // Modal de detalhes do arquivo
    const FileDetailsModal = () => {
        if (!selectedFile) return null;

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
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    padding: '24px',
                    position: 'relative',
                    animation: 'modalFadeIn 0.3s ease-out'
                }}>
                    <button
                        onClick={() => setShowDetails(false)}
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
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--background-subtle)',
                            borderRadius: '8px'
                        }}>
                            {getFileIcon(selectedFile.id)}
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '4px'
                            }}>
                                {fileNames[selectedFile.id] || `Arquivo ${selectedFile.id.substring(0, 8)}`}
                            </h2>
                            <p style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)'
                            }}>
                                ID: {selectedFile.id}
                            </p>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'var(--background-subtle)',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '12px'
                        }}>
                            Informações do Arquivo
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr',
                            gap: '8px 16px',
                            fontSize: '14px'
                        }}>
                            <div style={{ color: 'var(--text-tertiary)' }}>Tipo:</div>
                            <div style={{ color: 'var(--text-primary)' }}>{getFileType(selectedFile.id)}</div>

                            <div style={{ color: 'var(--text-tertiary)' }}>Criado em:</div>
                            <div style={{ color: 'var(--text-primary)' }}>{formatDate(selectedFile.created_at)}</div>

                            <div style={{ color: 'var(--text-tertiary)' }}>Status:</div>
                            <div style={{ color: 'var(--text-primary)' }}>{selectedFile.status || 'Processado'}</div>

                            <div style={{ color: 'var(--text-tertiary)' }}>Propósito:</div>
                            <div style={{ color: 'var(--text-primary)' }}>{selectedFile.purpose || 'assistants'}</div>
                        </div>
                    </div>

                    {fileDetails && (
                        <div style={{
                            backgroundColor: 'var(--background-subtle)',
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                marginBottom: '12px'
                            }}>
                                Detalhes Adicionais
                            </h3>
                            <pre style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                overflow: 'auto',
                                maxHeight: '300px',
                                backgroundColor: 'var(--background-main)',
                                padding: '12px',
                                borderRadius: '6px'
                            }}>
                                {JSON.stringify(fileDetails, null, 2)}
                            </pre>
                        </div>
                    )}

                    <div style={{
                        marginTop: '24px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        <button
                            onClick={() => handleConfirmDelete(selectedFile.id)}
                            style={{
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--error-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Excluir Arquivo
                        </button>
                        <button
                            onClick={() => setShowDetails(false)}
                            style={{
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--background-main)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && files.length === 0) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                color: 'var(--text-secondary)'
            }}>
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-color)',
                    borderTopColor: 'var(--primary-color)',
                    animation: 'spin 1s linear infinite',
                    marginRight: '12px'
                }}></div>
                <span>Carregando arquivos...</span>
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
                color: 'var(--error-color)',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                </div>
                <button
                    onClick={() => loadFiles(1)}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'var(--error-color)',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                color: 'var(--text-secondary)'
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}>
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Nenhum arquivo encontrado
                </h3>
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                    Esta vector store não possui arquivos. Adicione arquivos para melhorar a pesquisa contextual.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'var(--background-elevated)',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)'
        }}>
            <div style={{
                overflowX: 'auto'
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: 'var(--background-subtle)',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Arquivo
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Tipo
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Data de Upload
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'right',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr
                                key={file.id}
                                style={{
                                    borderBottom: '1px solid var(--border-subtle)'
                                }}
                            >
                                <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    color: 'var(--text-primary)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        {getFileIcon(file.id)}
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            {loadingFileNames[file.id] ? (
                                                <div style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid',
                                                    borderColor: 'var(--border-color)',
                                                    borderTopColor: 'var(--primary-color)',
                                                    animation: 'spin 1s linear infinite'
                                                }}></div>
                                            ) : null}
                                            <span style={{ wordBreak: 'break-word' }}>
                                                {fileNames[file.id] || file.id}
                                            </span>
                                        </span>
                                    </div>
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        {getFileType(file.id)}
                                    </span>
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {formatDate(file.created_at)}
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    textAlign: 'right'
                                }}>
                                    {confirmDelete === file.id ? (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: '8px'
                                        }}>
                                            <button
                                                onClick={handleCancelDelete}
                                                style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: 'var(--background-subtle)',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFile(file.id)}
                                                disabled={deletingFile === file.id}
                                                style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: 'var(--error-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    cursor: deletingFile === file.id ? 'not-allowed' : 'pointer',
                                                    opacity: deletingFile === file.id ? 0.7 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {deletingFile === file.id ? (
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
                                                        Excluindo...
                                                    </>
                                                ) : (
                                                    'Confirmar'
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: '8px'
                                        }}>
                                            <button
                                                onClick={() => handleViewDetails(file)}
                                                style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: 'var(--background-subtle)',
                                                    color: 'var(--info-color)',
                                                    border: '1px solid var(--info-color)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                                Detalhes
                                            </button>
                                            <button
                                                onClick={() => handleConfirmDelete(file.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: 'transparent',
                                                    color: 'var(--error-color)',
                                                    border: '1px solid var(--error-color)',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Botão "Carregar Mais" */}
            {hasMore && (
                <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderTop: '1px solid var(--border-subtle)'
                }}>
                    <button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--background-main)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isLoadingMore ? (
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
                                Carregando...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="7 13 12 18 17 13"></polyline>
                                    <polyline points="7 6 12 11 17 6"></polyline>
                                </svg>
                                Carregar Mais
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Modal de detalhes do arquivo */}
            {showDetails && <FileDetailsModal />}
        </div>
    );
}