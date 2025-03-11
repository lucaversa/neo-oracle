// src/components/auth/SessionTimeout.tsx
'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SessionTimeoutProps {
    timeoutMinutes?: number; // Tempo em minutos antes da expiração
    warningMinutes?: number; // Tempo em minutos para mostrar aviso antes da expiração
}

export default function SessionTimeout({
    timeoutMinutes = 60, // 1 hora por padrão
    warningMinutes = 5   // Aviso 5 minutos antes
}: SessionTimeoutProps) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Converter para milissegundos
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;

    useEffect(() => {
        let activityTimeout: NodeJS.Timeout;
        let warningTimeout: NodeJS.Timeout;
        let countdownInterval: NodeJS.Timeout;
        let lastActivity = Date.now();

        // Função para redefinir os timers quando há atividade
        const resetTimers = () => {
            lastActivity = Date.now();
            setShowWarning(false);
            setTimeLeft(null);

            // Limpar timers existentes
            clearTimeout(activityTimeout);
            clearTimeout(warningTimeout);
            clearInterval(countdownInterval);

            // Configurar novo timer para logout
            activityTimeout = setTimeout(handleTimeout, timeoutMs);

            // Configurar novo timer para aviso
            warningTimeout = setTimeout(() => {
                setShowWarning(true);

                // Iniciar contagem regressiva
                const warningStartTime = Date.now();
                countdownInterval = setInterval(() => {
                    const elapsed = Date.now() - warningStartTime;
                    const remaining = Math.max(0, warningMs - elapsed);
                    setTimeLeft(Math.ceil(remaining / 1000));

                    if (remaining <= 0) {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }, timeoutMs - warningMs);
        };

        // Função para lidar com o timeout
        const handleTimeout = async () => {
            try {
                // Fazer logout
                await supabase.auth.signOut();

                // Redirecionar para login
                router.push('/login?expired=true');
            } catch (error) {
                console.error('Erro ao encerrar sessão:', error);
            }
        };

        // Detectar atividade do usuário
        const handleActivity = () => {
            // Só redefinir se passou pelo menos 1 minuto desde a última atividade
            // isso evita muitas redefinições durante atividade contínua
            if (Date.now() - lastActivity > 60000) {
                resetTimers();
            }
        };

        // Eventos de atividade do usuário
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('scroll', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        // Iniciar timer no carregamento do componente
        resetTimers();

        // Cleanup na desmontagem
        return () => {
            clearTimeout(activityTimeout);
            clearTimeout(warningTimeout);
            clearInterval(countdownInterval);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, [timeoutMs, warningMs, router]);

    if (!showWarning) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md border border-yellow-400">
            <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sua sessão irá expirar em breve</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                    Por razões de segurança, você será desconectado em {timeLeft && Math.floor(timeLeft / 60)}:{timeLeft && String(timeLeft % 60).padStart(2, '0')} minutos.
                </p>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/login');
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Sair agora
                    </button>
                    <button
                        onClick={() => {
                            // Simular atividade para resetar o timer
                            window.dispatchEvent(new Event('mousemove'));
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                        Continuar conectado
                    </button>
                </div>
            </div>
        </div>
    );
}