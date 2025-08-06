// src/app/api/admin/files/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET endpoint para listar arquivos
export async function GET(request: NextRequest) {
    try {
        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        // Obter parâmetros de consulta
        const searchParams = request.nextUrl.searchParams;
        const purpose = searchParams.get('purpose') || 'vector_store';
        const limit = searchParams.get('limit') || '100';

        console.log('Enviando requisição GET para listar arquivos OpenAI');

        // Chamar API da OpenAI para listar arquivos
        const openaiResponse = await fetch(
            `https://api.openai.com/v1/files?purpose=${purpose}&limit=${limit}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );

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
        console.error('Erro ao listar arquivos:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Obter chave da API da OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'API key não configurada' }, { status: 500 });
        }

        // Processar os dados do formulário
        const formData = await request.formData();
        const file = formData.get('file') as File;

        // IMPORTANTE: O purpose correto é "assistants" em vez de "vector_store"
        const purpose = formData.get('purpose') || 'assistants';

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        console.log('Processando upload de arquivo:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            purpose
        });

        // Verificar tipo de arquivo
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'];
        const fileType = file.type;

        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json({
                error: 'Tipo de arquivo não suportado',
                details: 'São aceitos apenas arquivos PDF, TXT, DOC, DOCX ou JSON'
            }, { status: 400 });
        }

        // Obter dados do arquivo como ArrayBuffer
        const fileArrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(fileArrayBuffer);

        // Criar um novo FormData para a requisição da API OpenAI
        const openaiFormData = new FormData();
        const blob = new Blob([fileBuffer], { type: file.type });
        openaiFormData.append('file', blob, file.name);
        openaiFormData.append('purpose', purpose as string);

        console.log('Enviando arquivo para a API OpenAI com purpose:', purpose);

        // IMPORTANTE: Headers específicos para a API
        const openaiResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'OpenAI-Beta': 'assistants=v2'
                // Não incluir Content-Type, deixar o fetch configurar automaticamente para multipart/form-data
            },
            body: openaiFormData
        });

        const responseText = await openaiResponse.text();
        console.log('Headers de resposta:', Object.fromEntries(openaiResponse.headers.entries()));
        console.log('Resposta bruta:', responseText);

        if (!openaiResponse.ok) {
            return NextResponse.json(
                {
                    error: `Erro na API da OpenAI: ${openaiResponse.statusText}`,
                    details: responseText
                },
                { status: openaiResponse.status }
            );
        }

        // Parsear a resposta de texto para JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            return NextResponse.json(
                { error: 'Erro ao analisar resposta da API OpenAI', details: responseText },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Erro ao fazer upload de arquivo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar requisição', details: error instanceof Error ? error.message : 'unknown error' },
            { status: 500 }
        );
    }
}