// Tipos relacionados ao chat e às mensagens

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

// Nova interface para a tabela user_chat_sessions
export interface UserChatSession {
    id: string;
    session_id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
}

// Interface para informações resumidas da sessão no sidebar
export interface SessionInfo {
    id: string;
    title: string;
    firstMessage?: string;
    isNew?: boolean;
    isDeleted?: boolean;
}