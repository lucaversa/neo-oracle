import React from 'react';
import { useTheme } from '@/context/ThemeContext';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isDarkMode } = useTheme();

    if (!isOpen) return null;

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
            padding: '20px',
            backdropFilter: 'blur(2px)',
        }}>
            <div style={{
                backgroundColor: isDarkMode ? 'var(--background-elevated)' : 'white',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-color)',
                animation: 'fadeIn 0.3s ease-out',
            }}>
                {/* Cabeçalho do modal */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary-color)'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '600',
                            color: 'var(--text-primary)'
                        }}>
                            Tutorial: Vector Stores e Arquivos
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            padding: '8px',
                            borderRadius: '50%',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--background-subtle)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Conteúdo do tutorial com scroll */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    lineHeight: '1.6',
                }}>
                    <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        marginTop: 0,
                        marginBottom: '16px',
                        color: 'var(--primary-color)'
                    }}>
                        Cadastro e Gerenciamento de Vector Stores e Arquivos
                    </h3>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>O que é uma Vector Store?</h4>
                        <p>
                            Uma <strong>vector store</strong> funciona como uma pasta destinada ao armazenamento de arquivos.
                            É possível criar quantas forem necessárias, porém, recomendamos organizá-las de forma segmentada por tipo de conteúdo, como:
                        </p>
                        <ul style={{ paddingLeft: '24px', marginTop: '12px' }}>
                            <li>Procedimentos operacionais</li>
                            <li>Tabelas de preços</li>
                            <li>Documentos gerais da empresa</li>
                            <li>Contratos, entre outros.</li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Cadastro de Vector Stores</h4>
                        <p>
                            Para cadastrar uma <strong>vector store</strong>, é <strong>imprescindível</strong> fornecer um título
                            e uma descrição detalhada e coerente. A descrição deve especificar com precisão o tipo de conteúdo
                            armazenado naquela pasta.
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Funcionalidades Disponíveis</h4>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li style={{ marginBottom: '8px' }}>
                                <strong>Ativar/Desativar Pesquisa</strong>: Quando desativada, essa <em>vector store</em> será
                                ignorada pelo oráculo durante as buscas e não poderá ser selecionada pelo usuário.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <strong>Definir como Padrão</strong>: Essa <em>vector store</em> será exibida como a principal
                                no seletor de bases de dados dentro do chat.
                            </li>
                        </ul>
                        <p style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '12px 16px',
                            borderRadius: '6px',
                            borderLeft: '4px solid var(--error-color)',
                            marginTop: '16px'
                        }}>
                            <strong>Atenção:</strong> Ao excluir uma <em>vector store</em>, <strong>todos os arquivos contidos nela serão permanentemente apagados</strong>.
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Gerenciamento de Vector Stores e Arquivos</h4>
                        <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Requisitos para Adição de Arquivos</h5>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li style={{ marginBottom: '8px' }}>
                                <strong>Tabelas:</strong> Devem estar em formato <strong>PDF</strong>, apresentando apenas colunas e linhas simples,
                                sem formatação especial (como células mescladas). Caso contrário, o oráculo não conseguirá interpretar
                                corretamente os dados.
                            </li>
                            <li>
                                <strong>Formatos Aceitos:</strong> PDF, DOC, DOCX e TXT.
                            </li>
                        </ul>

                        <h5 style={{ fontSize: '16px', fontWeight: '600', marginTop: '16px', marginBottom: '8px' }}>Exclusão de Arquivos</h5>
                        <p>
                            Ao remover um arquivo de uma <em>vector store</em>, ele será <strong>permanentemente excluído</strong>.
                            Certifique-se de que deseja removê-lo antes de prosseguir.
                        </p>
                    </div>
                </div>

                {/* Rodapé do modal */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(249, 250, 251, 0.8)',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorialModal;