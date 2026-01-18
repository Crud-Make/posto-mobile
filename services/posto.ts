import { supabase } from '../lib/supabase';

export interface Posto {
    id: number;
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    email: string | null;
    ativo: boolean;
}

/**
 * Serviço para gerenciar postos
 */
export const postoService = {
    async getAll(): Promise<Posto[]> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('Error fetching postos:', error);
            return [];
        }
        return data || [];
    },

    async getById(id: number): Promise<Posto | null> {
        const { data, error } = await supabase
            .from('Posto')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching posto:', error);
            return null;
        }
        return data;
    }
};
