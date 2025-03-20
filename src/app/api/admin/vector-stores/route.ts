// src/app/api/admin/vector-stores/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API proxy simples para a API da OpenAI
export async function GET() {
    try {
        // Simplificando: removemos a verificação do Supabase
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('Enviando requisição GET para a API OpenAI com a chave:', openaiKey.substring(0, 5) + '...');

        const openaiResponse = await fetch('https://api.openai.com/v1/vector_stores', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            console.error('Erro na resposta da API OpenAI:', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: errorText
            });

            return NextResponse.json(
                { error: `Erro na API da OpenAI: ${openaiResponse.statusText}`, details: errorText },
                { status: openaiResponse.status }
            );
        }

        const data = await openaiResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao listar vector_stores:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Obter dados da requisição
        const requestData = await request.json();
        const userId = requestData.created_by || null;

        if (!requestData.name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
        }

        // Fazer requisição para a API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        console.log('[DEBUG-CRITICAL] Criando vector store na OpenAI:', requestData.name);

        const openaiResponse = await fetch('https://api.openai.com/v1/vector_stores', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
                name: requestData.name
            })
        });

        // Obter o corpo da resposta como texto para logging
        const responseText = await openaiResponse.text();

        if (!openaiResponse.ok) {
            console.error('[DEBUG-CRITICAL] Erro na resposta da API OpenAI:', {
                status: openaiResponse.status,
                statusText: openaiResponse.statusText,
                data: responseText
            });

            return NextResponse.json(
                { error: `Erro na API da OpenAI: ${openaiResponse.statusText}`, details: responseText },
                { status: openaiResponse.status }
            );
        }

        // Parse do texto de resposta para JSON
        let openaiData;
        try {
            openaiData = JSON.parse(responseText);
            console.log('[DEBUG-CRITICAL] Vector store criada na OpenAI:', openaiData.id);
        } catch {
            return NextResponse.json(
                { error: 'Erro ao analisar resposta da API OpenAI', details: responseText },
                { status: 500 }
            );
        }

        // Agora, vamos salvar os dados no Supabase
        try {
            // IMPORTANTE: Verifique se o cliente Supabase está sendo importado corretamente
            const { supabase } = await import('@/lib/supabase');

            console.log('[DEBUG-CRITICAL] Cliente Supabase obtido:', !!supabase);
            console.log('[DEBUG-CRITICAL] Inserindo no Supabase:', {
                vector_store_id: openaiData.id,
                name: requestData.name,
                description: requestData.description,
                is_searchable: requestData.is_searchable !== undefined ? requestData.is_searchable : true,
                created_by: userId
            });

            // Teste de conexão Supabase
            try {
                const { data: testData, error: testError } = await supabase.from('vector_stores').select('count').limit(1);
                console.log('[DEBUG-CRITICAL] Teste de conexão Supabase:', {
                    sucesso: !testError,
                    erro: testError,
                    resultado: testData
                });
            } catch (testErr) {
                console.error('[DEBUG-CRITICAL] Erro no teste de conexão:', testErr);
            }

            const { data: insertedData, error: supabaseError } = await supabase
                .from('vector_stores')
                .insert({
                    vector_store_id: openaiData.id,
                    name: requestData.name,
                    description: requestData.description || null,
                    is_active: true, // Por padrão, a vector store é ativa
                    is_searchable: requestData.is_searchable !== undefined ? requestData.is_searchable : true,
                    created_by: userId
                    // Não definimos created_at e updated_at explicitamente, deixamos o Supabase preencher automaticamente
                })
                .select('*')
                .single();

            if (supabaseError) {
                console.error('[DEBUG-CRITICAL] Erro ao salvar no Supabase:', supabaseError);
                return NextResponse.json({
                    ...openaiData,
                    warning: 'Vector store criada na OpenAI, mas não foi possível salvar no banco de dados.',
                    error: supabaseError.message,
                    details: supabaseError,
                    stack: new Error().stack
                });
            }

            console.log('[DEBUG-CRITICAL] Inserção no Supabase bem-sucedida:', insertedData);

            // Retornar a combinação dos dados do OpenAI e do Supabase
            return NextResponse.json({
                ...openaiData,
                ...insertedData,
                success: true
            });
        } catch (dbError) {
            console.error('[DEBUG-CRITICAL] Exceção ao inserir no Supabase:', dbError);
            // Retornar os dados da OpenAI, mesmo com erro no banco
            return NextResponse.json({
                ...openaiData,
                warning: 'Vector store criada na OpenAI, mas não foi possível salvar no banco de dados.',
                error: dbError instanceof Error ? dbError.message : String(dbError),
                stack: dbError instanceof Error ? dbError.stack : null
            });
        }
    } catch (error) {
        console.error('[DEBUG-CRITICAL] Erro geral ao criar vector_store:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error', stack: error instanceof Error ? error.stack : null },
            { status: 500 }
        );
    }
}