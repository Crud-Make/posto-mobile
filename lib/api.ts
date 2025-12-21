import { supabase } from './supabase';

// ============================================
// TIPOS
// ============================================

export interface Frentista {
    id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    data_admissao: string | null;
    ativo: boolean;
    user_id: string | null;
}

export interface Turno {
    id: number;
    nome: string;
    horario_inicio: string;
    horario_fim: string;
}

export interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
}

export interface Fechamento {
    id: number;
    data: string;
    usuario_id: string;
    turno_id: number;
    status: string;
    total_vendas?: number;
    total_recebido?: number;
    diferenca?: number;
    observacoes?: string;
}

export interface FechamentoFrentista {
    id: number;
    fechamento_id: number;
    frentista_id: number;
    valor_cartao: number;
    valor_dinheiro: number;
    valor_pix: number;
    valor_nota: number;
    valor_conferido: number;
    diferenca: number;
    observacoes: string | null;
}

export interface SubmitClosingData {
    data: string;
    turno_id: number;
    valor_cartao: number;
    valor_nota: number;
    valor_pix: number;
    valor_dinheiro: number;
    falta_caixa: number;
    observacoes: string;
}

// ============================================
// SERVIÇOS
// ============================================

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
};

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

/**
 * Busca turnos disponíveis
 */
export const turnoService = {
    async getAll(): Promise<Turno[]> {
        const { data, error } = await supabase
            .from('Turno')
            .select('*')
            .order('horario_inicio');

        if (error) {
            console.error('Error fetching turnos:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Identifica o turno atual baseado na hora
     */
    async getCurrentTurno(): Promise<Turno | null> {
        const turnos = await this.getAll();
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Encontra o turno que contém a hora atual
        for (const turno of turnos) {
            const start = turno.horario_inicio;
            const end = turno.horario_fim;

            // Caso especial: turno da noite que cruza meia-noite
            if (start > end) {
                if (currentTime >= start || currentTime < end) {
                    return turno;
                }
            } else {
                if (currentTime >= start && currentTime < end) {
                    return turno;
                }
            }
        }

        return turnos[0] || null; // Fallback para primeiro turno
    },
};

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
        usuarioId: number,
        totalRecebido: number = 0,
        totalVendas: number = 0
    ): Promise<Fechamento> {
        // Primeiro tenta buscar um fechamento existente
        const { data: existing, error: searchError } = await supabase
            .from('Fechamento')
            .select('*')
            .eq('data', data)
            .eq('turno_id', turnoId)
            .single();

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
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Erro ao criar fechamento: ${createError.message}`);
        }

        return created;
    },

    /**
     * Atualiza os totais do fechamento
     */
    async updateTotals(
        fechamentoId: number,
        totalRecebido: number,
        totalVendas: number,
        observacoes?: string
    ): Promise<void> {
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
        valor_nota: number;
        valor_pix: number;
        valor_dinheiro: number;
        valor_conferido: number;
        observacoes?: string;
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
     * Verifica se já existe um fechamento para este frentista no fechamento especificado
     */
    async exists(fechamentoId: number, frentistaId: number): Promise<boolean> {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select('id')
            .eq('fechamento_id', fechamentoId)
            .eq('frentista_id', frentistaId)
            .single();

        return !!data && !error;
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
        // 1. Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                message: 'Usuário não autenticado. Por favor, faça login novamente.',
            };
        }

        // 2. Buscar perfil do usuário na tabela Usuario
        const usuario = await usuarioService.getByEmail(user.email!);
        if (!usuario) {
            return {
                success: false,
                message: 'Perfil de usuário não encontrado no sistema.',
            };
        }

        // 3. Buscar frentista associado ao usuário
        const frentista = await frentistaService.getByUserId(user.id);

        if (!frentista) {
            return {
                success: false,
                message: 'Frentista não encontrado. Entre em contato com o administrador.',
            };
        }

        // 4. Calcular totais primeiro
        const totalInformado =
            closingData.valor_cartao +
            closingData.valor_nota +
            closingData.valor_pix +
            closingData.valor_dinheiro;

        const valorConferido = totalInformado - closingData.falta_caixa;
        const diferenca = closingData.falta_caixa; // Diferença é a falta

        // 5. Buscar ou criar fechamento do dia/turno (agora com totais)
        const fechamento = await fechamentoService.getOrCreate(
            closingData.data,
            closingData.turno_id,
            usuario.id,
            totalInformado, // total_recebido
            totalInformado  // total_vendas (mesmo valor por enquanto)
        );

        // 6. Verificar se este frentista já enviou fechamento
        const alreadySubmitted = await fechamentoFrentistaService.exists(
            fechamento.id,
            frentista.id
        );

        if (alreadySubmitted) {
            return {
                success: false,
                message: 'Você já enviou um fechamento para este turno hoje.',
            };
        }

        // 7. Criar fechamento do frentista
        await fechamentoFrentistaService.create({
            fechamento_id: fechamento.id,
            frentista_id: frentista.id,
            valor_cartao: closingData.valor_cartao,
            valor_nota: closingData.valor_nota,
            valor_pix: closingData.valor_pix,
            valor_dinheiro: closingData.valor_dinheiro,
            valor_conferido: valorConferido,
            observacoes: closingData.observacoes || undefined,
        });

        // 7. Atualizar totais do fechamento geral
        // Nota: Aqui estamos assumindo que o total de vendas será atualizado depois
        // quando o gestor fizer o fechamento completo no painel
        await fechamentoService.updateTotals(
            fechamento.id,
            totalInformado,
            0, // Total de vendas será preenchido pelo painel
            closingData.observacoes
        );

        return {
            success: true,
            message: 'Fechamento enviado com sucesso!',
            fechamentoId: fechamento.id,
        };
    } catch (error) {
        console.error('Error submitting mobile closing:', error);
        return {
            success: false,
            message: `Erro ao enviar fechamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        };
    }
}
