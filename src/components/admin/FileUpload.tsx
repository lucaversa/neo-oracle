// src/components/admin/FileUpload.tsx
'use client'

import { useState, useRef } from 'react';
import { uploadFileToVectorStore } from '@/services/vectorStoreService';

interface FileUploadProps {
    vectorStoreId: string;
    onUploadSuccess: () => void;
}

export default function FileUpload({ vectorStoreId, onUploadSuccess }: FileUploadProps) {
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manipuladores de eventos de arrastar e soltar
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    // Manipulador de seleção de arquivo via input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    // Abrir caixa de diálogo de arquivo ao clicar
    const onButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Processar arquivos selecionados
    const handleFiles = (files: FileList) => {
        const validFiles: File[] = [];
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/json',
            'text/csv'
        ];

        setError(null);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Verificar tipo de arquivo
            if (!allowedTypes.includes(file.type)) {
                setError(`O arquivo "${file.name}" não é suportado. São aceitos apenas PDF, TXT, DOC, DOCX, JSON ou CSV.`);
                continue;
            }

            // Verificar tamanho (limite de 25MB)
            if (file.size > 25 * 1024 * 1024) {
                setError(`O arquivo "${file.name}" excede o limite de 25MB.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            setSelectedFiles(validFiles);
        }
    };

    // Remover arquivo da lista de selecionados
    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);
    };

    // Limpar seleção de arquivos
    const clearFiles = () => {
        setSelectedFiles([]);
        setError(null);
    };

    // Iniciar upload de arquivos
    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !vectorStoreId) return;

        setUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            // Upload sequencial dos arquivos
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];

                // Atualizar progresso
                const currentProgress = Math.round(((i + 0.5) / selectedFiles.length) * 100);
                setUploadProgress(currentProgress);

                try {
                    // Fazer upload do arquivo
                    await uploadFileToVectorStore(vectorStoreId, file);
                    console.log(`Arquivo ${file.name} enviado com sucesso`);
                } catch (err) {
                    // Continue tentando com os outros arquivos
                    console.error(`Erro ao enviar ${file.name}:`, err);
                    setError(`Erro ao enviar ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
                }
            }

            // Upload concluído
            setUploadProgress(100);

            // Resetar estado
            if (!error) {
                setSelectedFiles([]);
            }

            // Chamar callback de sucesso
            onUploadSuccess();

            // Delay antes de esconder progresso
            setTimeout(() => {
                setUploadProgress(0);
            }, 1500);
        } catch (error) {
            console.error('Erro ao fazer upload de arquivos:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload.');
        } finally {
            setUploading(false);
        }
    };

    // Obter ícone baseado no tipo de arquivo
    const getFileIcon = (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

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

    return (
        <div style={{
            marginBottom: '24px'
        }}>
            {/* Área de arrastar e soltar */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                style={{
                    display: selectedFiles.length > 0 ? 'none' : 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    backgroundColor: dragActive ? 'var(--background-subtle)' : 'var(--background-elevated)',
                    borderRadius: '8px',
                    border: dragActive
                        ? '2px dashed var(--primary-color)'
                        : '2px dashed var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                    <path d="M12 12v9"></path>
                    <path d="m16 16-4-4-4 4"></path>
                </svg>
                <p style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                }}>
                    Arraste e solte arquivos aqui
                </p>
                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    marginBottom: '16px'
                }}>
                    ou clique para selecionar arquivos
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleChange}
                    accept=".pdf,.txt,.doc,.docx,.json,.csv"
                    multiple
                    style={{ display: 'none' }}
                />
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '12px',
                    marginTop: '8px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '4px',
                        color: '#ef4444',
                        fontSize: '13px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        PDF
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        borderRadius: '4px',
                        color: '#6b7280',
                        fontSize: '13px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        TXT
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderRadius: '4px',
                        color: '#2563eb',
                        fontSize: '13px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        DOC/DOCX
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1565c0'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        JSON
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#e8f5e8',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#2e7d32'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        CSV → JSON
                    </div>
                </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '4px solid var(--error-color)',
                    borderRadius: '4px',
                    color: 'var(--error-color)',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Lista de arquivos selecionados */}
            {selectedFiles.length > 0 && (
                <div style={{
                    backgroundColor: 'var(--background-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '16px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary)'
                        }}>
                            Arquivos Selecionados ({selectedFiles.length})
                        </h3>
                        <button
                            onClick={clearFiles}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: 'var(--background-subtle)',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5"></path>
                                <path d="M12 19l-7-7 7-7"></path>
                            </svg>
                            Voltar
                        </button>
                    </div>

                    <ul style={{
                        listStyle: 'none',
                        padding: '0',
                        margin: '0'
                    }}>
                        {selectedFiles.map((file, index) => (
                            <li key={index} style={{
                                padding: '12px 16px',
                                borderBottom: index < selectedFiles.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    {getFileIcon(file)}
                                    <div>
                                        <p style={{
                                            fontSize: '14px',
                                            color: 'var(--text-primary)',
                                            marginBottom: '4px',
                                            wordBreak: 'break-word'
                                        }}>
                                            {file.name}
                                        </p>
                                        <p style={{
                                            fontSize: '12px',
                                            color: 'var(--text-tertiary)'
                                        }}>
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: 'var(--text-tertiary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        borderTop: '1px solid var(--border-color)'
                    }}>
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                opacity: uploading ? 0.7 : 1
                            }}
                        >
                            {uploading ? (
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
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Enviar Arquivos
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Barra de progresso */}
            {uploadProgress > 0 && (
                <div style={{
                    marginBottom: '16px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)'
                        }}>
                            {uploadProgress < 100 ? 'Enviando arquivos...' : 'Upload concluído!'}
                        </span>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-primary)'
                        }}>
                            {uploadProgress}%
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--background-subtle)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${uploadProgress}%`,
                            height: '100%',
                            backgroundColor: uploadProgress < 100 ? 'var(--primary-color)' : 'var(--success-color)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                        }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}