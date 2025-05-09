import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAdmin } from '@/context/AdminContext';

interface HeaderProps {
    toggleSidebar: () => void;
    onLogout: () => Promise<void>;
    userName?: string;
}

export default function Header({ toggleSidebar, onLogout, userName }: HeaderProps) {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { isAdmin } = useAdmin();
    const router = useRouter();

    // Detectar se é dispositivo móvel
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Verificar inicialmente
        checkIfMobile();

        // Configurar listener para redimensionamento
        window.addEventListener('resize', checkIfMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const toggleUserMenu = () => {
        setUserMenuOpen(!userMenuOpen);
    };

    const handleNavigateToAdmin = () => {
        router.push('/admin/vector-stores');
    };

    // Nova função para navegar para a página de gerenciamento de usuários
    const handleNavigateToUsers = () => {
        router.push('/admin/users');
    };

    return (
        <header style={{
            backgroundColor: 'var(--background-elevated)',
            boxShadow: 'var(--shadow-sm)',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            transition: 'background-color 0.3s, color 0.3s'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                maxWidth: '1400px',
                margin: '0 auto',
                width: '100%',
                position: 'relative' // Para posicionamento absoluto do título
            }}>
                {/* Menu (apenas em mobile) */}
                {isMobile && (
                    <button
                        onClick={toggleSidebar}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10 // Acima do título centralizado
                        }}
                        aria-label="Abrir menu lateral"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                )}

                {/* Título centralizado */}
                {!isMobile && (<div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    width: 'auto',
                    zIndex: 5
                }}>
                    <span style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: 'var(--primary-color)', // Agora usa a variável CSS em vez de valor fixo
                    }}>
                        Oráculo
                    </span>
                </div>
                )}

                {/* Espaço vazio à esquerda em desktop para equilibrar o layout */}
                {!isMobile && <div style={{ width: '24px' }}></div>}

                {/* Controles direita */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 10 // Acima do título centralizado
                }}>
                    {/* Botão de Admin Vector Stores (Apenas para administradores) */}
                    {isAdmin && (
                        <button
                            onClick={handleNavigateToAdmin}
                            style={{
                                padding: '10px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--background-subtle)',
                                color: 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s'
                            }}
                            title="Gerenciar Vector Stores"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    )}

                    {/* Novo Botão de Admin Users (Apenas para administradores) */}
                    {isAdmin && (
                        <button
                            onClick={handleNavigateToUsers}
                            style={{
                                padding: '10px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--background-subtle)',
                                color: 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s'
                            }}
                            title="Gerenciar Usuários"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </button>
                    )}

                    {/* Botão de tema */}
                    <button
                        onClick={toggleDarkMode}
                        style={{
                            padding: '10px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--background-subtle)',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                        }}
                        title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                    >
                        {isDarkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* Menu do usuário */}
                    <div style={{
                        position: 'relative'
                    }}>
                        <button
                            onClick={toggleUserMenu}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px 6px 6px',
                                borderRadius: '9999px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--background-elevated)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            aria-label="Menu do usuário"
                        >
                            <div style={{
                                height: '32px',
                                width: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--info-color))', // Usa variáveis CSS
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                {userName ? userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span style={{
                                color: 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {userName || 'Usuário'}
                            </span>
                        </button>

                        {userMenuOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '48px',
                                    width: '200px',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--background-elevated)',
                                    boxShadow: 'var(--shadow-lg)',
                                    border: '1px solid var(--border-color)',
                                    zIndex: 50,
                                    overflow: 'hidden'
                                }}
                                role="menu"
                            >
                                <div
                                    style={{
                                        padding: '16px',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}
                                >
                                    <p style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {userName || 'Usuário'}
                                    </p>

                                </div>

                                <div style={{ padding: '8px 0' }}>
                                    {/* Menu Item - Vector Stores (Apenas para administradores) */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                handleNavigateToAdmin();
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 16px',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                            Gerenciar Vector Stores
                                        </button>
                                    )}

                                    {/* Novo Menu Item - Users Admin (Apenas para administradores) */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                handleNavigateToUsers();
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 16px',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            Gerenciar Usuários
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            onLogout();
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '10px 16px',
                                            fontSize: '14px',
                                            color: 'var(--text-primary)',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}