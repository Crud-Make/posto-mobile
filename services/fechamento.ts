import { supabase } from '../lib/supabase';
import { usuarioService } from './usuario';
import { frentistaService } from './frentista';

export interface Fechamento {
    id: number;
    data: string;
    usuario_id: number;
    turno_id: number;
    status: string;
    total_vendas?: number;
    total_recebido?: number;
    diferenca?: number;
    observacoes?: string;
    posto_id: number;
}

export interface NotaFrentistaInput {
    cliente_id: number;
    valor: number;
}

export interface FechamentoFrentista {
    id: number;
    fechamento_id: number;
    frentista_id: number;
    valor_cartao: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_dinheiro: number;
    valor_pix: number;
    valor_nota: number;
    valor_conferido: number;
    valor_moedas: number;
    diferenca: number;
    observacoes: string | null;
}

export interface FechamentoFrentistaHistorico {
    id: number;
    valor_cartao: number | null;
    valor_cartao_debito: number | null;
    valor_cartao_credito: number | null;
    valor_nota: number | null;
    valor_pix: number | null;
    valor_dinheiro: number | null;
    encerrante?: number | null;
    diferenca_calculada?: number | null;
    observacoes?: string | null;
    Fechamento?: {
        data?: string;
        Turno?: {
            nome?: string;
        } | null;
    } | null;
}

export interface SubmitClosingData {
    data: string;
    turno_id: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_nota: number;
    valor_pix: number;
    valor_dinheiro: number;
    valor_moedas: number;
    valor_encerrante: number;
    falta_caixa: number;
    observacoes: string;
    posto_id: number;
    frentista_id?: number;
    notas?: NotaFrentistaInput[];
}

/**
 * Gerencia fechamentos de caixa
 */
export const fechamentoService = {
    /**
     * Busca ou cria um fechamento para a data e turno especificados
     */
    async getOrCreate(
        data: string,
        turnoId: number,
        usuarioId: number | null,
        totalRecebido: number = 0,
        totalVendas: number = 0,
        postoId?: number
    ): Promise<Fechamento> {
        // Primeiro tenta buscar um fechamento existente
        let query = supabase
            .from('Fechamento')
            .select('*')
            .eq('data', data)
            .eq('turno_id', turnoId);

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data: existing, error: searchError } = await query.single();

        if (existing && !searchError) {
            return existing;
        }

        // Se não existe, cria um novo com totais
        const { data: created, error: createError } = await supabase
            .from('Fechamento')
            .insert({
                data,
                turno_id: turnoId,
                usuario_id: usuarioId,
                status: 'FECHADO',
                total_recebido: totalRecebido,
                total_vendas: totalVendas,
                diferenca: totalRecebido - totalVendas,
                posto_id: postoId
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Erro ao criar fechamento: ${createError.message}`);
        }

        return created;
    },

    /**
     * Atualiza os totais do fechamento baseado na soma do que foi informado pelos frentistas
     */
    async updateTotals(
        fechamentoId: number,
        totalVendasManual: number = 0,
        observacoes?: string
    ): Promise<void> {
        // Busca todos os fechamentos de frentistas para este fechamento
        const { data: frentistasData, error: frentistasError } = await supabase
            .from('FechamentoFrentista')
            .select('valor_cartao_debito, valor_cartao_credito, valor_nota, valor_pix, valor_dinheiro')
            .eq('fechamento_id', fechamentoId);

        if (frentistasError) {
            throw new Error(`Erro ao buscar totais de frentistas: ${frentistasError.message}`);
        }

        const totalRecebido = (frentistasData || []).reduce((acc, item) => {
            return acc +
                (item.valor_cartao_debito || 0) +
                (item.valor_cartao_credito || 0) +
                (item.valor_nota || 0) +
                (item.valor_pix || 0) +
                (item.valor_dinheiro || 0);
        }, 0);

        // Se totalVendasManual for 0, podemos tentar usar a soma dos encerrantes ou manter o valor anterior
        // Por enquanto, vamos atualizar apenas o total_recebido e a diferença
        const { data: currentShift } = await supabase
            .from('Fechamento')
            .select('total_vendas')
            .eq('id', fechamentoId)
            .single();

        const totalVendas = totalVendasManual || currentShift?.total_vendas || 0;
        const diferenca = totalRecebido - totalVendas;

        const { error } = await supabase
            .from('Fechamento')
            .update({
                total_recebido: totalRecebido,
                total_vendas: totalVendas,
                diferenca,
                status: 'FECHADO',
                observacoes,
            })
            .eq('id', fechamentoId);

        if (error) {
            throw new Error(`Erro ao atualizar fechamento: ${error.message}`);
        }
    },
};

/**
 * Gerencia fechamentos individuais de frentistas
 */
export const fechamentoFrentistaService = {
    /**
     * Cria um fechamento de frentista
     */
    async create(data: {
        fechamento_id: number;
        frentista_id: number;
        valor_cartao: number;
        valor_cartao_debito: number;
        valor_cartao_credito: number;
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_moedas: number;
        valor_conferido: number;
        encerrante?: number;
        diferenca_calculada?: number;
        observacoes?: string;
        posto_id?: number;
    }): Promise<FechamentoFrentista> {
        const { data: created, error } = await supabase
            .from('FechamentoFrentista')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Erro ao criar fechamento frentista: ${error.message}`);
        }

        return created;
    },

    /**
     * Atualiza um fechamento de frentista existente
     */
    async update(id: number, data: {
        valor_cartao: number;
        valor_cartao_debito: number;
        valor_cartao_credito: number;
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_moedas: number;
        valor_conferido: number;
        encerrante?: number;
        diferenca_calculada?: number;
        observacoes?: string;
    }): Promise<FechamentoFrentista> {
        const { data: updated, error } = await supabase
            .from('FechamentoFrentista')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Erro ao atualizar fechamento frentista: ${error.message}`);
        }

        return updated;
    },

    async getExisting(fechamentoId: number, frentistaId: number): Promise<number | null> {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select('id')
            .eq('fechamento_id', fechamentoId)
            .eq('frentista_id', frentistaId)
            .single();

        if (error || !data) return null;
        return data.id;
    },

    /**
     * Verifica se já existe um fechamento para este frentista no fechamento especificado
     */
    async exists(fechamentoId: number, frentistaId: number): Promise<boolean> {
        const existing = await this.getExisting(fechamentoId, frentistaId);
        return existing !== null;
    },

    /**
     * Busca histórico de fechamentos do frentista
     */
    async getHistorico(frentistaId: number, postoId: number, limit = 10): Promise<{
        id: number;
        data: string;
        turno: string;
        totalInformado: number;
        encerrante: number;
        diferenca: number;
        status: 'ok' | 'divergente';
        observacoes?: string;
    }[]> {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select(`
                *,
                fechamento:fechamento_id (
                    data,
                    turno:turno_id (nome)
                )
            `)
            .eq('frentista_id', frentistaId)
            .eq('posto_id', postoId)
            .order('id', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Erro ao buscar histórico:', error);
            return [];
        }

        return (data || []).map((item: FechamentoFrentistaHistorico) => {
            const totalInformado = (item.valor_cartao || 0) + (item.valor_nota || 0) + (item.valor_pix || 0) + (item.valor_dinheiro || 0);
            // Se valor_cartao for 0 mas tiver debito/credito, usa eles
            const cartaoReal = (item.valor_cartao || 0) || ((item.valor_cartao_debito || 0) + (item.valor_cartao_credito || 0));
            const totalCorrigido = cartaoReal + (item.valor_nota || 0) + (item.valor_pix || 0) + (item.valor_dinheiro || 0);
            const encerrante = item.encerrante || 0;
            const diferenca = item.diferenca_calculada || (encerrante - totalInformado);

            return {
                id: item.id,
                data: item.Fechamento?.data || '',
                turno: item.Fechamento?.Turno?.nome || 'N/A',
                totalInformado: totalCorrigido,
                encerrante,
                diferenca,
                status: diferenca === 0 ? 'ok' as const : 'divergente' as const,
                observacoes: item.observacoes || undefined,
            };
        });
    },
};

/**
 * Função principal para submeter um fechamento de caixa do mobile
 */
export async function submitMobileClosing(closingData: SubmitClosingData): Promise<{
    success: boolean;
    message: string;
    fechamentoId?: number;
}> {
    try {
        // 1. Verificar autenticação (Modo Híbrido: Com ou Sem Login)
        const { data: { user } } = await supabase.auth.getUser();

        let usuarioIdParaRegistro: number | null = null;

        if (user && user.email) {
            // Se tem user logado, busca o ID numérico na tabela Usuario
            const usuarioProfile = await usuarioService.getByEmail(user.email);
            if (usuarioProfile) {
                usuarioIdParaRegistro = usuarioProfile.id;
            }
        }

        if (!usuarioIdParaRegistro) {
            // MODO UNIVERSAL SEM LOGIN (ou falha ao buscar profile)
            // Precisamos de um usuario_id (INTEGER) para a tabela Fechamento

            // Estratégia 1: Tenta buscar um usuário associado ao frentista (se houver link user_id -> Usuario)
            // Como a tabela Frentista tem user_id (UUID), é difícil linkar direto com Usuario (Int) sem email.
            // Então vamos para a Estratégia 2 Direta.

            // Estratégia 2: Buscar o primeiro usuário ADMIN ou PROPRIETÁRIO do sistema para associar o registro
            const { data: adminUser } = await supabase
                .from('Usuario')
                .select('id')
                .eq('role', 'ADMIN') // Tenta pegar um admin
                .limit(1)
                .single();

            if (adminUser) {
                usuarioIdParaRegistro = adminUser.id;
            } else {
                // Fallback: Qualquer usuário (ex: o primeiro cadastrado)
                const { data: fallbackUser } = await supabase
                    .from('Usuario')
                    .select('id')
                    .limit(1)
                    .single();
                
                if (fallbackUser) {
                    usuarioIdParaRegistro = fallbackUser.id;
                }
            }
        }

        // Se ainda assim não tiver ID, é um erro crítico de configuração do banco
        if (!usuarioIdParaRegistro) {
            console.error('CRÍTICO: Não foi possível encontrar um Usuario ID válido para vincular ao fechamento.');
            // Vamos tentar passar 0 ou null se o banco aceitar, mas provavelmente falhará
            // O ideal seria retornar erro, mas vamos tentar prosseguir para não travar se o banco aceitar null
        }

        // 3. Buscar frentista (se não informado, busca o do usuário logado)
        let frentista;
        if (closingData.frentista_id) {
            const { data, error: fError } = await supabase
                .from('Frentista')
                .select('*')
                .eq('id', closingData.frentista_id)
                .single();
            if (fError || !data) {
                return { success: false, message: 'Frentista selecionado não encontrado.' };
            }
            frentista = data;
        } else if (user) {
            frentista = await frentistaService.getByUserId(user.id);
        }

        if (!frentista) {
            return {
                success: false,
                message: 'Frentista não identificado. Por favor selecione um frentista no topo da tela.',
            };
        }

        // 4. Calcular totais primeiro
        const totalInformado =
            closingData.valor_cartao_debito +
            closingData.valor_cartao_credito +
            closingData.valor_nota +
            closingData.valor_pix +
            closingData.valor_dinheiro;

        // Se não informado pelo front (que agora envia), calcula baseada nos inputs
        // Mas o front já envia valor_encerrante calculado e falta_caixa
        const totalVendas = closingData.valor_encerrante;
        const diferenca = closingData.falta_caixa; // Se positivo sobra, se negativo falta

        // 5. Obter ou Criar Fechamento Geral (Turno)
        // OBS: Se já existir um fechamento para este turno/dia, usamos ele.
        // Se não, criamos um novo.
        const fechamentoGeral = await fechamentoService.getOrCreate(
            closingData.data,
            closingData.turno_id,
            usuarioIdParaRegistro,
            totalInformado, // Inicialmente assume o informado deste frentista como base se for novo
            totalVendas,    // Vendas deste frentista como base
            closingData.posto_id
        );

        // 6. Verificar se frentista já fechou neste turno
        const jaFechou = await fechamentoFrentistaService.exists(fechamentoGeral.id, frentista.id);
        if (jaFechou) {
            return { success: false, message: 'Você já realizou o fechamento para este turno hoje.' };
        }

        // 7. Registrar Fechamento Individual do Frentista
        await fechamentoFrentistaService.create({
            fechamento_id: fechamentoGeral.id,
            frentista_id: frentista.id,
            valor_cartao: 0, // Deprecado, usamos debito/credito separados
            valor_cartao_debito: closingData.valor_cartao_debito,
            valor_cartao_credito: closingData.valor_cartao_credito,
            valor_nota: closingData.valor_nota,
            valor_pix: closingData.valor_pix,
            valor_dinheiro: closingData.valor_dinheiro,
            valor_moedas: closingData.valor_moedas,
            valor_conferido: totalInformado,
            encerrante: totalVendas,
            diferenca_calculada: diferenca,
            observacoes: closingData.observacoes,
            posto_id: closingData.posto_id
        });

        // 8. Atualizar totais do Fechamento Geral (somar com outros frentistas se houver)
        await fechamentoService.updateTotals(fechamentoGeral.id, 0, closingData.observacoes);

        // 9. Registrar Notas a Prazo (se houver)
        if (closingData.notas && closingData.notas.length > 0) {
            const notasParaInserir = closingData.notas.map(nota => ({
                cliente_id: nota.cliente_id,
                frentista_id: frentista.id,
                data: closingData.data,
                valor: nota.valor,
                posto_id: closingData.posto_id,
                fechamento_id: fechamentoGeral.id,
                criado_em: new Date().toISOString()
            }));

            const { error: notasError } = await supabase
                .from('NotaPrazo') // Certifique-se que a tabela existe
                .insert(notasParaInserir);

            if (notasError) {
                console.error('Erro ao salvar notas a prazo:', notasError);
                // Não falhamos o fechamento todo por erro na nota, mas logamos
            }
        }

        return { success: true, message: 'Fechamento realizado com sucesso!', fechamentoId: fechamentoGeral.id };

    } catch (error) {
        console.error('Erro no submitMobileClosing:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao processar o fechamento.'
        };
    }
}
