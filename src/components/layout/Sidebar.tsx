// src/components/layout/Sidebar.tsx
import { useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    activeSessions: string[];
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => Promise<string | null>;
}

export default function Sidebar({
    isOpen,
    toggleSidebar,
    activeSessions,
    currentSessionId,
    onSessionSelect,
    onNewSession
}: SidebarProps) {
    const [creating, setCreating] = useState(false);

    const handleNewSession = async () => {
        setCreating(true);
        try {
            await onNewSession();
        } finally {
            setCreating(false);
        }
    };

    // Formatar o ID de sessão para exibição
    const formatSessionId = (sid: string): string => {
        // Extrair apenas os primeiros 8 caracteres do UUID
        const shortId = sid.split('-')[0] || sid.substring(0, 8);
        return `Conversa ${shortId}`;
    };

    return (
        <div
            className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:relative md:translate-x-0`}
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Histórico</h2>
                <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className="p-4">
                <button
                    onClick={handleNewSession}
                    disabled={creating}
                    className="w-full flex items-center justify-center py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {creating ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Criando...
                        </span>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Nova Conversa
                        </>
                    )}
                </button>
            </div>

            <div className="flex-grow overflow-y-auto p-2">
                {activeSessions.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-4">
                        Nenhuma conversa encontrada
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {activeSessions.map((session) => (
                            <li key={session}>
                                <button
                                    onClick={() => onSessionSelect(session)}
                                    className={`w-full text-left py-2 px-3 rounded-md transition-colors ${currentSessionId === session
                                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="font-medium truncate">{formatSessionId(session)}</div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full flex items-center justify-center py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Configurações
                </button>
            </div>
        </div>
    );
}