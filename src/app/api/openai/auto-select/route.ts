// src/app/api/openai/auto-select/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        console.log('Auto-select API called');

        // Extract data from the request
        const { query } = await request.json();
        console.log('Query received:', query?.substring(0, 100));

        if (!query) {
            console.warn('No query provided');
            return NextResponse.json(
                { error: 'Consulta não fornecida' },
                { status: 400 }
            );
        }

        // Fetch searchable vector stores
        const { data: stores, error } = await supabase
            .from('vector_stores')
            .select('vector_store_id, name, description')
            .eq('is_active', true)
            .eq('is_searchable', true);

        if (error) {
            console.error('Error fetching vector stores:', error);
            return NextResponse.json(
                { error: 'Falha ao buscar vector stores' },
                { status: 500 }
            );
        }

        // Check if we have available vector stores
        if (!stores || stores.length === 0) {
            console.warn('No vector stores available');
            return NextResponse.json(
                { error: 'Nenhuma vector store disponível' },
                { status: 404 }
            );
        }

        console.log(`Found ${stores.length} searchable vector stores:`);
        stores.forEach(store => {
            console.log(`- ${store.name} (${store.vector_store_id}): ${store.description?.substring(0, 50) || 'No description'}`);
        });

        // If there's only one vector store, return it directly
        if (stores.length === 1) {
            console.log('Only one vector store available, returning it directly:', stores[0].vector_store_id);
            return NextResponse.json({
                vector_store_id: stores[0].vector_store_id
            });
        }

        // Add a simple numbering for easier selection by the AI
        const storesWithNumbers = stores.map((store, index) => ({
            ...store,
            number: index + 1
        }));

        // Prepare a more simplified prompt for the AI
        const storesDescription = storesWithNumbers.map(store => `
        OPÇÃO ${store.number}:
        ID: ${store.vector_store_id}
        Nome: ${store.name}
        Descrição: ${store.description || 'Sem descrição'}
        `).join('\n');

        const userPrompt = `
        PERGUNTA DO USUÁRIO:
        "${query}"
        
        BASES DE CONHECIMENTO DISPONÍVEIS:
        ${storesDescription}
        
        Baseado na pergunta do usuário, qual das bases de conhecimento acima é a mais adequada?
        Responda APENAS com o NÚMERO da opção escolhida (1 ou 2, etc.) sem qualquer texto adicional.
        `;

        console.log('Calling OpenAI to select the most appropriate vector store');

        // Call OpenAI using the Responses API with a simpler prompt
        const response = await openai.responses.create({
            model: "gpt-4.1",
            input: userPrompt,
            instructions: "Você deve selecionar a base de conhecimento mais adequada para a pergunta do usuário. Responda APENAS com o NÚMERO da opção escolhida (1, 2, etc.), sem explicações ou texto adicional."
        });

        // Extract text from response
        const selectedText = response.text || "";
        const cleanedText = selectedText.toString().trim();

        console.log('OpenAI raw response:', selectedText);
        console.log('Cleaned response text:', cleanedText);

        // First try to get a direct number match (1, 2, etc.)
        const numberMatch = cleanedText.match(/\b([1-9])\b/);
        if (numberMatch) {
            const selectedNumber = parseInt(numberMatch[1], 10);

            // Check if the number is valid (within range of options)
            if (selectedNumber > 0 && selectedNumber <= storesWithNumbers.length) {
                const selectedStore = storesWithNumbers.find(store => store.number === selectedNumber);
                if (selectedStore) {
                    console.log(`Found store by number ${selectedNumber}: ${selectedStore.vector_store_id}`);
                    return NextResponse.json({
                        vector_store_id: selectedStore.vector_store_id,
                        matched: 'number',
                        selectedNumber
                    });
                }
            }
        }

        // If no number match, try to match the store directly by ID
        for (const store of stores) {
            if (cleanedText.includes(store.vector_store_id)) {
                console.log(`Found store by ID match: ${store.vector_store_id}`);
                return NextResponse.json({
                    vector_store_id: store.vector_store_id,
                    matched: 'id'
                });
            }
        }

        // If still no match, try to match by name
        for (const store of stores) {
            if (store.name && cleanedText.toLowerCase().includes(store.name.toLowerCase())) {
                console.log(`Found store by name match: ${store.vector_store_id}`);
                return NextResponse.json({
                    vector_store_id: store.vector_store_id,
                    matched: 'name'
                });
            }
        }

        // If we get here, use a more intelligent fallback:
        // 1. Look for any numbers in the response
        const allNumbers = cleanedText.match(/\d+/g);
        if (allNumbers) {
            for (const numStr of allNumbers) {
                const num = parseInt(numStr, 10);
                if (num > 0 && num <= stores.length) {
                    const matchedStore = stores[num - 1];
                    console.log(`Found store using number extraction: ${matchedStore.vector_store_id}`);
                    return NextResponse.json({
                        vector_store_id: matchedStore.vector_store_id,
                        matched: 'extracted_number',
                        number: num
                    });
                }
            }
        }

        // 2. Check for keywords that might help determine which store is better
        // This is a very basic keyword matching approach that you can expand with domain-specific logic
        const query_lower = query.toLowerCase();
        let bestScore = -1;
        let bestStore = null;

        for (const store of stores) {
            let score = 0;
            const description = (store.description || '').toLowerCase();
            const name = (store.name || '').toLowerCase();

            // Check if query keywords match description or name
            const keywords = query_lower.split(/\s+/);
            for (const word of keywords) {
                if (word.length > 3) { // Only consider meaningful words
                    if (description.includes(word)) score += 2;
                    if (name.includes(word)) score += 3;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestStore = store;
            }
        }

        if (bestStore && bestScore > 0) {
            console.log(`Selected store by keyword matching with score ${bestScore}: ${bestStore.vector_store_id}`);
            return NextResponse.json({
                vector_store_id: bestStore.vector_store_id,
                matched: 'keywords',
                score: bestScore
            });
        }

        // Last resort: default to first store
        console.log(`No matching criteria found, using first store as default: ${stores[0].vector_store_id}`);
        return NextResponse.json({
            vector_store_id: stores[0].vector_store_id,
            fallback: true
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}