'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Ao montar o componente, verificar preferência salva ou preferência do sistema
    useEffect(() => {
        // Verificar se o usuário já tem preferência salva
        const savedPreference = localStorage.getItem('darkMode');

        if (savedPreference !== null) {
            setIsDarkMode(savedPreference === 'true');
        } else {
            // Se não há preferência salva, verificar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(prefersDark);
        }
    }, []);

    // Efeito para aplicar a classe no html quando o estado mudar
    useEffect(() => {
        // Aplicar classe dark se necessário
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Salvar preferência
        localStorage.setItem('darkMode', String(isDarkMode));
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Hook para usar o contexto de tema
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
    }
    return context;
}