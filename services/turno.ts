import { supabase } from '../lib/supabase';

export interface Turno {
    id: number;
    nome: string;
    horario_inicio: string;
    horario_fim: string;
    ativo?: boolean | null;
}

export interface TurnoComStatus extends Turno {
    status?: 'ABERTO' | 'FECHADO' | 'PENDENTE';
}

/**
 * Busca turnos disponíveis
 */
export const turnoService = {
    async getAll(postoId?: number): Promise<Turno[]> {
        let query = supabase
            .from('Turno')
            .select('*');

        if (postoId) {
            query = query.eq('posto_id', postoId);
        }

        const { data, error } = await query.order('horario_inicio');

        if (error) {
            console.error('Error fetching turnos:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Identifica o turno atual baseado na hora
     */
    async getCurrentTurno(postoId?: number): Promise<Turno | null> {
        console.log('[TurnoService] Identificando turno atual para posto:', postoId);
        const turnos = await this.getAll(postoId);

        if (!turnos || turnos.length === 0) {
            console.warn('[TurnoService] Nenhum turno encontrado para o posto:', postoId);
            return null;
        }

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Prioriza turnos ativos
        const activeTurnos = turnos.filter(t => t.ativo !== false);
        const searchList = activeTurnos.length > 0 ? activeTurnos : turnos;

        console.log(`[TurnoService] Buscando em ${searchList.length} turnos para hora ${currentTime}`);

        // Encontra o turno que contém a hora atual
        for (const turno of searchList) {
            const start = turno.horario_inicio;
            const end = turno.horario_fim;

            // Caso especial: turno da noite que cruza meia-noite
            if (start > end) {
                if (currentTime >= start || currentTime < end) {
                    console.log('[TurnoService] Turno identificado (meia-noite):', turno.nome);
                    return turno;
                }
            } else {
                if (currentTime >= start && currentTime < end) {
                    console.log('[TurnoService] Turno identificado:', turno.nome);
                    return turno;
                }
            }
        }

        // Se não encontrou pela hora, tenta o turno 'Diário' ou o primeiro da lista
        const diario = searchList.find(t => t.nome.toLowerCase() === 'diário');
        const fallback = diario || searchList[0];

        console.log('[TurnoService] Usando fallback:', fallback?.nome);
        return fallback || null;
    },
};
