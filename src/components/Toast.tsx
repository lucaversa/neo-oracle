'use client'

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
    message: string;
    type?: 'error' | 'success' | 'warning' | 'info';
    duration?: number;
    onClose?: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const Toast: React.FC<ToastProps> = ({
    message,
    type = 'error',
    duration = 5000,
    onClose,
    action
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);

    // Set up for client-side rendering
    useEffect(() => {
        setIsBrowser(true);
        // Start entrance animation
        setTimeout(() => setIsVisible(true), 10);

        // Auto-dismiss after duration
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for exit animation to complete
        setTimeout(() => {
            if (onClose) onClose();
        }, 300);
    };

    // Get icon based on type
    const getIcon = () => {
        switch (type) {
            case 'error':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                );
            case 'success':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                );
            case 'warning':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                );
            case 'info':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                );
        }
    };

    // Get background color based on type
    const getBackgroundColor = () => {
        switch (type) {
            case 'error': return 'var(--error-color)';
            case 'success': return 'var(--success-color)';
            case 'warning': return 'var(--warning-color, #f59e0b)';
            case 'info': return 'var(--primary-color)';
            default: return 'var(--error-color)';
        }
    };

    const toastContent = (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: `translateX(-50%) translateY(${isVisible ? '0' : '20px'})`,
                backgroundColor: 'var(--background-elevated)',
                color: 'var(--text-primary)',
                padding: '0',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
                zIndex: 9999,
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '450px',
                width: 'calc(100% - 40px)',
                border: '1px solid var(--border-color)'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '16px',
                    position: 'relative'
                }}
            >
                {/* Colored indicator line */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        backgroundColor: getBackgroundColor()
                    }}
                />

                {/* Icon */}
                <div
                    style={{
                        color: getBackgroundColor(),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        marginTop: '2px'
                    }}
                >
                    {getIcon()}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            marginBottom: '4px'
                        }}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <div
                        style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.5'
                        }}
                    >
                        {message}
                    </div>

                    {/* Action button if provided */}
                    {action && (
                        <button
                            onClick={action.onClick}
                            style={{
                                marginTop: '12px',
                                padding: '6px 12px',
                                backgroundColor: 'var(--background-subtle)',
                                color: getBackgroundColor(),
                                border: `1px solid ${getBackgroundColor()}`,
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--background-muted)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--background-subtle)';
                            }}
                        >
                            {action.label}
                        </button>
                    )}
                </div>

                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginLeft: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background-subtle)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Progress bar */}
            <div
                style={{
                    height: '4px',
                    backgroundColor: 'var(--background-subtle)',
                    position: 'relative'
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '100%',
                        backgroundColor: getBackgroundColor(),
                        width: '100%',
                        animation: `shrink ${duration}ms linear forwards`
                    }}
                />
            </div>
        </div>
    );

    if (!isBrowser) {
        return null;
    }

    return createPortal(toastContent, document.body);
};

// Toast Container Component to manage multiple toasts
interface ToastContainerProps {
    toasts: Array<{
        id: string;
        message: string;
        type?: 'error' | 'success' | 'warning' | 'info';
        duration?: number;
        action?: {
            label: string;
            onClick: () => void;
        };
    }>;
    removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                    action={toast.action}
                />
            ))}
        </>
    );
};

// Hook to manage toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<Array<{
        id: string;
        message: string;
        type?: 'error' | 'success' | 'warning' | 'info';
        duration?: number;
        action?: {
            label: string;
            onClick: () => void;
        };
    }>>([]);

    const addToast = (
        message: string,
        options?: {
            type?: 'error' | 'success' | 'warning' | 'info';
            duration?: number;
            action?: {
                label: string;
                onClick: () => void;
            };
        }
    ) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, ...options }]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    // Add specific toast types for convenience
    const showError = (message: string, options?: Omit<Parameters<typeof addToast>[1], 'type'>) => {
        return addToast(message, { type: 'error', ...options });
    };

    const showSuccess = (message: string, options?: Omit<Parameters<typeof addToast>[1], 'type'>) => {
        return addToast(message, { type: 'success', ...options });
    };

    const showWarning = (message: string, options?: Omit<Parameters<typeof addToast>[1], 'type'>) => {
        return addToast(message, { type: 'warning', ...options });
    };

    const showInfo = (message: string, options?: Omit<Parameters<typeof addToast>[1], 'type'>) => {
        return addToast(message, { type: 'info', ...options });
    };

    // Create styles for the shrink animation
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const style = document.createElement('style');
            style.innerHTML = `
        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `;
            document.head.appendChild(style);

            return () => {
                document.head.removeChild(style);
            };
        }
    }, []);

    return {
        toasts,
        addToast,
        removeToast,
        showError,
        showSuccess,
        showWarning,
        showInfo
    };
};

export default Toast;