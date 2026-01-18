import { supabase } from '../lib/supabase';

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
    posto_id?: number;
}

/**
 * Busca o perfil de usuário na tabela Usuario
 */
export const usuarioService = {
    async getByEmail(email: string): Promise<Usuario | null> {
        const { data, error } = await supabase
            .from('Usuario')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }

        return data;
    },
};
