import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Apartment, Device, Sensor, NoiseReading, 
  NoiseEvent, Alert, Occurrence, OccurrenceComment, NoisePolicy, Profile 
} from '../types/database.types';

// ============================================================================
// DADOS DE DEMONSTRAÇÃO / BASELINE INICIAL (ESPELHO DO SEED.SQL)
// ============================================================================
const initialApartments: Apartment[] = [
  { id: '10100000-0000-0000-0000-000000000101', building_id: 'b1', number: '101', floor: 1, current_db: 45.2, status: 'normal', peak_db: 58.4, avg_db: 46.1, created_at: new Date().toISOString() },
  { id: '10200000-0000-0000-0000-000000000102', building_id: 'b1', number: '102', floor: 1, current_db: 51.0, status: 'normal', peak_db: 62.0, avg_db: 49.3, created_at: new Date().toISOString() },
  { id: '10300000-0000-0000-0000-000000000103', building_id: 'b1', number: '103', floor: 1, current_db: 74.5, status: 'warning', peak_db: 76.2, avg_db: 68.0, created_at: new Date().toISOString() },
  { id: '20100000-0000-0000-0000-000000000201', building_id: 'b1', number: '201', floor: 2, current_db: 42.1, status: 'normal', peak_db: 50.1, avg_db: 43.8, created_at: new Date().toISOString() },
  { id: '20200000-0000-0000-0000-000000000202', building_id: 'b1', number: '202', floor: 2, current_db: 84.8, status: 'critical', peak_db: 89.2, avg_db: 78.4, created_at: new Date().toISOString() },
  { id: '20300000-0000-0000-0000-000000000203', building_id: 'b1', number: '203', floor: 2, current_db: 0, status: 'offline', peak_db: 54.0, avg_db: 45.0, created_at: new Date().toISOString() },
  { id: '30100000-0000-0000-0000-000000000301', building_id: 'b1', number: '301', floor: 3, current_db: 43.0, status: 'normal', peak_db: 52.0, avg_db: 44.5, created_at: new Date().toISOString() },
  { id: '30200000-0000-0000-0000-000000000302', building_id: 'b1', number: '302', floor: 3, current_db: 48.6, status: 'normal', peak_db: 56.1, avg_db: 47.2, created_at: new Date().toISOString() },
  { id: '30300000-0000-0000-0000-000000000303', building_id: 'b1', number: '303', floor: 3, current_db: 0, status: 'offline', peak_db: 51.0, avg_db: 46.0, created_at: new Date().toISOString() },
];

const initialDevices: Device[] = [
  { id: 'd101', apartment_id: initialApartments[0].id, device_uid: 'ESP32-APT-101', name: 'ESP32 Apto 101', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '101' },
  { id: 'd102', apartment_id: initialApartments[1].id, device_uid: 'ESP32-APT-102', name: 'ESP32 Apto 102', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '102' },
  { id: 'd103', apartment_id: initialApartments[2].id, device_uid: 'ESP32-APT-103', name: 'ESP32 Apto 103', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '103' },
  { id: 'd201', apartment_id: initialApartments[3].id, device_uid: 'ESP32-APT-201', name: 'ESP32 Apto 201', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '201' },
  { id: 'd202', apartment_id: initialApartments[4].id, device_uid: 'ESP32-APT-202', name: 'ESP32 Apto 202', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '202' },
  { id: 'd203', apartment_id: initialApartments[5].id, device_uid: 'ESP32-APT-203', name: 'ESP32 Apto 203', status: 'offline', firmware_version: '1.1.0', last_seen_at: new Date(Date.now() - 3600000 * 4).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '203' },
  { id: 'd301', apartment_id: initialApartments[6].id, device_uid: 'ESP32-APT-301', name: 'ESP32 Apto 301', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '301' },
  { id: 'd302', apartment_id: initialApartments[7].id, device_uid: 'ESP32-APT-302', name: 'ESP32 Apto 302', status: 'online', firmware_version: '1.2.0', last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '302' },
  { id: 'd303', apartment_id: initialApartments[8].id, device_uid: 'ESP32-APT-303', name: 'ESP32 Apto 303', status: 'maintenance', firmware_version: '1.0.0', last_seen_at: new Date(Date.now() - 3600000 * 24).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), apartment_number: '303' },
];

const initialSensors: Sensor[] = [
  { id: 's1', device_id: 'd101', name: 'MAX9814 - Sala Principal', position: 'Sala', channel: 1, enabled: true, created_at: new Date().toISOString() },
  { id: 's2', device_id: 'd101', name: 'MAX9814 - Quarto Casal', position: 'Quarto', channel: 2, enabled: true, created_at: new Date().toISOString() },
  { id: 's3', device_id: 'd101', name: 'MAX9814 - Cozinha/Área', position: 'Cozinha', channel: 3, enabled: true, created_at: new Date().toISOString() },
];

const initialPolicies: NoisePolicy[] = [
  { id: 'p1', condominium_id: 'c1', name: 'Política Diurna', start_time: '07:00', end_time: '22:00', threshold_db: 70.0, warning_threshold_db: 70.0, critical_threshold_db: 80.0, min_duration_seconds: 3, cooldown_seconds: 60, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p2', condominium_id: 'c1', name: 'Política Noturna (Silêncio)', start_time: '22:00', end_time: '07:00', threshold_db: 60.0, warning_threshold_db: 60.0, critical_threshold_db: 70.0, min_duration_seconds: 3, cooldown_seconds: 60, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialAlerts: Alert[] = [
  { id: 'a1', apartment_id: initialApartments[4].id, type: 'high_noise', title: 'ALERTA!! RUÍDO ALTO DETECTADO', message: 'Nível sonoro atingiu 84.8 dB no seu apartamento.', severity: 'critical', read: false, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), apartment_number: '202' },
  { id: 'a2', apartment_id: initialApartments[2].id, type: 'high_noise', title: 'Aviso: Nível de Ruído Elevado', message: 'Nível sonoro atingiu 74.5 dB no seu apartamento.', severity: 'warning', read: true, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), apartment_number: '103' },
];

const initialOccurrences: Occurrence[] = [
  {
    id: 'occ1',
    condominium_id: 'c1',
    reporter_id: 'u1',
    apartment_id: initialApartments[4].id,
    type: 'Música Alta e Batidas',
    location: 'Apartamento 202',
    description: 'Som mecânico com graves intensos sendo reproduzido repetidamente após às 22h30.',
    occurred_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'em análise',
    priority: 'alta',
    anonymous: false,
    reporter_name: 'João Silva (Apto 101)',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'occ2',
    condominium_id: 'c1',
    reporter_id: 'u2',
    apartment_id: initialApartments[2].id,
    type: 'Reforma Fora do Horário',
    location: 'Apartamento 103',
    description: 'Uso de ferramentas elétricas (furadeira) antes das 08h da manhã.',
    occurred_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    status: 'resolvida',
    priority: 'media',
    anonymous: true,
    reporter_name: 'Morador Anônimo',
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  }
];

const initialComments: Record<string, OccurrenceComment[]> = {
  occ1: [
    { id: 'c1', occurrence_id: 'occ1', author_id: 'admin1', author_name: 'Carlos Síndico Geral', comment: 'Notificação orientativa enviada preventivamente ao morador do apartamento citado via painel.', created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() },
    { id: 'c2', occurrence_id: 'occ1', author_id: 'u1', author_name: 'João Silva', comment: 'Ruído cessou por volta das 23h45. Agradeço a rápida intervenção!', created_at: new Date(Date.now() - 3600000 * 0.5).toISOString() },
  ]
};

// ============================================================================
// STORE REATIVO LOCAL (Sincroniza com componentes)
// ============================================================================
class LocalDataStore {
  apartments = [...initialApartments];
  devices = [...initialDevices];
  sensors = [...initialSensors];
  policies = [...initialPolicies];
  alerts = [...initialAlerts];
  occurrences = [...initialOccurrences];
  comments: Record<string, OccurrenceComment[]> = { ...initialComments };
  readings: NoiseReading[] = [];
  listeners: Array<() => void> = [];

  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  // Executa o exato pipeline unificado no store local
  processNoiseReading(reading: NoiseReading) {
    this.readings.unshift(reading);
    if (this.readings.length > 200) this.readings.pop();

    const apt = this.apartments.find(a => a.id === reading.apartment_id);
    if (apt) {
      apt.current_db = reading.decibel;
      apt.peak_db = Math.max(apt.peak_db || 0, reading.decibel);
      apt.avg_db = Number((((apt.avg_db || 50) * 4 + reading.decibel) / 5).toFixed(1));

      // Determinar política vigente (horário atual)
      const now = new Date();
      const hour = now.getHours();
      const isNight = hour >= 22 || hour < 7;
      const warningThreshold = isNight ? 60 : 70;
      const criticalThreshold = isNight ? 70 : 80;

      if (reading.decibel >= criticalThreshold) {
        apt.status = 'critical';
        // Gerar alerta crítico
        const newAlert: Alert = {
          id: `alt-${Date.now()}`,
          apartment_id: apt.id,
          type: 'high_noise',
          title: 'ALERTA!! RUÍDO CRÍTICO DETECTADO',
          message: `Nível sonoro atingiu ${reading.decibel.toFixed(1)} dB no apartamento ${apt.number}.`,
          severity: 'critical',
          read: false,
          created_at: new Date().toISOString(),
          apartment_number: apt.number,
        };
        this.alerts.unshift(newAlert);
      } else if (reading.decibel >= warningThreshold) {
        apt.status = 'warning';
        const newAlert: Alert = {
          id: `alt-${Date.now()}`,
          apartment_id: apt.id,
          type: 'high_noise',
          title: 'Aviso: Nível de Ruído Elevado',
          message: `Nível sonoro atingiu ${reading.decibel.toFixed(1)} dB no apartamento ${apt.number}.`,
          severity: 'warning',
          read: false,
          created_at: new Date().toISOString(),
          apartment_number: apt.number,
        };
        this.alerts.unshift(newAlert);
      } else {
        apt.status = 'normal';
      }
    }

    this.notify();
  }
}

export const localStore = new LocalDataStore();

// ============================================================================
// DATA SERVICE API
// ============================================================================
export const DataService = {
  // Apartamentos
  async getApartments(): Promise<Apartment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('apartments').select('*').order('number');
      if (!error && data) return data as Apartment[];
    }
    return localStore.apartments;
  },

  async getApartmentById(id: string): Promise<Apartment | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('apartments').select('*').eq('id', id).single();
      if (data) return data as Apartment;
    }
    return localStore.apartments.find(a => a.id === id) || null;
  },

  // Dispositivos
  async getDevices(): Promise<Device[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('devices').select('*, apartments(number)');
      if (data) {
        return data.map((d: any) => ({
          ...d,
          apartment_number: d.apartments?.number || 'N/A'
        }));
      }
    }
    return localStore.devices;
  },

  // Sensores
  async getSensors(deviceId?: string): Promise<Sensor[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('sensors').select('*');
      if (deviceId) query = query.eq('device_id', deviceId);
      const { data } = await query;
      if (data) return data as Sensor[];
    }
    return deviceId 
      ? localStore.sensors.filter(s => s.device_id === deviceId)
      : localStore.sensors;
  },

  // Políticas
  async getPolicies(): Promise<NoisePolicy[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('noise_policies').select('*').order('start_time');
      if (data) return data as NoisePolicy[];
    }
    return localStore.policies;
  },

  async updatePolicy(policy: Partial<NoisePolicy> & { id: string }): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('noise_policies').update(policy).eq('id', policy.id);
      return !error;
    }
    const idx = localStore.policies.findIndex(p => p.id === policy.id);
    if (idx !== -1) {
      localStore.policies[idx] = { ...localStore.policies[idx], ...policy, updated_at: new Date().toISOString() };
      localStore.notify();
      return true;
    }
    return false;
  },

  // Alertas
  async getAlerts(limit = 20): Promise<Alert[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('alerts').select('*, apartments(number)').order('created_at', { ascending: false }).limit(limit);
      if (data) {
        return data.map((a: any) => ({
          ...a,
          apartment_number: a.apartments?.number || 'N/A'
        }));
      }
    }
    return localStore.alerts.slice(0, limit);
  },

  async markAlertAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('alerts').update({ read: true }).eq('id', id);
    }
    const alert = localStore.alerts.find(a => a.id === id);
    if (alert) alert.read = true;
    localStore.notify();
  },

  // Ocorrências
  async getOccurrences(): Promise<Occurrence[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('occurrences').select('*, profiles(full_name)').order('created_at', { ascending: false });
      if (data) {
        return data.map((o: any) => ({
          ...o,
          reporter_name: o.anonymous ? 'Morador Anônimo' : (o.profiles?.full_name || 'Morador')
        }));
      }
    }
    return localStore.occurrences;
  },

  async updateOccurrenceStatus(id: string, status: Occurrence['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('occurrences').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    }
    const occ = localStore.occurrences.find(o => o.id === id);
    if (occ) {
      occ.status = status;
      occ.updated_at = new Date().toISOString();
      localStore.notify();
    }
  },

  async getComments(occurrenceId: string): Promise<OccurrenceComment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('occurrence_comments').select('*, profiles(full_name)').eq('occurrence_id', occurrenceId).order('created_at', { ascending: true });
      if (data) {
        return data.map((c: any) => ({
          ...c,
          author_name: c.profiles?.full_name || 'Usuário'
        }));
      }
    }
    return localStore.comments[occurrenceId] || [];
  },

  async addComment(occurrenceId: string, comment: string, authorName = 'Administrador'): Promise<OccurrenceComment> {
    const newComment: OccurrenceComment = {
      id: `comm-${Date.now()}`,
      occurrence_id: occurrenceId,
      author_id: 'admin1',
      author_name: authorName,
      comment,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('occurrence_comments').insert({
        occurrence_id: occurrenceId,
        comment,
      });
    }

    if (!localStore.comments[occurrenceId]) {
      localStore.comments[occurrenceId] = [];
    }
    localStore.comments[occurrenceId].push(newComment);
    localStore.notify();
    return newComment;
  },

  // PIPELINE ÚNICO: INGESTÃO DE LEITURA (SIMULADOR OU MANUAL)
  async injectReading(data: {
    apartment_id: string;
    decibel: number;
    source: 'esp32' | 'manual' | 'simulation';
    is_test_data?: boolean;
    sensor_id?: string;
    device_id?: string;
  }): Promise<void> {
    const reading: NoiseReading = {
      id: `read-${Date.now()}`,
      apartment_id: data.apartment_id,
      decibel: data.decibel,
      source: data.source,
      is_test_data: data.is_test_data ?? true,
      sensor_id: data.sensor_id,
      device_id: data.device_id,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      // Inserção direta no Supabase (dispara o trigger trg_process_noise_reading)
      await supabase.from('noise_readings').insert({
        apartment_id: data.apartment_id,
        decibel: data.decibel,
        source: data.source,
        is_test_data: data.is_test_data ?? true,
        sensor_id: data.sensor_id,
        device_id: data.device_id,
      });
    }

    // Processa também no store reativo local para UI instantânea
    localStore.processNoiseReading(reading);
  },

  // LIMPEZA SEGURA DE DADOS DE TESTE
  async cleanTestData(): Promise<{ success: boolean; deletedCount: number }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('cleanup_test_data');
      if (!error && data) {
        return { success: true, deletedCount: data.deleted_readings || 0 };
      }
    }

    // Limpeza no store local
    const beforeCount = localStore.readings.length;
    localStore.readings = localStore.readings.filter(r => !r.is_test_data);
    localStore.alerts = localStore.alerts.filter(a => !a.id.startsWith('alt-'));
    
    // Restaurar status dos apartamentos
    localStore.apartments.forEach(apt => {
      if (apt.number === '103') apt.status = 'warning';
      else if (apt.number === '202') apt.status = 'critical';
      else if (apt.number === '203' || apt.number === '303') apt.status = 'offline';
      else apt.status = 'normal';
    });

    localStore.notify();
    return { success: true, deletedCount: beforeCount - localStore.readings.length };
  }
};
