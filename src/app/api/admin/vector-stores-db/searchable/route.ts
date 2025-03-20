// src/app/api/admin/vector-stores-db/searchable/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Fetch vector stores that are both active and searchable
        const { data, error } = await supabase
            .from('vector_stores')
            .select('*')
            .eq('is_active', true)
            .eq('is_searchable', true)
            .order('is_default', { ascending: false }) // Default vector store first
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching searchable vector stores:', error);
            return NextResponse.json(
                { error: 'Failed to fetch searchable vector stores' },
                { status: 500 }
            );
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error in route GET searchable vector stores:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}