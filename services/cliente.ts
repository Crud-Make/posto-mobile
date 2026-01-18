import { supabase } from '../lib/supabase';

export interface Cliente {
    id: number;
    nome: string;
    documento?: string;
    posto_id?: number;
    ativo: boolean;
    bloqueado?: boolean;
}

/**
 * Serviço para gerenciar clientes
 */
export const clienteService = {
    async getAll(postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('nome');

        if (error) {
            console.error('Error fetching clientes:', error);
            return [];
        }

        return data || [];
    },

    async search(text: string, postoId?: number): Promise<Cliente[]> {
        let query = supabase
            .from('Cliente')
            .select('*')
            .eq('ativo', true)
            .ilike('nome', `%${text}%`);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.limit(20);

        if (error) {
            console.error('Error searching clientes:', error);
            return [];
        }

        return data || [];
    }
};
