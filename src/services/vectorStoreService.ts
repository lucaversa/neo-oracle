// src/services/vectorStoreService.ts (Adição de funções para gerenciamento de arquivos)

import { CreateVectorStoreRequest, VectorStore, OpenAIVectorStoreResponse, OpenAIVectorStoreListResponse, OpenAIFile, OpenAIFileListResponse, VectorStoreFile, CreateVectorStoreFileResponse } from "@/types/admin";

// Base URL para as requisições de API
const API_BASE_URL = '/api/admin';

// Funções existentes para gerenciamento de vector stores
export async function listVectorStores(): Promise<VectorStore[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/vector-stores`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const data: OpenAIVectorStoreListResponse = await response.json();

        // Converter resposta da OpenAI para o formato da aplicação
        const vectorStores = data.data.map(item => ({
            vector_store_id: item.id,
            name: item.name,
            description: '',
            created_at: new Date(item.created_at * 1000).toISOString(),
            updated_at: new Date(item.last_active_at * 1000).toISOString(),
            is_active: item.status === 'completed',
            is_searchable: true // Assumindo que todas são pesquisáveis por padrão
        }));

        return vectorStores;
    } catch (error) {
        console.error('Error listing vector stores:', error);
        throw error;
    }
}

export async function getVectorStore(id: string): Promise<VectorStore> {
    try {
        const response = await fetch(`${API_BASE_URL}/vector-stores/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const data: OpenAIVectorStoreResponse = await response.json();

        // Converter resposta da OpenAI para o formato da aplicação
        const vectorStore: VectorStore = {
            vector_store_id: data.id,
            name: data.name,
            description: '',
            created_at: new Date(data.created_at * 1000).toISOString(),
            updated_at: new Date(data.last_active_at * 1000).toISOString(),
            is_active: data.status === 'completed',
            is_searchable: true // Assumindo que é pesquisável por padrão
        };

        return vectorStore;
    } catch (error) {
        console.error('Error getting vector store:', error);
        throw error;
    }
}

export async function createVectorStore(data: CreateVectorStoreRequest, userId: string): Promise<VectorStore> {
    try {
        const response = await fetch(`${API_BASE_URL}/vector-stores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const responseData: OpenAIVectorStoreResponse = await response.json();

        // Converter resposta da OpenAI para o formato da aplicação
        const vectorStore: VectorStore = {
            vector_store_id: responseData.id,
            name: responseData.name,
            description: data.description || '',
            created_at: new Date(responseData.created_at * 1000).toISOString(),
            updated_at: new Date(responseData.created_at * 1000).toISOString(),
            is_active: responseData.status === 'completed',
            is_searchable: data.is_searchable !== false,
            created_by: userId
        };

        return vectorStore;
    } catch (error) {
        console.error('Error creating vector store:', error);
        throw error;
    }
}

export async function updateVectorStore(id: string, data: Partial<VectorStore>): Promise<VectorStore> {
    try {
        // Esta é uma função local, já que a API da OpenAI não suporta atualização direta
        // Só atualizamos no banco de dados local no Supabase

        const response = await fetch(`${API_BASE_URL}/vector-stores/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const responseData: OpenAIVectorStoreResponse = await response.json();

        // Converter resposta da OpenAI para o formato da aplicação e aplicar atualizações
        const vectorStore: VectorStore = {
            vector_store_id: responseData.id,
            name: responseData.name,
            description: data.description || '',
            created_at: new Date(responseData.created_at * 1000).toISOString(),
            updated_at: new Date().toISOString(), // Data atual para a atualização
            is_active: responseData.status === 'completed',
            is_searchable: data.is_searchable !== undefined ? data.is_searchable : true
        };

        return vectorStore;
    } catch (error) {
        console.error('Error updating vector store:', error);
        throw error;
    }
}

export async function deleteVectorStore(id: string): Promise<void> {
    try {
        console.log(`Iniciando exclusão da Vector Store ${id} e seus arquivos...`);

        // Primeiro, obter todos os arquivos da vector store
        const files = await listVectorStoreFiles(id);
        console.log(`Encontrados ${files.length} arquivos para excluir`);

        // Excluir cada arquivo da vector store e depois excluir o arquivo completamente
        for (const file of files) {
            console.log(`Removendo arquivo ${file.id} (${file.filename}) da Vector Store`);
            await deleteFileFromVectorStore(id, file.id);

            // Excluir também o arquivo completamente para liberar espaço
            console.log(`Excluindo arquivo ${file.id} completamente`);
            await deleteFile(file.id);
        }

        // Agora excluir a vector store
        console.log(`Excluindo a Vector Store ${id}`);
        const response = await fetch(`${API_BASE_URL}/vector-stores/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        console.log(`Vector Store ${id} excluída com sucesso!`);
    } catch (error) {
        console.error('Error deleting vector store:', error);
        throw error;
    }
}

// Novas funções para gerenciamento de arquivos

// Listar arquivos de uma vector store
export async function listVectorStoreFiles(vectorStoreId: string): Promise<VectorStoreFile[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/vector-stores/${vectorStoreId}/files`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error listing vector store files:', error);
        throw error;
    }
}

// Upload de arquivo para uma vector store
export async function uploadFileToVectorStore(
    vectorStoreId: string,
    file: File,
    chunkingStrategy?: 'auto' | 'scatter' | { chunk_size: number, chunk_overlap: number }
): Promise<VectorStoreFile> {
    try {
        // Primeiro, fazer upload do arquivo
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'vector_store');

        const uploadResponse = await fetch(`${API_BASE_URL}/files`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || `Error uploading file: ${uploadResponse.status}`);
        }

        const uploadedFile = await uploadResponse.json();
        const fileId = uploadedFile.id;

        // Depois, vincular o arquivo à vector store
        const body: any = { file_id: fileId };

        // Adicionar estratégia de chunking se fornecida
        if (chunkingStrategy) {
            body.chunking_strategy = chunkingStrategy;
        }

        const attachResponse = await fetch(`${API_BASE_URL}/vector-stores/${vectorStoreId}/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!attachResponse.ok) {
            const errorData = await attachResponse.json();

            // Tentar excluir o arquivo se falhar ao anexá-lo
            try {
                await fetch(`${API_BASE_URL}/files/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (deleteError) {
                console.error('Error deleting orphaned file after attachment failure:', deleteError);
            }

            throw new Error(errorData.error || `Error attaching file: ${attachResponse.status}`);
        }

        const attachedFile: CreateVectorStoreFileResponse = await attachResponse.json();

        // Converter para o formato esperado
        return {
            id: fileId,
            filename: file.name,
            bytes: file.size,
            created_at: Math.floor(Date.now() / 1000),
            status: 'processing',
            purpose: 'vector_store',
            vector_store_id: vectorStoreId
        };
    } catch (error) {
        console.error('Error uploading file to vector store:', error);
        throw error;
    }
}

// Remover arquivo de uma vector store
export async function deleteFileFromVectorStore(
    vectorStoreId: string,
    fileId: string
): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/vector-stores/${vectorStoreId}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error deleting file from vector store:', error);
        throw error;
    }
}

// Excluir arquivo completamente (após removê-lo da vector store)
export async function deleteFile(fileId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

// Obter detalhes de um arquivo
export async function getFileDetails(fileId: string): Promise<OpenAIFile> {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting file details:', error);
        throw error;
    }
}