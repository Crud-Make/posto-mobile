import { supabase } from '../lib/supabase';

export interface Frentista {
    id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    data_admissao: string | null;
    ativo: boolean;
    user_id: string | null;
    turno_id?: number | null;
    posto_id: number;
}

/**
 * Busca o frentista associado ao usuário logado
 */
export const frentistaService = {
    async getByUserId(userId: string): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true)
            .single();

        if (error) {
            console.error('Error fetching frentista:', error);
            return null;
        }

        return data;
    },

    async update(id: number, updates: Partial<Frentista>): Promise<Frentista | null> {
        const { data, error } = await supabase
            .from('Frentista')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating frentista:', error);
            return null;
        }
        return data;
    },
    async getAllByPosto(postoId: number): Promise<Frentista[]> {
        const { data, error } = await supabase
            .from('Frentista')
            .select('*')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('Error fetching frentistas by posto:', error);
            return [];
        }

        return data || [];
    },
};
