// src/types/admin.ts (Adição aos tipos existentes)

// Interfaces existentes
export interface VectorStore {
    id?: number;
    vector_store_id: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    is_searchable: boolean;
    created_by?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface CreateVectorStoreRequest {
    name: string;
    description?: string;
    is_searchable?: boolean;
}

// Novas interfaces para gestão de arquivos
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
    expires_after: string | null;
    expires_at: string | null;
    last_active_at: number;
    metadata: Record<string, any>;
}

export interface OpenAIVectorStoreListResponse {
    object: string;
    data: OpenAIVectorStoreResponse[];
    first_id: string;
    last_id: string;
    has_more: boolean;
}

export interface OpenAIFile {
    id: string;
    object: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
    status: 'processed' | 'processing' | 'error';
    status_details?: string;
}

export interface OpenAIFileListResponse {
    data: OpenAIFile[];
    object: string;
    has_more: boolean;
}

export interface VectorStoreFile {
    id: string;
    filename: string;
    bytes: number;
    created_at: number;
    status: string;
    purpose: string;
    vector_store_id: string;
}

export interface CreateVectorStoreFileResponse {
    id: string;
    object: string;
    created_at: number;
    status: string;
    vector_store_id: string;
    file_id: string;
}

export interface DeleteVectorStoreFileResponse {
    id: string;
    object: string;
    deleted: boolean;
}