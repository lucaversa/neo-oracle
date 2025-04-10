'use client'

import { useEffect, useState, useCallback } from 'react';
import { withAdminAccess } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Interface para usuário
interface User {
    id: string;
    email: string;
    created_at: string;
    is_admin: boolean;
}

// Interface para confirmação de exclusão
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    itemType: string;
}

// Interface para modal de adição de usuário
interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string, password: string) => Promise<void>;
}

// Função para gerar senha aleatória
function generateRandomPassword(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Componente do modal de confirmação de exclusão
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, itemType }: DeleteConfirmationModalProps) {
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
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '400px',
                padding: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '50%',
                    margin: '0 auto 16px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>

                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    textAlign: 'center'
                }}>
                    Excluir {itemType}
                </h3>

                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    marginBottom: '24px'
                }}>
                    Tem certeza que deseja excluir <strong>{itemName}</strong>? Esta ação não pode ser desfeita.
                </p>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--background-subtle)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--error-color)',
                            color: 'white',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}

// Componente do modal de adição de usuário
function AddUserModal({ isOpen, onClose, onSubmit }: AddUserModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordCopied, setPasswordCopied] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Email e senha são obrigatórios');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onSubmit(email, password);
            setEmail('');
            setPassword('');
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error
                ? err.message
                : 'Erro ao criar usuário';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGeneratePassword = () => {
        const newPassword = generateRandomPassword();
        setPassword(newPassword);
        setPasswordCopied(false);
    };

    const handleCopyPassword = () => {
        navigator.clipboard.writeText(password);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
    };

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
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--background-elevated)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                width: '100%',
                maxWidth: '450px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        margin: 0
                    }}>
                        Adicionar Novo Usuário
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}
                            placeholder="usuario@exemplo.com"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Senha
                        </label>
                        <div style={{
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <div style={{
                                flex: 1,
                                position: 'relative'
                            }}>
                                <input
                                    type="text" // Alterado para text para mostrar a senha gerada
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="••••••••••••"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyPassword}
                                title="Copiar senha"
                                disabled={!password || isSubmitting}
                                style={{
                                    padding: '0 12px',
                                    backgroundColor: passwordCopied ? 'var(--success-color)' : 'var(--background-subtle)',
                                    color: passwordCopied ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    cursor: !password || isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: !password || isSubmitting ? 0.7 : 1,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {passwordCopied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleGeneratePassword}
                                title="Gerar senha aleatória"
                                disabled={isSubmitting}
                                style={{
                                    padding: '0 12px',
                                    backgroundColor: 'var(--background-subtle)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                        </div>
                        <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: '8px 0 0 0'
                        }}>
                            Clique no ícone <span style={{ verticalAlign: 'middle' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}>
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </span> para gerar uma senha aleatória.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--error-color)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--background-subtle)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                        borderTopColor: 'white',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <line x1="19" y1="8" x2="19" y2="14"></line>
                                        <line x1="16" y1="11" x2="22" y2="11"></line>
                                    </svg>
                                    Adicionar Usuário
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function UsersAdminPage() {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20); // Ajustado para 20 usuários por página
    const [totalPages, setTotalPages] = useState(1);

    const { user: currentUser } = useAuth();
    const router = useRouter();

    // Buscar todos os usuários usando a API
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/list-users');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao buscar usuários');
            }

            setAllUsers(data.users);
            setUsers(data.users);
            setTotalPages(Math.ceil(data.users.length / itemsPerPage));
        } catch (err: unknown) {
            console.error('Erro ao buscar usuários:', err);
            setError(err instanceof Error ? err.message : 'Falha ao buscar usuários');
        } finally {
            setLoading(false);
        }
    }, [itemsPerPage]);

    // Função de pesquisa e filtragem
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setUsers(allUsers);
        } else {
            const filteredUsers = allUsers.filter(user =>
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setUsers(filteredUsers);
        }

        // Resetar para a primeira página quando a pesquisa mudar
        setCurrentPage(1);

        // Recalcular número total de páginas
        const filtered = searchTerm.trim() === '' ? allUsers :
            allUsers.filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()));
        setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
    }, [searchTerm, allUsers, itemsPerPage]);

    // Adicionar novo usuário usando a API
    const handleAddUser = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao criar usuário');
            }

            setSuccessMessage(`Usuário ${email} criado com sucesso`);
            setTimeout(() => setSuccessMessage(null), 5000);

            // Atualizar a lista de usuários
            fetchUsers();
        } catch (err: unknown) {
            console.error('Erro ao adicionar usuário:', err);
            throw new Error(err instanceof Error ? err.message : 'Falha ao criar usuário');
        }
    };

    // Deletar um usuário usando a API
    const handleDeleteUser = async () => {
        if (!deleteTarget) return;

        try {
            const response = await fetch(`/api/admin/delete-user?userId=${deleteTarget.id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha ao excluir usuário');
            }

            setSuccessMessage(`Usuário ${deleteTarget.email} excluído com sucesso`);
            setTimeout(() => setSuccessMessage(null), 5000);

            setDeleteTarget(null);

            // Atualizar a lista de usuários
            fetchUsers();
        } catch (err: unknown) {
            console.error('Erro ao excluir usuário:', err);
            setError(err instanceof Error ? err.message : 'Falha ao excluir usuário');
        }
    };

    // Alternar status de admin usando a API
    const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
        if (userId === currentUser?.id && isCurrentlyAdmin) {
            setError('Você não pode remover seu próprio acesso de administrador');
            setTimeout(() => setError(null), 5000);
            return;
        }

        try {
            const action = isCurrentlyAdmin ? 'remove' : 'add';

            const response = await fetch('/api/admin/toggle-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    action,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao alterar status de administrador');
            }

            // Atualizar o usuário na lista local
            const updatedAllUsers = allUsers.map(user =>
                user.id === userId
                    ? { ...user, is_admin: !isCurrentlyAdmin }
                    : user
            );

            setAllUsers(updatedAllUsers);

            // Atualizar a lista filtrada também
            setUsers(prev =>
                prev.map(user =>
                    user.id === userId
                        ? { ...user, is_admin: !isCurrentlyAdmin }
                        : user
                )
            );

            setSuccessMessage(`Status de administrador ${isCurrentlyAdmin ? 'removido' : 'adicionado'} com sucesso`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: unknown) {
            console.error('Erro ao alterar status de admin:', err);
            setError(err instanceof Error ? err.message : 'Falha ao atualizar status de admin');
            setTimeout(() => setError(null), 5000);
        }
    };

    // Função de paginação
    const paginate = (items: User[], page: number, pageSize: number) => {
        const startIndex = (page - 1) * pageSize;
        return items.slice(startIndex, startIndex + pageSize);
    };

    // Navegar para páginas
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Voltar para a página anterior
    const handleBack = () => {
        router.push('/chat');
    };

    // Limpar pesquisa
    const clearSearch = () => {
        setSearchTerm('');
    };

    // Carregar usuários ao montar o componente
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Obter os usuários da página atual
    const currentUsers = paginate(users, currentPage, itemsPerPage);

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
                        Administração de Usuários
                    </h1>
                </div>
                <div>
                    <button
                        onClick={() => setAddUserModalOpen(true)}
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
                        Adicionar Usuário
                    </button>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '24px'
            }}>
                {/* Mensagens de erro/sucesso */}
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
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        padding: '16px',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderLeft: '4px solid var(--success-color)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        color: 'var(--success-color)',
                        fontSize: '14px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            {successMessage}
                        </div>
                    </div>
                )}

                {/* Área de conteúdo principal */}
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
                                Carregando usuários...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {allUsers.length === 0 ? (
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
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <h2 style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    marginBottom: '8px'
                                }}>
                                    Nenhum usuário encontrado
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    maxWidth: '400px',
                                    marginBottom: '24px'
                                }}>
                                    Adicione um novo usuário para começar a gerenciar seu sistema.
                                </p>
                                <button
                                    onClick={() => setAddUserModalOpen(true)}
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
                                    Adicionar primeiro usuário
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    marginBottom: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px'
                                    }}>
                                        <h2 style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: 'var(--text-primary)',
                                            margin: 0
                                        }}>
                                            {users.length} Usuário{users.length !== 1 ? 's' : ''}
                                        </h2>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        {/* Campo de Pesquisa */}
                                        <div style={{
                                            position: 'relative',
                                            width: '240px'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="Buscar por email..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 36px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    backgroundColor: 'var(--background)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                pointerEvents: 'none'
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                </svg>
                                            </div>
                                            {searchTerm && (
                                                <button
                                                    onClick={clearSearch}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: '0',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={fetchUsers}
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
                                </div>

                                {/* Tabela de usuários */}
                                {users.length === 0 ? (
                                    <div style={{
                                        backgroundColor: 'var(--background-elevated)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-sm)',
                                        border: '1px solid var(--border-color)',
                                        padding: '40px 20px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: '15px',
                                            margin: '0 0 16px'
                                        }}>
                                            Nenhum usuário encontrado para &ldquo;{searchTerm}&rdquo;
                                        </p>
                                        <button
                                            onClick={clearSearch}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: 'var(--background-subtle)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Limpar pesquisa
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        backgroundColor: 'var(--background-elevated)',
                                        borderRadius: '12px',
                                        boxShadow: 'var(--shadow-sm)',
                                        border: '1px solid var(--border-color)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{
                                                            textAlign: 'left',
                                                            padding: '14px 20px',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            backgroundColor: 'var(--background-subtle)'
                                                        }}>Email</th>
                                                        <th style={{
                                                            textAlign: 'left',
                                                            padding: '14px 20px',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            backgroundColor: 'var(--background-subtle)'
                                                        }}>Criado em</th>
                                                        <th style={{
                                                            textAlign: 'center',
                                                            padding: '14px 20px',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            backgroundColor: 'var(--background-subtle)'
                                                        }}>Admin</th>
                                                        <th style={{
                                                            textAlign: 'right',
                                                            padding: '14px 20px',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            backgroundColor: 'var(--background-subtle)'
                                                        }}>Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentUsers.map((user, index) => (
                                                        <tr key={user.id} style={{
                                                            borderBottom: index < currentUsers.length - 1 ? '1px solid var(--border-color)' : 'none'
                                                        }}>
                                                            <td style={{
                                                                padding: '16px 20px',
                                                                color: 'var(--text-primary)',
                                                                fontSize: '14px'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px'
                                                                }}>
                                                                    <div style={{
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        borderRadius: '50%',
                                                                        backgroundColor: 'var(--primary-light)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '16px',
                                                                        fontWeight: '600',
                                                                        color: 'var(--primary-color)'
                                                                    }}>
                                                                        {user.email.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span style={{ fontWeight: user.id === currentUser?.id ? '600' : '400' }}>
                                                                        {user.email}
                                                                        {user.id === currentUser?.id && (
                                                                            <span style={{
                                                                                marginLeft: '8px',
                                                                                fontSize: '12px',
                                                                                backgroundColor: 'var(--primary-light)',
                                                                                color: 'var(--primary-color)',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                fontWeight: '500'
                                                                            }}>Você</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td style={{
                                                                padding: '16px 20px',
                                                                color: 'var(--text-secondary)',
                                                                fontSize: '14px'
                                                            }}>
                                                                {new Date(user.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td style={{
                                                                padding: '16px 20px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <button
                                                                    onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                                                                    disabled={user.id === currentUser?.id && user.is_admin}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: user.is_admin ? 'var(--primary-light)' : 'var(--background-subtle)',
                                                                        color: user.is_admin ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: user.is_admin ? '600' : '400',
                                                                        cursor: (user.id === currentUser?.id && user.is_admin) ? 'not-allowed' : 'pointer',
                                                                        opacity: (user.id === currentUser?.id && user.is_admin) ? 0.7 : 1
                                                                    }}
                                                                >
                                                                    {user.is_admin ? 'Sim' : 'Não'}
                                                                </button>
                                                            </td>
                                                            <td style={{
                                                                padding: '16px 20px',
                                                                textAlign: 'right'
                                                            }}>
                                                                <button
                                                                    onClick={() => setDeleteTarget(user)}
                                                                    disabled={user.id === currentUser?.id}
                                                                    style={{
                                                                        padding: '6px 14px',
                                                                        backgroundColor: 'transparent',
                                                                        color: 'var(--error-color)',
                                                                        border: '1px solid var(--error-color)',
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
                                                                        cursor: user.id === currentUser?.id ? 'not-allowed' : 'pointer',
                                                                        opacity: user.id === currentUser?.id ? 0.5 : 1
                                                                    }}
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Paginação */}
                                        {totalPages > 1 && (
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                padding: '16px',
                                                borderTop: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px',
                                                    alignItems: 'center'
                                                }}>
                                                    <button
                                                        onClick={() => goToPage(1)}
                                                        disabled={currentPage === 1}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                            opacity: currentPage === 1 ? 0.5 : 1
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="11 17 6 12 11 7"></polyline>
                                                            <polyline points="18 17 13 12 18 7"></polyline>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => goToPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                            opacity: currentPage === 1 ? 0.5 : 1
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="15 18 9 12 15 6"></polyline>
                                                        </svg>
                                                    </button>

                                                    <span style={{
                                                        padding: '0 16px',
                                                        fontSize: '14px',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        Página {currentPage} de {totalPages}
                                                    </span>

                                                    <button
                                                        onClick={() => goToPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                            opacity: currentPage === totalPages ? 0.5 : 1
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="9 18 15 12 9 6"></polyline>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => goToPage(totalPages)}
                                                        disabled={currentPage === totalPages}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid var(--border-color)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                            opacity: currentPage === totalPages ? 0.5 : 1
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="13 17 18 12 13 7"></polyline>
                                                            <polyline points="6 17 11 12 6 7"></polyline>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modal para adicionar usuário */}
            <AddUserModal
                isOpen={addUserModalOpen}
                onClose={() => setAddUserModalOpen(false)}
                onSubmit={handleAddUser}
            />

            {/* Modal de confirmação de exclusão */}
            <DeleteConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteUser}
                itemName={deleteTarget?.email || ''}
                itemType="Usuário"
            />

            {/* Estilos de animação */}
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default withAdminAccess(UsersAdminPage);