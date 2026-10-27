import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { HistoryFilter, HistoryResponse } from './noiseHistory';

export const HistoryService = {
  async read(apartmentId: string, period: string, mode: 'context'|'month'|'day', filter: HistoryFilter): Promise<HistoryResponse> {
    if(!isSupabaseConfigured || !supabase) throw new Error('O histórico usa somente registros reais do Supabase. Conecte o ambiente ao banco para consultar.');
    const { data, error }=await supabase.rpc('noise_history', {p_apartment_id:apartmentId,p_period:period,p_mode:mode,p_source:filter.source,p_test:filter.test,p_device:filter.device||null,p_sensor:filter.sensor||null});
    if(error) {
      if(error.code==='PGRST202'||error.code==='42883') throw new Error('A consulta do histórico ainda não foi instalada neste banco. Aplique a migração de histórico.');
      if(error.code==='42501') throw new Error('Acesso não autorizado. Entre como síndico do condomínio deste apartamento.');
      throw new Error('Não foi possível consultar o histórico. Tente novamente.');
    }
    if(!data?.context || data.context.apartment_id!==apartmentId) throw new Error('A resposta do histórico não corresponde à unidade selecionada.');
    return data as HistoryResponse;
  }
};
