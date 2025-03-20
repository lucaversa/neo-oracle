// src/services/vectorStoreService.ts

import { CreateVectorStoreRequest, VectorStore, VectorStoreFile } from "@/types/admin";

// Base URL para as requisições de API
const API_BASE_URL = '/api/admin';

// Funções existentes para gerenciamento de vector stores
export async function listVectorStores(): Promise<VectorStore[]> {
    try {
        console.log('[SERVICE] Buscando lista de vector stores');

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

        const data = await response.json();
        console.log('[SERVICE] Resposta da API:', data);

        // Buscar dados complementares do Supabase
        // Implementamos um novo endpoint para isso ou modificamos nosso app para buscar direto do Supabase
        try {
            // Fazendo um novo request para buscar dados do banco
            const dbResponse = await fetch('/api/admin/vector-stores-db', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (dbResponse.ok) {
                const dbData = await dbResponse.json();
                console.log('[SERVICE] Dados complementares do banco:', dbData);

                // Criar um mapa de vector stores do banco pelo ID
                const dbVectorStores = new Map();
                if (dbData.data && Array.isArray(dbData.data)) {
                    dbData.data.forEach((item: any) => {
                        dbVectorStores.set(item.vector_store_id, item);
                    });
                }

                // Converter resposta da OpenAI para o formato da aplicação, mas usando dados do banco quando disponíveis
                const vectorStores = data.data.map((item: any) => {
                    const dbItem = dbVectorStores.get(item.id);

                    return {
                        vector_store_id: item.id,
                        name: item.name,
                        description: dbItem?.description || '',
                        created_at: new Date(item.created_at * 1000).toISOString(),
                        updated_at: new Date(item.last_active_at * 1000).toISOString(),
                        is_active: dbItem?.is_active !== undefined ? dbItem.is_active : (item.status === 'completed'),
                        is_searchable: dbItem?.is_searchable !== undefined ? dbItem.is_searchable : true,
                        is_default: dbItem?.is_default || false, // Adicionando suporte ao campo is_default
                        created_by: dbItem?.created_by || null
                    };
                });

                console.log('[SERVICE] Vector stores processadas com dados do banco:', vectorStores);
                return vectorStores;
            }
        } catch (dbError) {
            console.warn('[SERVICE] Erro ao buscar dados complementares:', dbError);
            // Continuar com os dados da API OpenAI
        }

        // Fallback: Usar apenas os dados da OpenAI se não conseguir dados do banco
        const vectorStores = data.data.map((item: any) => ({
            vector_store_id: item.id,
            name: item.name,
            description: '',
            created_at: new Date(item.created_at * 1000).toISOString(),
            updated_at: new Date(item.last_active_at * 1000).toISOString(),
            is_active: item.status === 'completed',
            is_searchable: true, // Assumindo que todas são pesquisáveis por padrão
            is_default: false // Assumindo que nenhuma é padrão por default
        }));

        return vectorStores;
    } catch (error) {
        console.error('[SERVICE] Error listing vector stores:', error);
        throw error;
    }
}

// Nova função para obter apenas vector stores pesquisáveis
export async function getSearchableVectorStores(): Promise<VectorStore[]> {
    try {
        console.log('[SERVICE] Buscando vector stores pesquisáveis');

        const response = await fetch(`${API_BASE_URL}/vector-stores-db/searchable`, {
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
        console.log('[SERVICE] Vector stores pesquisáveis:', data);

        return data as VectorStore[];
    } catch (error) {
        console.error('[SERVICE] Error getting searchable vector stores:', error);
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

        const data = await response.json();

        // Se a resposta já estiver no formato esperado (mesclando dados do Supabase)
        if (data.vector_store_id) {
            return data as VectorStore;
        }

        // Caso contrário, converter resposta da OpenAI para o formato da aplicação
        const vectorStore: VectorStore = {
            vector_store_id: data.id,
            name: data.name,
            description: data.description || '',
            created_at: new Date(data.created_at * 1000).toISOString(),
            updated_at: new Date(data.last_active_at * 1000).toISOString(),
            is_active: data.status === 'completed',
            is_searchable: data.is_searchable !== undefined ? data.is_searchable : true,
            is_default: data.is_default || false
        };

        return vectorStore;
    } catch (error) {
        console.error('Error getting vector store:', error);
        throw error;
    }
}

export async function createVectorStore(data: CreateVectorStoreRequest, userId: string): Promise<VectorStore> {
    try {
        console.log('[SERVICE] Criando vector store com dados:', { ...data, created_by: userId });

        const response = await fetch(`${API_BASE_URL}/vector-stores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...data,
                created_by: userId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('[SERVICE] Resposta da criação:', responseData);

        // Se os dados já estiverem no formato esperado (incluindo os dados do Supabase)
        if (responseData.vector_store_id) {
            return responseData as VectorStore;
        }

        // Caso contrário, converter resposta para o formato da aplicação
        const vectorStore: VectorStore = {
            vector_store_id: responseData.id,
            name: responseData.name,
            description: data.description || '',
            created_at: responseData.created_at ? new Date(responseData.created_at * 1000).toISOString() : new Date().toISOString(),
            updated_at: responseData.updated_at || new Date().toISOString(),
            is_active: responseData.status === 'completed' || true,
            is_searchable: data.is_searchable !== false,
            is_default: data.is_default || false,
            created_by: userId
        };

        return vectorStore;
    } catch (error) {
        console.error('[SERVICE] Error creating vector store:', error);
        throw error;
    }
}

export async function updateVectorStore(id: string, data: Partial<VectorStore>): Promise<VectorStore> {
    try {
        console.log('[SERVICE] Atualizando vector store:', id, 'com dados:', data);

        // Usar PATCH para atualizar parcialmente
        const response = await fetch(`${API_BASE_URL}/vector-stores/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[SERVICE] Erro na resposta da API:', errorData);
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const updatedData = await response.json();
        console.log('[SERVICE] Resposta da atualização:', updatedData);

        return updatedData as VectorStore;
    } catch (error) {
        console.error('[SERVICE] Erro ao atualizar vector store:', error);
        throw error;
    }
}

// Nova função para definir uma vector store como padrão
export async function setDefaultVectorStore(id: string): Promise<VectorStore> {
    try {
        console.log('[SERVICE] Definindo vector store como padrão:', id);

        // Usar a função de atualização existente para definir is_default como true
        return await updateVectorStore(id, { is_default: true });
    } catch (error) {
        console.error('[SERVICE] Erro ao definir vector store padrão:', error);
        throw error;
    }
}

export async function deleteVectorStore(id: string): Promise<void> {
    try {
        console.log(`[SERVICE] Iniciando exclusão da Vector Store ${id}...`);

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

        const result = await response.json();
        console.log('[SERVICE] Resultado da exclusão:', result);
    } catch (error) {
        console.error('[SERVICE] Error deleting vector store:', error);
        throw error;
    }
}

// Listar arquivos de uma vector store
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