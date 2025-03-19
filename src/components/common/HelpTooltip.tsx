// src/components/common/HelpTooltip.tsx
'use client'

import { useState } from 'react';

interface HelpTooltipProps {
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function HelpTooltip({ content, position = 'top' }: HelpTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Determinar posicionamento do tooltip
    const getTooltipStyles = () => {
        switch (position) {
            case 'bottom':
                return {
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)'
                };
            case 'left':
                return {
                    top: '50%',
                    right: 'calc(100% + 8px)',
                    transform: 'translateY(-50%)'
                };
            case 'right':
                return {
                    top: '50%',
                    left: 'calc(100% + 8px)',
                    transform: 'translateY(-50%)'
                };
            case 'top':
            default:
                return {
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)'
                };
        }
    };

    return (
        <div
            style={{
                position: 'relative',
                display: 'inline-block'
            }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <div
                style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--background-subtle)',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'help'
                }}
            >
                ?
            </div>

            {isVisible && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 10,
                        width: '200px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--background-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        ...getTooltipStyles()
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
}