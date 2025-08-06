// src/app/api/admin/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

// Função para converter CSV em JSON
function convertCsvToJson(csvContent: string): string {
    try {
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => {
                // Tratar o cabeçalho especial "Convênios EXCLUÍDOS/NÃO ACEITOS"
                if (header.includes('EXCLUÍDOS') || header.includes('NÃO ACEITOS')) {
                    return 'Convênios EXCLUÍDOS';
                }
                return header.trim();
            }
        });

        if (parsed.errors.length > 0) {
            console.error('Erros no parsing do CSV:', parsed.errors);
            throw new Error('Erro ao processar arquivo CSV');
        }

        // Transformar os dados para o formato desejado
        const transformedData = parsed.data.map((row: any) => {
            const transformedRow: any = {};
            
            for (const [key, value] of Object.entries(row)) {
                if (key === 'Convênios EXCLUÍDOS') {
                    // Criar objeto aninhado para convênios
                    transformedRow['Convênios EXCLUÍDOS'] = {
                        'NÃO ACEITOS': value as string
                    };
                } else {
                    transformedRow[key] = value;
                }
            }
            
            return transformedRow;
        });

        return JSON.stringify(transformedData, null, 2);
    } catch (error) {
        console.error('Erro na conversão CSV para JSON:', error);
        throw new Error('Erro ao converter CSV para JSON');
    }
}

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
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json', 'text/csv'];
        const fileType = file.type;

        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json({
                error: 'Tipo de arquivo não suportado',
                details: 'São aceitos apenas arquivos PDF, TXT, DOC, DOCX, JSON ou CSV'
            }, { status: 400 });
        }

        // Obter dados do arquivo como ArrayBuffer
        const fileArrayBuffer = await file.arrayBuffer();
        let fileBuffer = Buffer.from(fileArrayBuffer);
        let finalFileName = file.name;
        let finalFileType = file.type;

        // Se for CSV, converter para JSON
        if (fileType === 'text/csv') {
            try {
                console.log('Detectado arquivo CSV, convertendo para JSON...');
                const csvContent = fileBuffer.toString('utf-8');
                const jsonContent = convertCsvToJson(csvContent);
                
                // Criar novo buffer com conteúdo JSON
                fileBuffer = Buffer.from(jsonContent, 'utf-8');
                finalFileName = file.name.replace(/\.csv$/i, '.json');
                finalFileType = 'application/json';
                
                console.log(`Arquivo CSV convertido: ${file.name} → ${finalFileName}`);
            } catch (conversionError) {
                console.error('Erro na conversão de CSV para JSON:', conversionError);
                return NextResponse.json({
                    error: 'Erro ao processar arquivo CSV',
                    details: conversionError instanceof Error ? conversionError.message : 'Erro desconhecido na conversão'
                }, { status: 400 });
            }
        }

        // Criar um novo FormData para a requisição da API OpenAI
        const openaiFormData = new FormData();
        const blob = new Blob([fileBuffer], { type: finalFileType });
        openaiFormData.append('file', blob, finalFileName);
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