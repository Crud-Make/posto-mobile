import { supabase } from '../lib/supabase';

export interface Produto {
    id: number;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    categoria: string;
    ativo: boolean;
}

export const produtoService = {
    async getAll(postoId?: number): Promise<Produto[]> {
        let query = supabase
            .from('Produto')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }

        return data || [];
    },
};

