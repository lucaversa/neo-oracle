'use client'

import { useState, FormEvent, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// Interface para Estrela
interface Star {
    x: number;
    y: number;
    size: number;
    speed: number;
    brightness: number;
    color: string;
    angle: number;
    pulse: number;
    pulseSpeed: number;
}

// Interface para as propriedades do componente DynamicBackground
interface DynamicBackgroundProps {
    isDarkMode: boolean;
    key?: string; // Adicionando key para forçar remontagem
}

// Componente de fundo estelar
const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ isDarkMode }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configurar o canvas para ocupar toda a tela
        const handleResize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Configuração das estrelas
        const stars: Star[] = [];

        // Cores diferenciadas por modo
        const colors = isDarkMode
            ? [
                '#ffffff', // Branco
                '#e8f4ff', // Branco azulado muito suave
                '#d1ebff', // Azul muito claro
                '#b8e2ff', // Azul claro
                '#88cedf', // Turquesa claro (combinando com o logo)
                '#4abedc'  // Turquesa médio
            ]
            : [
                '#0E9BBD', // Turquesa (cor principal)
                '#0a85a2', // Turquesa mais escuro e saturado
                '#0d8eae', // Turquesa médio escuro
                '#107d99', // Turquesa escuro (maior contraste com fundo branco)
                '#086b83', // Azul turquesa bem escuro
                '#065c71'  // Azul turquesa muito escuro para contraste
            ];

        // Criar estrelas com propriedades diferentes
        const createStars = () => {
            // Número base de estrelas
            const baseStarCount = isDarkMode ? 200 : 250; // Equilibrado para modo claro

            for (let i = 0; i < baseStarCount; i++) {
                const star: Star = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * (isDarkMode ? 0.9 : 0.7) + (isDarkMode ? 0.1 : 0.3), // 0.3-1.0px no modo claro
                    speed: Math.random() * 0.08 + 0.02,
                    brightness: Math.random() * 0.6 + (isDarkMode ? 0.3 : 0.7), // Maior brilho no modo claro
                    color: colors[Math.floor(Math.random() * colors.length)],
                    angle: Math.random() * Math.PI * 2,
                    pulse: 0,
                    pulseSpeed: Math.random() * 0.02 + 0.005
                };
                stars.push(star);
            }

            // Adicionar estrelas medianas mais visíveis
            const mediumStarCount = isDarkMode ? 12 : 25;
            for (let i = 0; i < mediumStarCount; i++) {
                const star: Star = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * (isDarkMode ? 0.8 : 0.7) + (isDarkMode ? 1.2 : 1.0), // 1.0-1.7px no modo claro
                    speed: Math.random() * 0.03 + 0.01,
                    brightness: Math.random() * 0.2 + (isDarkMode ? 0.7 : 0.8),
                    color: colors[Math.floor(Math.random() * 3)], // Cores mais escuras para destaque
                    angle: Math.random() * Math.PI * 2,
                    pulse: 0,
                    pulseSpeed: Math.random() * 0.01 + 0.005
                };
                stars.push(star);
            }

            // Adicionar algumas estrelas de destaque no modo claro
            if (!isDarkMode) {
                for (let i = 0; i < 8; i++) {
                    const star: Star = {
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        size: Math.random() * 0.5 + 1.7, // 1.7-2.2px - algumas estrelas bem visíveis como destaque
                        speed: Math.random() * 0.02 + 0.005,
                        brightness: Math.random() * 0.1 + 0.9, // Quase brilho máximo
                        color: colors[Math.floor(Math.random() * 2)], // Cores mais escuras para máximo contraste
                        angle: Math.random() * Math.PI * 2,
                        pulse: 0,
                        pulseSpeed: Math.random() * 0.01 + 0.01
                    };
                    stars.push(star);
                }
            }
        };

        // Desenhar uma estrela individual
        const drawStar = (star: Star) => {
            const brightness = star.brightness + Math.sin(star.pulse) * (isDarkMode ? 0.2 : 0.25);

            // Desenhar o núcleo da estrela
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = star.color.replace(')', `, ${brightness})`).replace('rgb', 'rgba');
            ctx.fill();

            // Adicionar brilho ao redor das estrelas
            if ((isDarkMode && star.size > 1.2) ||
                (!isDarkMode && star.size > 0.9)) { // Mais estrelas com brilho no modo claro
                ctx.beginPath();
                const glowSize = isDarkMode ? star.size * 1.5 : star.size * 1.8;
                ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(
                    star.x, star.y, star.size * 0.5,
                    star.x, star.y, glowSize
                );
                const glowIntensity = isDarkMode ? brightness * 0.3 : brightness * 0.35;
                glow.addColorStop(0, star.color.replace(')', `, ${glowIntensity})`).replace('rgb', 'rgba'));
                glow.addColorStop(1, star.color.replace(')', ', 0)').replace('rgb', 'rgba'));
                ctx.fillStyle = glow;
                ctx.fill();
            }
        };

        // Desenhar constelações (linhas entre algumas estrelas)
        const drawConstellations = () => {
            // Escolher algumas estrelas para conexão
            const connectedStars: Star[] = [];
            for (let i = 0; i < stars.length; i++) {
                if (Math.random() < 0.2 && stars[i].size > 0.8) {
                    connectedStars.push(stars[i]);
                }
            }

            // Conectar estrelas próximas
            for (let i = 0; i < connectedStars.length; i++) {
                for (let j = i + 1; j < connectedStars.length; j++) {
                    const dx = connectedStars[i].x - connectedStars[j].x;
                    const dy = connectedStars[i].y - connectedStars[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Conectar apenas estrelas não muito distantes
                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(connectedStars[i].x, connectedStars[i].y);
                        ctx.lineTo(connectedStars[j].x, connectedStars[j].y);

                        // Transparência baseada na distância
                        const opacity = Math.max(0, 0.3 - distance / 500);
                        ctx.strokeStyle = `rgba(120, 198, 215, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        };

        // Atualizar estrelas (movimento e pulsação)
        const updateStars = () => {
            for (let i = 0; i < stars.length; i++) {
                // Movimento
                stars[i].x += Math.cos(stars[i].angle) * stars[i].speed;
                stars[i].y += Math.sin(stars[i].angle) * stars[i].speed;

                // Reposicionar quando sair da tela
                if (stars[i].x < 0) stars[i].x = canvas.width;
                if (stars[i].x > canvas.width) stars[i].x = 0;
                if (stars[i].y < 0) stars[i].y = canvas.height;
                if (stars[i].y > canvas.height) stars[i].y = 0;

                // Pulsação (brilho)
                stars[i].pulse += stars[i].pulseSpeed;
                if (stars[i].pulse > Math.PI * 2) {
                    stars[i].pulse = 0;
                }
            }
        };

        // Função de animação
        const animate = () => {
            // Limpar com rastro para efeito de cauda (mais transparente no modo claro)
            ctx.fillStyle = isDarkMode
                ? 'rgba(10, 12, 22, 0.7)' // Opaco para o modo escuro
                : 'rgba(255, 255, 255, 0.25)'; // Muito mais transparente no modo claro para maior contraste
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Atualizar posições e desenhar
            updateStars();

            // Primeiro desenhar as constelações
            drawConstellations();

            // Depois desenhar as estrelas
            for (let i = 0; i < stars.length; i++) {
                drawStar(stars[i]);
            }

            requestAnimationFrame(animate);
        };

        // Iniciar
        createStars();
        animate();

        // Limpar ao desmontar
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isDarkMode]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                background: isDarkMode
                    ? 'radial-gradient(ellipse at top, #1A1E2E 0%, #131726 40%, #0A0E1A 100%)'
                    : 'radial-gradient(ellipse at top, #ffffff 0%, #f8fbff 50%, #f2f6fc 100%)'
            }}
        />
    );
};

// Interface para o resultado do login
interface LoginResult {
    success: boolean;
    error?: string;
}

// Componente que usa useSearchParams
function LoginContent() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();

    // Estado do tema anterior para detectar mudanças
    const [prevTheme, setPrevTheme] = useState<boolean>(isDarkMode);
    // Estado para controlar se é mobile ou não
    const [isMobile, setIsMobile] = useState<boolean>(false);

    // Detectar se é dispositivo móvel
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Verificar inicialmente
        checkMobile();

        // Adicionar event listener para recheck em resize
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Efeito para lidar com mudanças de tema
    useEffect(() => {
        // Se o tema mudou, atualize o estado
        if (prevTheme !== isDarkMode) {
            setPrevTheme(isDarkMode);
        }
    }, [isDarkMode, prevTheme]);

    // Verificar se já está autenticado ou se há mensagens no URL
    useEffect(() => {
        // Se já estiver logado, redirecionar para o chat
        if (user) {
            router.push('/chat');
            return;
        }

        // Verificar mensagens do URL
        const registered = searchParams.get('registered');
        const expired = searchParams.get('expired');
        const errorParam = searchParams.get('error');

        if (registered === 'true') {
            setSuccessMessage('Conta criada com sucesso! Você já pode fazer login.');
        }

        if (expired === 'true') {
            setError('Sua sessão expirou por inatividade. Por favor, faça login novamente.');
        }

        if (errorParam) {
            setError(decodeURIComponent(errorParam));
        }
    }, [user, router, searchParams]);

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Usar o método de login do contexto de autenticação
            const result = await login(email, password) as LoginResult;

            if (!result.success) {
                // Tratando diferentes tipos de erro com mensagens específicas
                if (result.error?.includes('Invalid')) {
                    setError('Credenciais inválidas. Verifique seu email e senha.');
                } else if (result.error?.includes('not found') || result.error?.includes('user') || result.error?.includes('no user')) {
                    setError('Usuário não encontrado. Verifique seu email ou contacte o administrador.');
                } else if (result.error?.includes('locked') || result.error?.includes('disabled')) {
                    setError('Conta bloqueada ou desativada. Entre em contato com o administrador.');
                } else if (result.error?.includes('network') || result.error?.includes('connection')) {
                    setError('Erro de conexão. Verifique sua internet e tente novamente.');
                } else if (result.error?.includes('many') || result.error?.includes('attempts')) {
                    setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
                } else {
                    setError(result.error || 'Erro ao realizar login. Por favor, tente novamente.');
                }
                return;
            }

            // Login bem-sucedido
            setSuccessMessage('Login realizado com sucesso! Redirecionando...');

            // Redirecionar para a página de chat
            router.push('/chat');

        } catch (err: unknown) {
            console.error('Erro ao processar login:', err);

            // Criando uma interface para tipos de erro que podem ter propriedades específicas
            interface ExtendedError {
                message?: string;
                code?: string;
                status?: number;
            }

            // Converter para o tipo extendido
            const error = err as ExtendedError;

            // Tratamento mais detalhado de erros de exceção
            if (error.message?.includes('network') || error.code === 'NETWORK_ERROR' || !navigator.onLine) {
                setError('Erro de conexão. Verifique sua internet e tente novamente.');
            } else if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
                setError('O servidor demorou para responder. Tente novamente em alguns instantes.');
            } else if (error.message?.includes('server') || error.status && error.status >= 500) {
                setError('Erro no servidor. Nossa equipe foi notificada. Tente novamente mais tarde.');
            } else if (error.status === 429) {
                setError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
            } else if (error.status === 403) {
                setError('Acesso negado. Verifique se você tem permissão para acessar o sistema.');
            } else {
                setError('Ocorreu um erro durante o login. Por favor, tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: isMobile ? '10px' : '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Fundo dinâmico animado - com key para forçar recriação ao mudar tema */}
            <DynamicBackground isDarkMode={isDarkMode} key={isDarkMode ? "dark" : "light"} />

            {/* Toggle Theme Button - ajustado para mobile */}
            <button
                onClick={toggleDarkMode}
                style={{
                    position: 'absolute',
                    top: isMobile ? 'auto' : '20px',
                    bottom: isMobile ? '20px' : 'auto',
                    right: '20px',
                    backgroundColor: isDarkMode ? 'rgba(30, 30, 50, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isMobile ? '8px' : '10px',
                    borderRadius: '50%',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.3s',
                    width: isMobile ? '36px' : '42px',
                    height: isMobile ? '36px' : '42px'
                }}
                aria-label={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
                {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "22"} height={isMobile ? "18" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "22"} height={isMobile ? "18" : "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                )}
            </button>

            <div style={{
                width: '100%',
                maxWidth: isMobile ? '350px' : '430px',
                backgroundColor: isDarkMode
                    ? '#171a29'
                    : '#ffffff',
                borderRadius: isMobile ? '16px' : '20px',
                overflow: 'hidden',
                transition: 'all 0.3s',
                boxShadow: isDarkMode
                    ? '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)'
                    : '0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                animation: 'fadeIn 0.5s ease-out',
                zIndex: 1
            }}>
                {/* Cabeçalho */}
                <div style={{
                    padding: isMobile ? '30px 20px 20px' : '40px 30px 30px',
                    background: 'linear-gradient(135deg, #0E9BBD 0%, #0B8099 100%)',
                    color: 'white',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Elementos decorativos */}
                    <div style={{
                        position: 'absolute',
                        top: '-80px',
                        right: '-80px',
                        width: '250px',
                        height: '250px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: 1
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-60px',
                        left: '-60px',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: 1
                    }}></div>

                    <div style={{
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <div style={{
                            width: isMobile ? '80px' : '100px',
                            height: isMobile ? '80px' : '100px',
                            margin: '0 auto 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.18)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(8px)',
                            border: '2px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={isMobile ? "40" : "50"}
                                height={isMobile ? "40" : "50"}
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
                        <h1 style={{
                            fontSize: isMobile ? '24px' : '28px',
                            fontWeight: 'bold',
                            marginBottom: isMobile ? '6px' : '8px',
                            letterSpacing: '-0.5px'
                        }}>
                            Oráculo
                        </h1>
                        <p style={{
                            fontSize: isMobile ? '14px' : '16px',
                            opacity: '0.9',
                            marginBottom: isMobile ? '6px' : '8px'
                        }}>
                            O assistente pessoal da sua empresa
                        </p>
                        <div style={{
                            width: '60px',
                            height: '4px',
                            margin: '10px auto 0',
                            background: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: '2px'
                        }}></div>
                    </div>
                </div>

                {/* Formulário */}
                <div style={{
                    padding: isMobile ? '20px' : '30px',
                    transition: 'background-color 0.3s'
                }}>
                    {successMessage && (
                        <div style={{
                            padding: isMobile ? '12px 15px' : '14px 18px',
                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            borderLeft: '4px solid var(--success-color)',
                            borderRadius: isMobile ? '10px' : '12px',
                            marginBottom: isMobile ? '16px' : '20px',
                            color: 'var(--success-color)',
                            fontSize: isMobile ? '13px' : '14px',
                            animation: 'fadeIn 0.3s ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '8px' : '10px',
                            backdropFilter: 'blur(4px)'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: isMobile ? '12px 15px' : '14px 18px',
                            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid var(--error-color)',
                            borderRadius: isMobile ? '10px' : '12px',
                            marginBottom: isMobile ? '16px' : '20px',
                            color: 'var(--error-color)',
                            fontSize: isMobile ? '13px' : '14px',
                            animation: 'fadeIn 0.3s ease-out',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '8px' : '10px',
                            backdropFilter: 'blur(4px)'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
                            <label
                                htmlFor="email"
                                style={{
                                    display: 'block',
                                    marginBottom: isMobile ? '8px' : '10px',
                                    fontSize: isMobile ? '14px' : '15px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    transition: 'color 0.3s'
                                }}
                            >
                                Email
                            </label>
                            <div style={{
                                position: 'relative'
                            }}>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: isMobile ? '12px 12px 12px 40px' : '16px 16px 16px 52px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: isMobile ? '12px' : '14px',
                                        fontSize: isMobile ? '14px' : '15px',
                                        outline: 'none',
                                        backgroundColor: isDarkMode ? 'rgba(30, 30, 50, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.3s',
                                        boxShadow: 'var(--shadow-sm)',
                                        backdropFilter: 'blur(4px)',
                                        height: isMobile ? '44px' : 'auto'
                                    }}
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: isMobile ? '14px' : '18px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: isMobile ? '20px' : '22px',
                                    height: isMobile ? '20px' : '22px',
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.3s'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: isMobile ? '8px' : '10px'
                            }}>
                                <label
                                    htmlFor="password"
                                    style={{
                                        fontSize: isMobile ? '14px' : '15px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        transition: 'color 0.3s'
                                    }}
                                >
                                    Senha
                                </label>
                            </div>
                            <div style={{
                                position: 'relative'
                            }}>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: isMobile ? '12px 12px 12px 40px' : '16px 16px 16px 52px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: isMobile ? '12px' : '14px',
                                        fontSize: isMobile ? '14px' : '15px',
                                        outline: 'none',
                                        backgroundColor: isDarkMode ? 'rgba(30, 30, 50, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.3s',
                                        boxShadow: 'var(--shadow-sm)',
                                        backdropFilter: 'blur(4px)',
                                        height: isMobile ? '44px' : 'auto'
                                    }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: isMobile ? '14px' : '18px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: isMobile ? '20px' : '22px',
                                    height: isMobile ? '20px' : '22px',
                                    color: 'var(--text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.3s'
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "18" : "20"} height={isMobile ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                padding: isMobile ? '12px' : '16px',
                                background: 'linear-gradient(135deg, #0E9BBD 0%, #0B8099 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: isMobile ? '12px' : '14px',
                                fontSize: isMobile ? '15px' : '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? '0.7' : '1',
                                marginBottom: isMobile ? '16px' : '20px',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(14, 155, 189, 0.3)',
                                position: 'relative',
                                overflow: 'hidden',
                                height: isMobile ? '44px' : 'auto'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                transform: 'translateX(-100%)',
                                animation: loading ? 'none' : 'shimmer 2s infinite'
                            }}></div>

                            {loading ? (
                                <>
                                    <svg
                                        style={{
                                            width: isMobile ? '18px' : '20px',
                                            height: isMobile ? '18px' : '20px',
                                            marginRight: '8px',
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
                                    Entrando...
                                </>
                            ) : 'Entrar'}
                        </button>
                    </form>

                    <div style={{
                        marginTop: isMobile ? '20px' : '28px',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)',
                        fontSize: isMobile ? '12px' : '14px',
                        transition: 'color 0.3s'
                    }}>
                        <p>Acesso restrito para usuários autorizados.</p>
                    </div>
                </div>
            </div>

            {/* CSS para animações */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                
                /* Base CSS variables for light/dark mode */
                :root {
                    --background-main: ${isDarkMode ? '#0A0E1A' : '#f8fbff'};
                    --text-primary: ${isDarkMode ? '#ffffff' : '#333333'};
                    --text-secondary: ${isDarkMode ? '#a0aec0' : '#666666'};
                    --text-tertiary: ${isDarkMode ? '#718096' : '#888888'};
                    --primary-color: #0E9BBD;
                    --border-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
                    --success-color: ${isDarkMode ? '#10b981' : '#059669'};
                    --error-color: ${isDarkMode ? '#ef4444' : '#dc2626'};
                    --shadow-sm: ${isDarkMode ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)'};
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    html {
                        font-size: 14px;
                    }
                }
                
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    background-color: var(--background-main);
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
}

// Componente principal que envolve o conteúdo em um Suspense
export default function Login() {
    return (
        <Suspense fallback={
            <div style={{
                height: '100vh',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'var(--background-main)'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    borderWidth: '4px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-color)',
                    borderTopColor: 'var(--primary-color)',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}