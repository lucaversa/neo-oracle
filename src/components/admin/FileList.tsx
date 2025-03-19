// src/components/admin/FileList.tsx
'use client'

import { useState, useEffect } from 'react';
import { VectorStoreFile } from '@/types/admin';
import { listVectorStoreFiles, deleteFileFromVectorStore } from '@/services/vectorStoreService';

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

    useEffect(() => {
        if (vectorStoreId) {
            loadFiles();
        }
    }, [vectorStoreId]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listVectorStoreFiles(vectorStoreId);
            setFiles(data);
        } catch (error) {
            console.error('Erro ao carregar arquivos:', error);
            setError('Falha ao carregar os arquivos. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
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

            // Remover arquivo da vector store
            await deleteFileFromVectorStore(vectorStoreId, fileId);

            // Atualizar lista de arquivos
            setFiles(prev => prev.filter(file => file.id !== fileId));

            // Resetar estado
            setConfirmDelete(null);

            // Chamar callback de atualização se fornecido
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

    // Função para formatar o tamanho do arquivo
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        else return (bytes / 1073741824).toFixed(1) + ' GB';
    };

    // Função para formatar a data
    const formatDate = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Função para determinar o ícone do arquivo
    const getFileIcon = (filename?: string) => {
        if (!filename) {
            // Ícone padrão se não houver filename
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280' }}>
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
            );
        }

        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
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

    // Função para exibir status do processamento do arquivo
    const getStatusBadge = (status: string) => {
        let bgColor, textColor, statusText;

        switch (status) {
            case 'processed':
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                statusText = 'Processado';
                break;
            case 'processing':
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                statusText = 'Processando';
                break;
            case 'error':
                bgColor = 'bg-red-100';
                textColor = 'text-red-800';
                statusText = 'Erro';
                break;
            default:
                bgColor = 'bg-gray-100';
                textColor = 'text-gray-800';
                statusText = status;
        }

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                {statusText}
            </span>
        );
    };

    if (loading) {
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
                    onClick={loadFiles}
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
                                Tamanho
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-primary)'
                            }}>
                                Status
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
                                        {getFileIcon(file.filename)}
                                        <span style={{
                                            wordBreak: 'break-word'
                                        }}>
                                            {file.filename || `Arquivo ${file.id.substring(0, 8)}`}
                                        </span>
                                    </div>
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {formatFileSize(file.bytes || 0)}
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    fontSize: '14px'
                                }}>
                                    {getStatusBadge(file.status)}
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
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}