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

export const listVectorStoreFiles = async (
    vectorStoreId: string,
    page: number = 1,
    limit: number = 10,
    cursor?: string
): Promise<VectorStoreFile[]> => {
    try {
        // Construir os parâmetros de URL
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (cursor) {
            params.append('after', cursor);
        }

        // Fazer a requisição com os parâmetros
        const url = `/api/admin/vector-stores/${vectorStoreId}/files?${params.toString()}`;
        console.log('Requesting files with URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Files API response data:', responseData);

        let files: VectorStoreFile[] = [];

        if (responseData && responseData.data && Array.isArray(responseData.data)) {
            files = responseData.data.map((file: any) => {
                const fileData = file.object ? file : file;

                return {
                    id: fileData.id || '',
                    vector_store_id: vectorStoreId,
                    filename: fileData.filename || fileData.name ||
                        (fileData.id ? fileData.id.replace(/^file-/, '') : 'unknown'),
                    status: fileData.status || 'processed',
                    bytes: typeof fileData.bytes === 'number' ? fileData.bytes :
                        (typeof fileData.size === 'number' ? fileData.size : 0),
                    created_at: fileData.created_at || Math.floor(Date.now() / 1000),
                    purpose: fileData.purpose || 'assistants',
                    object: fileData.object || 'file'
                };
            });
        }

        // Adicionar metadados de paginação aos resultados
        Object.defineProperty(files, 'metadata', {
            enumerable: false,
            value: {
                has_more: responseData.has_more || false,
                last_id: responseData.last_id || null,
                first_id: responseData.first_id || null
            }
        });

        return files;
    } catch (error) {
        console.error('Error listing vector store files:', error);
        throw error;
    }
};

export const uploadFileToVectorStore = async (vectorStoreId: string, file: File): Promise<VectorStoreFile> => {
    try {
        console.log(`Iniciando upload para Vector Store ${vectorStoreId} - Arquivo: ${file.name}`);

        // ETAPA 1: Upload do arquivo para obter file_id
        const formData = new FormData();
        formData.append('file', file);
        // IMPORTANTE: Uso correto do purpose
        formData.append('purpose', 'assistants');

        const uploadResponse = await fetch('/api/admin/files', {
            method: 'POST',
            body: formData,
        });

        console.log(`Resposta do upload - status: ${uploadResponse.status}`);

        // Tratamento de erro melhorado
        if (!uploadResponse.ok) {
            let errorMessage = `Erro no upload do arquivo (${uploadResponse.status}): ${uploadResponse.statusText}`;
            try {
                const errorData = await uploadResponse.json();
                console.error('Detalhes do erro:', errorData);
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (parseError) {
                const errorText = await uploadResponse.text();
                console.error('Resposta bruta de erro:', errorText);
                errorMessage = `Erro não estruturado: ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMessage);
        }

        const uploadedFile = await uploadResponse.json();
        console.log('Resposta de upload bem-sucedida:', uploadedFile);

        // ETAPA 2: Associar arquivo à Vector Store
        if (!uploadedFile.id) {
            throw new Error('ID do arquivo não foi retornado pela API');
        }

        const fileId = uploadedFile.id;
        console.log(`Associando arquivo ${fileId} à Vector Store ${vectorStoreId}`);

        const associateResponse = await fetch(`/api/admin/vector-stores/${vectorStoreId}/files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: fileId,
                chunking_strategy: {
                    type: "auto"
                }
            }),
        });

        if (!associateResponse.ok) {
            let errorMessage = `Erro ao associar arquivo à Vector Store (${associateResponse.status})`;
            try {
                const errorData = await associateResponse.json();
                console.error('Detalhes do erro de associação:', errorData);
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (parseError) {
                const errorText = await associateResponse.text();
                console.error('Resposta bruta de erro de associação:', errorText);
                errorMessage = `Erro não estruturado: ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMessage);
        }

        const associatedFile = await associateResponse.json();
        console.log('Arquivo associado com sucesso:', associatedFile);

        return {
            id: fileId,
            vector_store_id: vectorStoreId,
            filename: file.name,
            bytes: file.size,
            status: 'processing',
            created_at: Math.floor(Date.now() / 1000),
            purpose: 'assistants' // Adicionando a propriedade purpose obrigatória
        };

    } catch (error) {
        console.error('Erro completo no processo de upload:', error);
        throw error;
    }
};

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

export const getFileDetails = async (fileId: string): Promise<any> => {
    try {
        const response = await fetch(`/api/admin/files/${fileId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch file details: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting file details:', error);
        throw error;
    }
};

// Cache local para evitar múltiplas requisições ao mesmo arquivo
const fileCache = new Map<string, any>();

// Função para obter detalhes do arquivo de forma otimizada
export const getFileInfoOptimized = async (fileId: string): Promise<any> => {
    // Verificar cache primeiro
    if (fileCache.has(fileId)) {
        return fileCache.get(fileId);
    }

    try {
        const response = await fetch(`/api/admin/files/${fileId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch file details: ${response.statusText}`);
        }

        const data = await response.json();

        // Guardar no cache
        fileCache.set(fileId, data);

        return data;
    } catch (error) {
        console.error(`Error getting file details for ${fileId}:`, error);
        // Retornar objeto vazio em caso de erro para não quebrar o processamento
        return {};
    }
};

// Função para processar arquivos em lotes para evitar rate limit
export const processFilesInBatches = async (
    fileIds: string[],
    batchSize: number = 5,
    delayMs: number = 1000
): Promise<Record<string, any>> => {
    const results: Record<string, any> = {};

    // Processar apenas IDs que não estão em cache
    const uncachedIds = fileIds.filter(id => !fileCache.has(id));

    // Processar em lotes
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);

        // Processar batch em paralelo
        await Promise.all(batch.map(async fileId => {
            try {
                const info = await getFileInfoOptimized(fileId);
                results[fileId] = info;
            } catch (e) {
                console.error(`Error processing file ${fileId}:`, e);
            }
        }));

        // Esperar entre batches para evitar rate limit
        if (i + batchSize < uncachedIds.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // Adicionar resultados do cache
    fileIds.forEach(id => {
        if (fileCache.has(id) && !results[id]) {
            results[id] = fileCache.get(id);
        }
    });

    return results;
};