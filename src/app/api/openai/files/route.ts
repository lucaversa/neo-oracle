// src/app/api/openai/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET - Listar arquivos de um vector store
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const vectorStoreId = searchParams.get('vectorStoreId');

        if (!vectorStoreId) {
            return NextResponse.json(
                { error: 'VectorStoreId é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar se o vector store existe
        const { data: vectorStoreData, error: vectorStoreError } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('vector_store_id', vectorStoreId)
            .single();

        if (vectorStoreError || !vectorStoreData) {
            return NextResponse.json(
                { error: 'Vector store não encontrado' },
                { status: 404 }
            );
        }

        // Listar arquivos do vector store na OpenAI
        // Passando o vectorStoreId como string diretamente, não como um objeto
        const result = await openai.vectorStores.files.list(vectorStoreId);

        return NextResponse.json({
            files: result.data,
            // Não acessamos mais a propriedade 'object' que não existe
        });
    } catch (error) {
        console.error('Erro na rota GET files:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * POST - Upload de arquivo e adição a um vector store
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const vectorStoreId = formData.get('vectorStoreId') as string;

        if (!file || !vectorStoreId) {
            return NextResponse.json(
                { error: 'Arquivo e vectorStoreId são obrigatórios' },
                { status: 400 }
            );
        }

        // Verificar se o vector store existe
        const { data: vectorStoreData, error: vectorStoreError } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('vector_store_id', vectorStoreId)
            .single();

        if (vectorStoreError || !vectorStoreData) {
            return NextResponse.json(
                { error: 'Vector store não encontrado' },
                { status: 404 }
            );
        }

        // 1. Upload do arquivo para OpenAI
        const fileUpload = await openai.files.create({
            file,
            purpose: 'assistants',
        });

        // 2. Adicionar arquivo ao vector store - corrigido para passar o ID diretamente
        try {
            await openai.vectorStores.files.create(
                vectorStoreId,  // Primeiro argumento: o ID como string
                { file_id: fileUpload.id }  // Segundo argumento: parâmetros
            );
        } catch (addError) {
            // Se falhar ao adicionar ao vector store, tentar excluir o arquivo
            console.error('Erro ao adicionar arquivo ao vector store:', addError);
            try {
                await openai.files.del(fileUpload.id);
            } catch (deleteError) {
                console.error('Erro ao excluir arquivo após falha:', deleteError);
            }

            throw addError;
        }

        // 3. Salvar referência no Supabase
        const { error: dbError } = await supabase
            .from('files')
            .insert({
                file_id: fileUpload.id,
                vector_store_id: vectorStoreId,
                filename: file.name,
                status: 'processing',
                file_size: file.size,
                mime_type: file.type,
            });

        if (dbError) {
            console.error('Erro ao salvar arquivo no Supabase:', dbError);
            // Continuar mesmo com erro no Supabase, já que o arquivo está na OpenAI
        }

        return NextResponse.json({
            success: true,
            file: fileUpload,
            message: 'Arquivo enviado e adicionado ao vector store com sucesso'
        });
    } catch (error) {
        console.error('Erro na rota POST files:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Remover um arquivo de um vector store
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get('fileId');
        const vectorStoreId = searchParams.get('vectorStoreId');

        if (!fileId || !vectorStoreId) {
            return NextResponse.json(
                { error: 'FileId e vectorStoreId são obrigatórios' },
                { status: 400 }
            );
        }

        // 1. Remover arquivo do vector store - passando os dois parâmetros separados
        await openai.vectorStores.files.del(vectorStoreId, fileId);

        // 2. Atualizar referência no Supabase
        await supabase
            .from('files')
            .update({
                status: 'removed',
                updated_at: new Date().toISOString()
            })
            .eq('file_id', fileId);

        return NextResponse.json({
            success: true,
            message: 'Arquivo removido do vector store com sucesso'
        });
    } catch (error) {
        console.error('Erro na rota DELETE files:', error);
        return NextResponse.json(
            { error: 'Erro ao remover arquivo' },
            { status: 500 }
        );
    }
}