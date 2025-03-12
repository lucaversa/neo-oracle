import { useState, useEffect } from 'react';

interface TypingEffectProps {
    text: string;
    typingSpeed?: number;
    className?: string;
    style?: React.CSSProperties;
    onComplete?: () => void;
}

/**
 * Componente que mostra um efeito de digitação semelhante ao ChatGPT
 */
export default function TypingEffect({
    text,
    typingSpeed = 30,
    className = '',
    style = {},
    onComplete
}: TypingEffectProps) {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Se o texto mudar, começar digitação novamente
        setCurrentIndex(0);
        setDisplayText('');
        setIsComplete(false);
    }, [text]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, typingSpeed);

            return () => clearTimeout(timeout);
        } else if (!isComplete) {
            setIsComplete(true);
            onComplete?.();
        }
    }, [currentIndex, text, typingSpeed, isComplete, onComplete]);

    return (
        <span
            className={className}
            style={{
                ...style,
                display: 'inline-block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
            }}
        >
            {displayText}
            {!isComplete && (
                <span
                    style={{
                        display: 'inline-block',
                        width: '2px',
                        height: '14px',
                        backgroundColor: 'currentColor',
                        marginLeft: '1px',
                        verticalAlign: 'middle',
                        animation: 'blink 1s infinite'
                    }}
                />
            )}
        </span>
    );
}