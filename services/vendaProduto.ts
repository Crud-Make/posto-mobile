import { supabase } from '../lib/supabase';

export interface VendaProduto {
    id: number;
    frentista_id: number;
    produto_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    data: string;
    fechamento_frentista_id?: number;
    Produto?: { nome: string };
}

interface CreateVendaProdutoInput {
    frentista_id: number;
    produto_id: number;
    quantidade: number;
    valor_unitario: number;
    posto_id: number;
}

export const vendaProdutoService = {
    async getByFrentistaToday(frentistaId: number): Promise<VendaProduto[]> {
        const today = new Date().toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from('VendaProduto')
            .select('*, Produto (nome)')
            .eq('frentista_id', frentistaId)
            .eq('data', today)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao buscar vendas de hoje:', error);
            return [];
        }

        return data || [];
    },

    async create(input: CreateVendaProdutoInput): Promise<VendaProduto | null> {
        const valor_total = input.quantidade * input.valor_unitario;

        const { data, error } = await supabase
            .from('VendaProduto')
            .insert({
                frentista_id: input.frentista_id,
                produto_id: input.produto_id,
                quantidade: input.quantidade,
                valor_unitario: input.valor_unitario,
                valor_total,
                posto_id: input.posto_id,
                data: new Date().toISOString(),
            })
            .select('*, Produto (nome)')
            .single();

        if (error) {
            console.error('Erro ao criar venda de produto:', error);
            return null;
        }

        return data;
    },
};

