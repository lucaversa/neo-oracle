import { ChatMessage } from '@/types/chat';

interface ChatBubbleProps {
    message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
    const isUser = message.type === 'human';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div
                className={`
          max-w-[80%] rounded-lg px-4 py-2 
          ${isUser
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}
        `}
            >
                <div className="mb-1 whitespace-pre-wrap">{message.content}</div>
            </div>
        </div>
    );
}