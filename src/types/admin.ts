// src/types/admin.ts
export interface AdminUser {
    id: number;
    user_id: string;
    created_at: string;
}

export interface VectorStore {
    vector_store_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    is_searchable: boolean;
    created_at: string;
    updated_at?: string;
}

// Tipo para criação de vector_store
export interface CreateVectorStoreRequest {
    name: string;
    description?: string;
    is_searchable?: boolean;
}

// Resposta da API OpenAI para criação de vector_store
export interface OpenAIVectorStoreResponse {
    id: string;
    object: string;
    created_at: number;
    name: string;
    usage_bytes: number;
    file_counts: {
        in_progress: number;
        completed: number;
        failed: number;
        cancelled: number;
        total: number;
    };
    status: string;
    expires_after: null | string;
    expires_at: null | number;
    last_active_at: number;
    metadata: Record<string, any>;
}

// Listagem de vector_stores da API OpenAI
export interface OpenAIVectorStoreListResponse {
    object: string;
    data: OpenAIVectorStoreResponse[];
    first_id: string;
    last_id: string;
    has_more: boolean;
}