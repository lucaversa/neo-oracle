// Verificação e correção dos tipos de chat
export interface ChatMessage {
    type: 'human' | 'ai';
    content: string;
}

export interface ChatHistoryEntry {
    id: number;
    session_id: string;
    message: ChatMessage;
    created_at?: string;
}