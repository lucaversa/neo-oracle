interface HeaderProps {
    toggleSidebar: () => void;
    onLogout: () => Promise<void>;
    userName?: string;
}

export default function Header({ toggleSidebar, onLogout, userName }: HeaderProps) {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 mr-2 text-gray-600 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Oráculo Empresarial</h1>
                </div>

                <div className="flex items-center">
                    <button
                        className="ml-2 p-2 text-gray-600 rounded-md hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title="Alternar tema"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    </button>

                    <div className="relative ml-3">
                        <div>
                            <button
                                type="button"
                                className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                                id="user-menu-button"
                            >
                                <span className="sr-only">Abrir menu do usuário</span>
                                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                                </div>
                            </button>
                        </div>

                        <div
                            className="hidden origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby="user-menu-button"
                            tabIndex={-1}
                        >
                            <a
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                            >
                                Meu perfil
                            </a>
                            <a
                                href="#"
                                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                            >
                                Configurações
                            </a>
                            <button
                                onClick={onLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="menuitem"
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}