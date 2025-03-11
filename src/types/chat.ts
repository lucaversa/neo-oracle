export interface ChatMessage {
    type: 'human' | 'ai';
    content: string;
}

export interface ChatHistoryEntry {
    id: number;
    session_id: string;
    message: ChatMessage;
}