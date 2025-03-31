import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/chat';
import { useTheme } from '@/context/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Importamos o tipo do XLSX sem o módulo real (será carregado dinamicamente)
import type * as XLSXType from 'xlsx';

interface ChatBubbleProps {
    message: ChatMessage;
    userName?: string;
    streamingContent?: string;
    isStreaming?: boolean;
}

export default function ChatBubble({
    message,
    userName = '',
    streamingContent,
    isStreaming = false,
}: ChatBubbleProps) {
    const isUser = message.type === 'human';
    const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
    const { isDarkMode } = useTheme();
    const [copied, setCopied] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [hasTable, setHasTable] = useState(false);
    const [tableExportHover, setTableExportHover] = useState(false);
    const [tableExported, setTableExported] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Definir displayContent antes de usar em qualquer useEffect
    const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

    // Ref para rastrear se a animação já foi executada
    const hasAnimatedRef = useRef(false);
    // Controlador de animação
    const [isAnimated, setIsAnimated] = useState(false);

    // Inicia a animação após um breve atraso para garantir renderização suave
    useEffect(() => {
        // Primeiro garante que a mensagem está visível
        setIsVisible(true);

        // Se já foi animado, mantenha o estado
        if (hasAnimatedRef.current) {
            setIsAnimated(true);
            return;
        }

        // Pequeno atraso antes de iniciar a animação
        const animationDelay = setTimeout(() => {
            setIsAnimated(true);
            hasAnimatedRef.current = true; // Marque que já foi animado
        }, 50);

        return () => clearTimeout(animationDelay);
    }, []);

    // Garantir que a bolha permanece visível durante o streaming
    useEffect(() => {
        if (isStreaming) {
            setIsVisible(true);
            // Se está em streaming e visível, garantir que a animação está ativa
            if (!isAnimated) {
                setIsAnimated(true);
                hasAnimatedRef.current = true;
            }
        }
    }, [isStreaming, isAnimated]);

    // Verificar se o conteúdo tem tabela após renderização
    useEffect(() => {
        if (contentRef.current && !isStreaming) {
            const tables = contentRef.current.querySelectorAll('table');
            setHasTable(tables.length > 0);
        }
    }, [displayContent, isStreaming]);

    // Função para copiar
    const copyToClipboard = () => {
        navigator.clipboard.writeText(displayContent)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
            });
    };

    // Função para exportar tabela(s) para XLSX
    const exportTableToXLSX = async () => {
        if (!contentRef.current) return;

        const tables = contentRef.current.querySelectorAll('table');
        if (tables.length === 0) return;

        try {
            // Importar XLSX dinamicamente para evitar erros de compilação
            const XLSX = await import('xlsx') as typeof XLSXType;

            // Criar um workbook
            const wb = XLSX.utils.book_new();

            // Para cada tabela, criar uma planilha
            tables.forEach((table, index) => {
                // Converter tabela HTML para array de dados
                const data: string[][] = [];

                // Obter cabeçalhos
                const headerRow: string[] = [];
                const headerCells = table.querySelectorAll('thead th');
                if (headerCells.length > 0) {
                    headerCells.forEach(cell => {
                        headerRow.push(cell.textContent || '');
                    });
                    data.push(headerRow);
                }

                // Obter dados do corpo da tabela
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const rowData: string[] = [];
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        rowData.push(cell.textContent || '');
                    });
                    data.push(rowData);
                });

                // Criar planilha para essa tabela
                const ws = XLSX.utils.aoa_to_sheet(data);

                // Adicionar planilha ao workbook
                const sheetName = `Tabela ${index + 1}`;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // Gerar blob e fazer o download
            XLSX.writeFile(wb, 'tabela_exportada.xlsx');

            // Feedback visual
            setTableExported(true);
            setTimeout(() => setTableExported(false), 2000);
        } catch (error) {
            console.error('Erro ao exportar tabela:', error);
        }
    };

    // Se o componente não estiver visível, não renderizar nada
    if (!isVisible) return null;

    // Estilo para o avatar com animação sutil de fade-in
    const avatarStyle = {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: 'var(--shadow-md)',
        flexShrink: 0,
        opacity: isAnimated ? 1 : 0,
        transform: `translateY(${isAnimated ? 0 : '6px'})`,
        transition: 'opacity 0.2s ease, transform 0.2s ease'
    } as React.CSSProperties;

    // Estilo para a bolha com fade-in e movimento leve para cima
    const bubbleStyle = {
        borderRadius: '18px',
        padding: '16px 20px',
        color: isUser ? 'white' : 'var(--text-primary)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative' as const,
        borderBottomLeftRadius: !isUser ? '4px' : undefined,
        borderBottomRightRadius: isUser ? '4px' : undefined,
        backgroundColor: isUser
            ? 'var(--primary-color)'
            : (isDarkMode ? 'var(--background-subtle)' : 'var(--background-subtle)'),
        opacity: isAnimated ? 1 : 0,
        transform: `translateY(${isAnimated ? 0 : '8px'})`,
        transition: 'opacity 0.3s ease, transform 0.3s ease'
    };

    // Estilo para o botão copiar
    const copyButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        padding: '6px 12px',
        background: 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        fontSize: '13px',
        color: isUser ? 'var(--primary-color)' : 'var(--text-secondary)',
        cursor: 'pointer',
        alignSelf: 'flex-start',
        boxShadow: isHovering ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        backgroundColor: isDarkMode ? 'var(--background-elevated)' : 'var(--background-main)',
        transform: isHovering ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isAnimated ? (isHovering ? 1 : 0.85) : 0,
        transition: 'all 0.2s ease',
        transitionDelay: isAnimated ? '0s' : '0.15s'
    } as React.CSSProperties;

    // Estilo para o botão de exportar tabela
    const exportTableButtonStyle = {
        ...copyButtonStyle,
        marginLeft: '8px',
        boxShadow: tableExportHover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: tableExportHover ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isAnimated ? (tableExportHover ? 1 : 0.85) : 0,
        backgroundColor: isDarkMode
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(16, 185, 129, 0.1)',
        color: 'var(--success-color)',
        border: '1px solid rgba(16, 185, 129, 0.3)'
    } as React.CSSProperties;

    // Container com animação mais sutil, sem "mola"
    const containerStyle = {
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '24px',
        gap: '12px',
        alignItems: 'flex-start',
        opacity: 1
    } as React.CSSProperties;

    // Estilo para o indicador de digitação moderno
    const typingIndicatorStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '0 5px'
    };

    // Estilo para cada bolha do indicador
    const bubbleIndicatorStyle = (index: number) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        opacity: 0.5,
        animation: `typingBubble 1.4s infinite ease-in-out both`,
        animationDelay: `${index * 0.16}s`
    });

    // Estilos para Markdown
    const markdownStyles = {
        // Estilos gerais para conteúdo markdown
        p: {
            margin: '0.3em 0',
            padding: 0,
            lineHeight: '1.8',
        },
        h1: {
            fontSize: '1.6em',
            marginTop: '0.8em',
            marginBottom: '0.3em',
            fontWeight: 'bold',
            lineHeight: '1.3',
        },
        h2: {
            fontSize: '1.4em',
            marginTop: '0.7em',
            marginBottom: '0.3em',
            fontWeight: 'bold',
            lineHeight: '1.3',
        },
        h3: {
            fontSize: '1.2em',
            marginTop: '0.5em',
            marginBottom: '0.2em',
            fontWeight: 'bold',
            lineHeight: '1.3',
        },
        ul: {
            paddingLeft: '1.2em',
            marginTop: '0.3em',
            marginBottom: '0.3em',
            listStyleType: 'disc',
            listStylePosition: 'outside',
        },
        ol: {
            paddingLeft: '1.2em',
            marginTop: '0.3em',
            marginBottom: '0.3em',
            listStylePosition: 'outside',
        },
        li: {
            margin: '0.1em 0',
            padding: 0,
            display: 'list-item',
            lineHeight: '1.8',
        },
        'li > p': {
            margin: 0,
            display: 'inline-block',
        },
        a: {
            color: isUser ? 'white' : 'var(--primary-color)',
            textDecoration: 'underline',
        },
        em: {
            fontStyle: 'italic',
        },
        strong: {
            fontWeight: 'bold',
        },
        blockquote: {
            borderLeft: '4px solid var(--border-color)',
            paddingLeft: '0.8em',
            margin: '0.5em 0',
            fontStyle: 'italic',
        },
        hr: {
            border: 'none',
            borderTop: '1px solid var(--border-color)',
            margin: '0.8em 0',
        },
        // Estilos melhorados para tabelas
        table: {
            borderCollapse: 'collapse' as const,
            width: '100%',
            margin: '1em 0',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            fontSize: '14px',
        },
        th: {
            border: '1px solid var(--border-color)',
            padding: '10px 12px',
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            textAlign: 'left' as const,
            fontWeight: 'bold',
            whiteSpace: 'nowrap' as const,
        },
        td: {
            border: '1px solid var(--border-color)',
            padding: '8px 12px',
            textAlign: 'left' as const,
            verticalAlign: 'top' as const,
            lineHeight: '1.5',
        },
        // Estilos para linhas alternadas
        tr: {
            backgroundColor: isDarkMode ? 'transparent' : 'transparent',
            borderBottom: '1px solid var(--border-color)',
        },
    } as const;

    return (
        <div style={containerStyle}>
            {/* Avatar - aparece à esquerda para mensagens do AI */}
            {!isUser && (
                <div style={avatarStyle}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Olho principal */}
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>

                        {/* Raios ao redor do olho */}
                        <line x1="12" y1="5" x2="12" y2="3"></line>
                        <line x1="17" y1="7" x2="19" y2="5"></line>
                        <line x1="19" y1="12" x2="21" y2="12"></line>
                        <line x1="17" y1="17" x2="19" y2="19"></line>
                        <line x1="12" y1="19" x2="12" y2="21"></line>
                        <line x1="7" y1="17" x2="5" y2="19"></line>
                        <line x1="5" y1="12" x2="3" y2="12"></line>
                        <line x1="7" y1="7" x2="5" y2="5"></line>
                    </svg>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '80%'
            }}>
                {/* Bolha de mensagem */}
                <div style={bubbleStyle}>
                    <div
                        ref={contentRef}
                        style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '15px',
                            lineHeight: '1.5',
                            width: '100%',  // Garantir que ocupa toda a largura disponível
                            overflowX: 'auto' // Permitir rolagem horizontal para tabelas grandes
                        }}
                    >
                        {/* Se está em streaming e não há conteúdo ainda, mostrar o indicador de digitação */}
                        {isStreaming && !displayContent ? (
                            <div style={typingIndicatorStyle}>
                                <div style={bubbleIndicatorStyle(0)}></div>
                                <div style={bubbleIndicatorStyle(1)}></div>
                                <div style={bubbleIndicatorStyle(2)}></div>
                            </div>
                        ) : (
                            <>
                                {/* Renderiza o conteúdo como Markdown com suporte a GFM (GitHub Flavored Markdown) */}
                                <div className="markdown-content react-markdown" style={{
                                    lineHeight: '1.8',
                                    fontSize: '15px',
                                    width: '100%'
                                }}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]} // Adicionando suporte a GitHub Flavored Markdown
                                        components={{
                                            p: (props) => <p style={markdownStyles.p} {...props} />,
                                            h1: (props) => <h1 style={markdownStyles.h1} {...props} />,
                                            h2: (props) => <h2 style={markdownStyles.h2} {...props} />,
                                            h3: (props) => <h3 style={markdownStyles.h3} {...props} />,
                                            ul: (props) => <ul style={markdownStyles.ul} {...props} />,
                                            ol: (props) => <ol style={markdownStyles.ol} {...props} />,
                                            li: (props) => <li style={markdownStyles.li} {...props} />,
                                            a: (props) => <a style={markdownStyles.a} {...props} />,
                                            em: (props) => <em style={markdownStyles.em} {...props} />,
                                            strong: (props) => <strong style={markdownStyles.strong} {...props} />,
                                            blockquote: (props) => <blockquote style={markdownStyles.blockquote} {...props} />,
                                            hr: (props) => <hr style={markdownStyles.hr} {...props} />,
                                            // Componentes melhorados para tabelas
                                            table: (props) => <div style={{ overflowX: 'auto', width: '100%' }}><table style={markdownStyles.table} {...props} /></div>,
                                            thead: (props) => <thead {...props} />,
                                            tbody: (props) => <tbody {...props} />,
                                            tr: (props) => <tr style={markdownStyles.tr} {...props} />,
                                            th: (props) => <th style={markdownStyles.th} {...props} />,
                                            td: (props) => <td style={markdownStyles.td} {...props} />,
                                        }}
                                    >
                                        {displayContent}
                                    </ReactMarkdown>
                                </div>
                                {isStreaming && !isUser && displayContent && (
                                    <span className="typing-cursor" style={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '16px',
                                        backgroundColor: 'currentColor',
                                        marginLeft: '4px',
                                        verticalAlign: 'middle',
                                        animation: 'blinkCursor 0.8s step-start infinite'
                                    }}></span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Botões de ação */}
                {displayContent && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: '6px',
                        gap: '8px'
                    }}>
                        {/* Botão de copiar */}
                        <button
                            onClick={copyToClipboard}
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            style={copyButtonStyle}
                            className="copy-button"
                        >
                            {copied ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    animation: 'fadeIn 0.3s ease-out'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Copiado!
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Copiar
                                </div>
                            )}
                        </button>

                        {/* Botão de exportar tabela - mostrado apenas se tiver tabela */}
                        {hasTable && !isUser && (
                            <button
                                onClick={exportTableToXLSX}
                                onMouseEnter={() => setTableExportHover(true)}
                                onMouseLeave={() => setTableExportHover(false)}
                                style={exportTableButtonStyle}
                                className="export-table-button"
                                title="Exportar tabela para Excel"
                            >
                                {tableExported ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        animation: 'fadeIn 0.3s ease-out'
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Exportado!
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        Exportar Excel
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Avatar do usuário */}
            {isUser && (
                <div style={avatarStyle}>
                    {initial}
                </div>
            )}
        </div>
    );
}

// Adiciona os keyframes para o cursor e animações das bolhas
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blinkCursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes typingBubble {
            0%, 80%, 100% { 
                transform: scale(0.6);
                opacity: 0.5;
            }
            40% { 
                transform: scale(1);
                opacity: 1;
            }
        }
        
        /* Estilos adicionais para elementos markdown */
        .markdown-content img {
            max-width: 100%;
            border-radius: 6px;
            margin: 0.5em 0;
        }
        
        .markdown-content ul,
        .markdown-content ol {
            margin-block-start: 0.3em;
            margin-block-end: 0.3em;
            padding-inline-start: 1.2em;
        }
        
        .markdown-content li {
            display: list-item;
            margin-bottom: 0.2em;
        }
        
        .markdown-content li p {
            margin: 0;
            display: inline;
        }
        
        .react-markdown {
            white-space: normal;
        }
        
        /* Estilos melhorados para tabelas */
        .markdown-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            border: 1px solid var(--border-color);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            font-size: 14px;
            table-layout: auto;
        }
        
        .markdown-content thead {
            background-color: var(--background-subtle);
        }
        
        .markdown-content th {
            background-color: var(--background-subtle);
            font-weight: 600;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            text-align: left;
            white-space: nowrap;
        }
        
        .markdown-content td {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            vertical-align: top;
            line-height: 1.5;
        }
        
        /* Linhas alternadas usando CSS puro */
        .markdown-content tbody tr:nth-child(odd) {
            background-color: rgba(0, 0, 0, 0.03);
        }
        
        .markdown-content tbody tr:nth-child(even) {
            background-color: rgba(0, 0, 0, 0.01);
        }
        
        /* Versão dark mode para linhas alternadas */
        @media (prefers-color-scheme: dark) {
            .markdown-content tbody tr:nth-child(odd) {
                background-color: rgba(255, 255, 255, 0.05);
            }
            
            .markdown-content tbody tr:nth-child(even) {
                background-color: rgba(0, 0, 0, 0.15);
            }
        }
        
        .markdown-content tr:hover {
            background-color: var(--background-hover);
        }
        
        /* Permitir rolagem horizontal em contêineres de tabela */
        .markdown-content table {
            display: block;
            overflow-x: auto;
            max-width: 100%;
        }
        
        /* Estilo para o botão de exportar tabela */
        .export-table-button:hover {
            background-color: rgba(16, 185, 129, 0.2) !important;
        }
    `;
    document.head.appendChild(style);
}