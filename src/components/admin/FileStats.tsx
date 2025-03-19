// src/components/admin/FileStats.tsx
'use client'

import { useState, useEffect } from 'react';
import { VectorStoreFile } from '@/types/admin';
import { listVectorStoreFiles } from '@/services/vectorStoreService';

interface FileStatsProps {
    vectorStoreId: string;
    refreshTrigger?: number;
}

export default function FileStats({ vectorStoreId, refreshTrigger = 0 }: FileStatsProps) {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalFiles: 0,
        totalProcessed: 0,
        totalProcessing: 0,
        totalError: 0,
        totalSize: 0,
        fileTypes: {} as Record<string, number>
    });

    useEffect(() => {
        if (vectorStoreId) {
            loadStats();
        }
    }, [vectorStoreId, refreshTrigger]);

    // src/components/admin/FileStats.tsx
    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            const files = await listVectorStoreFiles(vectorStoreId, 1, 100);
            console.log('Files for stats:', files);

            // Calcular estatísticas
            const newStats = {
                totalFiles: files.length,
                totalProcessed: 0,
                totalProcessing: 0,
                totalError: 0,
                totalSize: 0,
                fileTypes: {} as Record<string, number>
            };

            files.forEach(file => {
                // Contagem de status
                if (file.status === 'processed' || file.status === 'completed') {
                    newStats.totalProcessed++;
                } else if (file.status === 'processing') {
                    newStats.totalProcessing++;
                } else if (file.status === 'error') {
                    newStats.totalError++;
                } else {
                    // Padrão para completed
                    newStats.totalProcessed++;
                }

                // Tamanho total
                newStats.totalSize += file.bytes || 0;

                // Extração da extensão dos arquivos
                if (file.filename) {
                    let extension = '';
                    if (file.filename.includes('.')) {
                        extension = file.filename.split('.').pop()?.toLowerCase() || '';
                        if (extension) {
                            newStats.fileTypes[extension] = (newStats.fileTypes[extension] || 0) + 1;
                        }
                    }

                    if (!extension) {
                        // Se não tem extensão, usar primeira parte do ID como "tipo"
                        const typeId = file.id.substring(0, 3).toUpperCase();
                        newStats.fileTypes[typeId] = (newStats.fileTypes[typeId] || 0) + 1;
                    }
                } else if (file.id) {
                    // Se não tem filename, usar primeira parte do ID como "tipo"
                    const typeId = file.id.substring(0, 3).toUpperCase();
                    newStats.fileTypes[typeId] = (newStats.fileTypes[typeId] || 0) + 1;
                }
            });

            setStats(newStats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            setError('Falha ao carregar estatísticas dos arquivos');
        } finally {
            setLoading(false);
        }
    };

    // Função para formatar o tamanho do arquivo
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        else return (bytes / 1073741824).toFixed(1) + ' GB';
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                backgroundColor: 'var(--background-subtle)',
                borderRadius: '8px'
            }}>
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-color)',
                    borderTopColor: 'var(--primary-color)',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                }}></div>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Carregando estatísticas...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderLeft: '4px solid var(--error-color)',
                borderRadius: '8px',
                color: 'var(--error-color)',
                fontSize: '14px'
            }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
        }}>
            {/* Card de Total de Arquivos */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Total de Arquivos
                    </h3>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-color)'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                </div>
                <p style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {stats.totalFiles}
                </p>
            </div>

            {/* Card de Arquivos Processados */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Processados
                    </h3>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--success-color)'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                </div>
                <p style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {stats.totalProcessed}
                    <span style={{
                        fontSize: '14px',
                        color: 'var(--text-tertiary)',
                        marginLeft: '4px',
                        fontWeight: 'normal'
                    }}>
                        / {stats.totalFiles}
                    </span>
                </p>
            </div>

            {/* Card de Arquivos em Processamento */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Processando
                    </h3>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--info-color)'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                </div>
                <p style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {stats.totalProcessing}
                </p>
            </div>

            {/* Card de Espaço Utilizado */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Espaço Utilizado
                    </h3>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--warning-color)'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                </div>
                <p style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {formatFileSize(stats.totalSize)}
                </p>
            </div>

            {/* Seção de tipos de arquivo */}
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
                gridColumn: '1 / -1'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        margin: 0
                    }}>
                        Tipos de Arquivo
                    </h3>
                </div>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}>
                    {Object.entries(stats.fileTypes).length > 0 ? (
                        Object.entries(stats.fileTypes).map(([type, count]) => (
                            <div key={type} style={{
                                padding: '4px 10px',
                                backgroundColor: 'var(--background-subtle)',
                                borderRadius: '999px',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ textTransform: 'uppercase', fontWeight: '600' }}>{type}</span>
                                <span style={{
                                    backgroundColor: 'var(--background-main)',
                                    borderRadius: '999px',
                                    padding: '2px 6px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {count}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', fontStyle: 'italic' }}>
                            Nenhum arquivo encontrado
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}