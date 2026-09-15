import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Apartment, Device, Sensor, NoiseReading, 
  NoiseEvent, Alert, Occurrence, OccurrenceComment, NoisePolicy, Profile,
  UserHistoryReport, CreateApartmentDTO, UpdateApartmentThresholdsDTO,
  SimulatedFine, CreateFineDTO, OccurrenceStatus,
  Conversation, ConversationMessage, CreateConversationDTO, SendMessageDTO,
  ConversationType, ConversationStatus
} from '../types/database.types';
import { currentBillingProvider } from './billingProvider';

export const DEFAULT_CONDO_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_BUILDING_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// DADOS DE DEMONSTRAÇÃO / BASELINE INICIAL
// ============================================================================
const initialApartments: Apartment[] = [
  { id: '10100000-0000-0000-0000-000000000101', building_id: DEFAULT_BUILDING_ID, number: '101', floor: 1, current_db: 45.2, status: 'normal', peak_db: 58.4, avg_db: 46.1, custom_day_threshold_db: 70, custom_night_threshold_db: 60, custom_critical_threshold_db: 80, created_at: new Date().toISOString() },
  { id: '10200000-0000-0000-0000-000000000102', building_id: DEFAULT_BUILDING_ID, number: '102', floor: 1, current_db: 51.0, status: 'normal', peak_db: 62.0, avg_db: 49.3, custom_day_threshold_db: 70, custom_night_threshold_db: 60, custom_critical_threshold_db: 80, created_at: new Date().toISOString() },
  { id: '10300000-0000-0000-0000-000000000103', building_id: DEFAULT_BUILDING_ID, number: '103', floor: 1, current_db: 74.5, status: 'warning', peak_db: 76.2, avg_db: 68.0, custom_day_threshold_db: 68, custom_night_threshold_db: 58, custom_critical_threshold_db: 78, created_at: new Date().toISOString() },
  { id: '20100000-0000-0000-0000-000000000201', building_id: DEFAULT_BUILDING_ID, number: '201', floor: 2, current_db: 42.1, status: 'normal', peak_db: 50.1, avg_db: 43.8, created_at: new Date().toISOString() },
  { id: '20200000-0000-0000-0000-000000000202', building_id: DEFAULT_BUILDING_ID, number: '202', floor: 2, current_db: 84.8, status: 'critical', peak_db: 89.2, avg_db: 78.4, custom_day_threshold_db: 72, custom_night_threshold_db: 62, custom_critical_threshold_db: 82, created_at: new Date().toISOString() },
  { id: '20300000-0000-0000-0000-000000000203', building_id: DEFAULT_BUILDING_ID, number: '203', floor: 2, current_db: 0, status: 'offline', peak_db: 54.0, avg_db: 45.0, created_at: new Date().toISOString() },
  { id: '30100000-0000-0000-0000-000000000301', building_id: DEFAULT_BUILDING_ID, number: '301', floor: 3, current_db: 43.0, status: 'normal', peak_db: 52.0, avg_db: 44.5, created_at: new Date().toISOString() },
  { id: '30200000-0000-0000-0000-000000000302', building_id: DEFAULT_BUILDING_ID, number: '302', floor: 3, current_db: 48.6, status: 'normal', peak_db: 56.1, avg_db: 47.2, created_at: new Date().toISOString() },
  { id: '30300000-0000-0000-0000-000000000303', building_id: DEFAULT_BUILDING_ID, number: '303', floor: 3, current_db: 0, status: 'offline', peak_db: 51.0, avg_db: 46.0, created_at: new Date().toISOString() },
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
  { id: 'p1', condominium_id: DEFAULT_CONDO_ID, name: 'Política Diurna Padrão', start_time: '07:00', end_time: '22:00', threshold_db: 70.0, warning_threshold_db: 70.0, critical_threshold_db: 80.0, min_duration_seconds: 3, cooldown_seconds: 60, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p2', condominium_id: DEFAULT_CONDO_ID, name: 'Política Noturna (Silêncio)', start_time: '22:00', end_time: '07:00', threshold_db: 60.0, warning_threshold_db: 60.0, critical_threshold_db: 70.0, min_duration_seconds: 3, cooldown_seconds: 60, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const initialProfiles: Profile[] = [
  {
    id: 'aaaa1111-0000-0000-0000-000000000001',
    full_name: 'Carlos Síndico Geral',
    email: 'admin@dbsound.com',
    phone: '(11) 98888-0001',
    role: 'admin',
    status: 'approved',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: null,
    created_at: new Date(Date.now() - 3600000 * 24 * 120).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bbbb2222-0000-0000-0000-000000000101',
    full_name: 'João Silva',
    email: 'morador101@dbsound.com',
    phone: '(11) 97777-0101',
    role: 'resident',
    status: 'approved',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: '10100000-0000-0000-0000-000000000101',
    apartment_number: '101',
    created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cccc3333-0000-0000-0000-000000000202',
    full_name: 'Mariana Oliveira',
    email: 'morador202@dbsound.com',
    phone: '(11) 96666-0202',
    role: 'resident',
    status: 'approved',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: '20200000-0000-0000-0000-000000000202',
    apartment_number: '202',
    created_at: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dddd4444-0000-0000-0000-000000000999',
    full_name: 'Lucas Ferreira (Aguardando Alocação)',
    email: 'lucas.morador@email.com',
    phone: '(11) 95555-9999',
    role: 'resident',
    status: 'pending',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: null,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const initialAlerts: Alert[] = [
  { id: 'a1', apartment_id: initialApartments[4].id, type: 'high_noise', title: 'ALERTA!! RUÍDO ALTO DETECTADO', message: 'Nível sonoro atingiu 84.8 dB no seu apartamento.', severity: 'critical', read: false, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), apartment_number: '202' },
  { id: 'a2', apartment_id: initialApartments[2].id, type: 'high_noise', title: 'Aviso: Nível de Ruído Elevado', message: 'Nível sonoro atingiu 74.5 dB no seu apartamento.', severity: 'warning', read: true, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), apartment_number: '103' },
];

const initialOccurrences: Occurrence[] = [
  {
    id: 'occ1',
    condominium_id: 'c1',
    reporter_id: 'bbbb2222-0000-0000-0000-000000000101',
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
    { id: 'c2', occurrence_id: 'occ1', author_id: 'bbbb2222-0000-0000-0000-000000000101', author_name: 'João Silva', comment: 'Ruído cessou por volta das 23h45. Agradeço a rápida intervenção!', created_at: new Date(Date.now() - 3600000 * 0.5).toISOString() },
  ]
};

const initialConversations: Conversation[] = [
  {
    id: 'conv-occ-1',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: initialApartments[4].id, // Apto 202
    apartment_number: '202',
    occurrence_id: 'occ1',
    created_by: 'aaaa1111-0000-0000-0000-000000000001',
    title: 'Ocorrência #001 — Música Alta e Batidas',
    type: 'ocorrencia',
    status: 'aberta',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    last_message: 'Olá Síndico, já reduzimos o volume. Desculpe pelo transtorno.',
    unread_count: 0,
  },
  {
    id: 'conv-prev-103',
    condominium_id: DEFAULT_CONDO_ID,
    apartment_id: initialApartments[2].id, // Apto 103
    apartment_number: '103',
    occurrence_id: null,
    created_by: 'aaaa1111-0000-0000-0000-000000000001',
    title: 'Contato Preventivo — Ruído Elevado (74.5 dB)',
    type: 'preventivo',
    status: 'aberta',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    last_message: 'Olá, identificamos ruído sonoro de 74.5 dB pelo sensor acústico. Poderia verificar preventivamente?',
    unread_count: 1,
  }
];

const initialMessages: Record<string, ConversationMessage[]> = {
  'conv-occ-1': [
    {
      id: 'm1',
      conversation_id: 'conv-occ-1',
      sender_id: 'aaaa1111-0000-0000-0000-000000000001',
      sender_name: 'Carlos Síndico Geral',
      message: 'Olá! Recebemos relatos de som mecânico com graves elevados nesta unidade após às 22h. Poderia verificar e adequar o volume?',
      read: true,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'm2',
      conversation_id: 'conv-occ-1',
      sender_id: 'cccc3333-0000-0000-0000-000000000202',
      sender_name: 'Mariana Oliveira (Apto 202)',
      message: 'Olá Síndico, já reduzimos o volume. Desculpe pelo transtorno.',
      read: true,
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    }
  ],
  'conv-prev-103': [
    {
      id: 'm3',
      conversation_id: 'conv-prev-103',
      sender_id: 'aaaa1111-0000-0000-0000-000000000001',
      sender_name: 'Carlos Síndico Geral',
      message: 'Olá! Identificamos ruído sonoro de 74.5 dB pelo sensor acústico em seu apartamento. Poderia verificar preventivamente para mantermos o sossego coletivo?',
      read: false,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    }
  ]
};

// ============================================================================
// PERSISTÊNCIA LOCAL RESILIENTE (localStorage + fallbacks)
// ============================================================================
const APTS_STORAGE_KEY = 'dbsound_apartments';
const ALLOC_STORAGE_KEY = 'dbsound_allocations';
const PROFILES_STORAGE_KEY = 'dbsound_profiles';

export function getStoredApartments(): Apartment[] {
  if (typeof window === 'undefined') return [...initialApartments];
  try {
    const raw = localStorage.getItem(APTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_apartments do localStorage:', e);
  }
  return [...initialApartments];
}

export function saveStoredApartments(apts: Apartment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APTS_STORAGE_KEY, JSON.stringify(apts));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_apartments no localStorage:', e);
  }
}

export function getStoredAllocations(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ALLOC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler dbsound_allocations do localStorage:', e);
  }
  return {};
}

export function saveStoredAllocation(profileId: string, apartmentId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredAllocations();
    if (apartmentId) {
      current[profileId] = apartmentId;
    } else {
      delete current[profileId];
    }
    localStorage.setItem(ALLOC_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_allocations no localStorage:', e);
  }
}

export function getStoredProfiles(): Profile[] {
  if (typeof window === 'undefined') return [...initialProfiles];
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Assegura que os perfis canônicos (Carlos Síndico, João Silva 101, etc) existam
        const map = new Map(parsed.map((p: Profile) => [p.id, p]));
        initialProfiles.forEach(ip => {
          if (!map.has(ip.id) && !parsed.some((p: Profile) => p.email.toLowerCase() === ip.email.toLowerCase())) {
            parsed.push(ip);
          }
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_profiles do localStorage:', e);
  }
  return [...initialProfiles];
}

export function saveStoredProfiles(profiles: Profile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_profiles no localStorage:', e);
  }
}

const OCCURRENCES_STORAGE_KEY = 'dbsound_occurrences';
const FINES_STORAGE_KEY = 'dbsound_fines';

export function getStoredOccurrences(): Occurrence[] {
  if (typeof window === 'undefined') return [...initialOccurrences];
  try {
    const raw = localStorage.getItem(OCCURRENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const map = new Map(parsed.map((o: Occurrence) => [o.id, o]));
        initialOccurrences.forEach(io => {
          if (!map.has(io.id)) parsed.push(io);
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_occurrences do localStorage:', e);
  }
  return [...initialOccurrences];
}

export function saveStoredOccurrences(occs: Occurrence[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OCCURRENCES_STORAGE_KEY, JSON.stringify(occs));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_occurrences no localStorage:', e);
  }
}

export function getStoredFines(): SimulatedFine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FINES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_fines do localStorage:', e);
  }
  return [];
}

export function saveStoredFines(fines: SimulatedFine[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FINES_STORAGE_KEY, JSON.stringify(fines));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_fines no localStorage:', e);
  }
}

const CONVERSATIONS_STORAGE_KEY = 'dbsound_conversations';
const MESSAGES_STORAGE_KEY = 'dbsound_messages';

export function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return [...initialConversations];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map(parsed.map((c: Conversation) => [c.id, c]));
        initialConversations.forEach(ic => {
          if (!map.has(ic.id)) parsed.push(ic);
        });
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_conversations do localStorage:', e);
  }
  return [...initialConversations];
}

export function saveStoredConversations(convs: Conversation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(convs));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_conversations no localStorage:', e);
  }
}

export function getStoredMessages(): Record<string, ConversationMessage[]> {
  if (typeof window === 'undefined') return { ...initialMessages };
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...initialMessages, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler dbsound_messages do localStorage:', e);
  }
  return { ...initialMessages };
}

export function saveStoredMessages(msgs: Record<string, ConversationMessage[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgs));
  } catch (e) {
    console.warn('Erro ao salvar dbsound_messages no localStorage:', e);
  }
}

// ============================================================================
// STORE REATIVO LOCAL (Sincroniza com componentes e mantém estado persistente)
// ============================================================================
class LocalDataStore {
  apartments: Apartment[] = getStoredApartments();
  devices = [...initialDevices];
  sensors = [...initialSensors];
  policies = [...initialPolicies];
  profiles: Profile[] = getStoredProfiles();
  alerts = [...initialAlerts];
  occurrences: Occurrence[] = getStoredOccurrences();
  fines: SimulatedFine[] = getStoredFines();
  conversations: Conversation[] = getStoredConversations();
  messages: Record<string, ConversationMessage[]> = getStoredMessages();
  comments: Record<string, OccurrenceComment[]> = { ...initialComments };
  readings: NoiseReading[] = [];
  listeners: Array<() => void> = [];

  constructor() {
    // Aplicar alocações salvas nos perfis locais
    const allocs = getStoredAllocations();
    this.profiles.forEach(p => {
      if (allocs[p.id]) {
        p.apartment_id = allocs[p.id];
        const apt = this.apartments.find(a => a.id === p.apartment_id || (p.apartment_number && a.number === p.apartment_number));
        if (apt) p.apartment_number = apt.number;
      }
    });
  }

  saveApartments() {
    saveStoredApartments(this.apartments);
  }

  saveProfiles() {
    saveStoredProfiles(this.profiles);
  }

  saveOccurrences() {
    saveStoredOccurrences(this.occurrences);
  }

  saveFines() {
    saveStoredFines(this.fines);
  }

  saveConversations() {
    saveStoredConversations(this.conversations);
  }

  saveMessages() {
    saveStoredMessages(this.messages);
  }

  saveProfile(profile: Profile) {
    this.profiles = this.profiles.filter(p => p.id !== profile.id && p.email.toLowerCase() !== profile.email.toLowerCase());
    this.profiles.unshift(profile);
    this.saveProfiles();
    this.notify();
  }

  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  // Executa o exato pipeline unificado no store local respeitando limites customizados do apartamento
  processNoiseReading(reading: NoiseReading) {
    this.readings.unshift(reading);
    if (this.readings.length > 200) this.readings.pop();

    const apt = this.apartments.find(a => a.id === reading.apartment_id);
    if (apt) {
      apt.current_db = reading.decibel;
      apt.peak_db = Math.max(apt.peak_db || 0, reading.decibel);
      apt.avg_db = Number((((apt.avg_db || 50) * 4 + reading.decibel) / 5).toFixed(1));

      // Determinar política vigente e aplicar limites específicos do apartamento se existirem
      const now = new Date();
      const hour = now.getHours();
      const isNight = hour >= 22 || hour < 7;
      
      const warningThreshold = isNight 
        ? (apt.custom_night_threshold_db ?? 60.0) 
        : (apt.custom_day_threshold_db ?? 70.0);
      const criticalThreshold = isNight 
        ? (apt.custom_critical_threshold_db ?? 70.0) 
        : (apt.custom_critical_threshold_db ?? 80.0);

      // Debounce: contar leituras consecutivas/recentes >= limite crítico nos últimos 15 segundos
      const recentCriticals = this.readings.filter(r => 
        r.apartment_id === apt.id && 
        r.decibel >= criticalThreshold &&
        (Date.now() - new Date(r.created_at || r.recorded_at || Date.now()).getTime()) <= 15000
      );

      if (reading.decibel >= criticalThreshold) {
        // Exige pelo menos 3 amostras/segundos sustentados para confirmar alerta crítico
        if (recentCriticals.length >= 3) {
          apt.status = 'critical';
          const existingRecentAlert = this.alerts.find(a => 
            a.apartment_id === apt.id && 
            a.severity === 'critical' && 
            !a.read && 
            (Date.now() - new Date(a.created_at).getTime()) <= 30000
          );
          if (!existingRecentAlert) {
            const newAlert: Alert = {
              id: `alt-${Date.now()}`,
              apartment_id: apt.id,
              type: 'high_noise',
              title: 'ALERTA!! RUÍDO CRÍTICO DETECTADO',
              message: `Nível sonoro atingiu ${reading.decibel.toFixed(1)} dB no apartamento ${apt.number} (limite: ${criticalThreshold} dB) por mais de 3 segundos.`,
              severity: 'critical',
              read: false,
              created_at: new Date().toISOString(),
              apartment_number: apt.number,
            };
            this.alerts.unshift(newAlert);
          }
        } else {
          // Ruído pontual: decibelímetro atualiza para o valor real, mas status fica em warning sem disparar falso alerta crítico
          apt.status = 'warning';
        }
      } else if (reading.decibel >= warningThreshold) {
        apt.status = 'warning';
        const existingRecentAlert = this.alerts.find(a => 
          a.apartment_id === apt.id && 
          a.severity === 'warning' && 
          !a.read && 
          (Date.now() - new Date(a.created_at).getTime()) <= 30000
        );
        if (!existingRecentAlert) {
          const newAlert: Alert = {
            id: `alt-${Date.now()}`,
            apartment_id: apt.id,
            type: 'high_noise',
            title: 'Aviso: Nível de Ruído Elevado',
            message: `Nível sonoro atingiu ${reading.decibel.toFixed(1)} dB no apartamento ${apt.number} (limite: ${warningThreshold} dB).`,
            severity: 'warning',
            read: false,
            created_at: new Date().toISOString(),
            apartment_number: apt.number,
          };
          this.alerts.unshift(newAlert);
        }
      } else {
        apt.status = 'normal';
      }

      this.saveApartments();
    }

    this.notify();
  }
}

export const localStore = new LocalDataStore();

// ============================================================================
// DATA SERVICE API (Camada de dados unificada, resiliente e autônoma)
// ============================================================================
export const DataService = {
  // HELPER: Resolve ou cria dinamicamente o ID do bloco no Supabase
  async getOrCreateBuildingId(): Promise<string> {
    if (!isSupabaseConfigured || !supabase) return DEFAULT_BUILDING_ID;
    try {
      // 1. Tenta buscar edifício existente
      const { data: bldgs } = await supabase.from('buildings').select('id, condominium_id').limit(1);
      if (bldgs && bldgs.length > 0 && bldgs[0].id) {
        return bldgs[0].id;
      }

      // 2. Se não encontrou, busca ou cria condomínio
      let condoId = DEFAULT_CONDO_ID;
      const { data: condos } = await supabase.from('condominiums').select('id').limit(1);
      if (condos && condos.length > 0 && condos[0].id) {
        condoId = condos[0].id;
      } else {
        const { data: newCondo } = await supabase.from('condominiums').insert({
          id: DEFAULT_CONDO_ID,
          name: 'Condomínio Residencial Parque das Flores',
          address: 'Av. das Nações Unidas, 1000'
        }).select('id').maybeSingle();
        if (newCondo?.id) condoId = newCondo.id;
      }

      // 3. Insere edifício vinculado
      const { data: newBldg } = await supabase.from('buildings').insert({
        id: DEFAULT_BUILDING_ID,
        condominium_id: condoId,
        name: 'Bloco Principal'
      }).select('id').maybeSingle();

      if (newBldg?.id) return newBldg.id;
    } catch (e) {
      console.warn('Erro ao resolver building_id dinamicamente:', e);
    }
    return DEFAULT_BUILDING_ID;
  },

  // APARTAMENTOS
  async getApartments(): Promise<Apartment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('apartments').select('*').order('number');
        if (!error && data && data.length > 0) {
          // Merge inteligente: Supabase + locais não duplicados
          const supaApts = (data as Apartment[]).map(sa => {
            const local = localStore.apartments.find(la => la.id === sa.id || la.number === sa.number);
            return {
              ...sa,
              current_db: sa.current_db != null ? Number(sa.current_db) : (local?.current_db ?? 40.0),
              peak_db: sa.peak_db != null ? Number(sa.peak_db) : (local?.peak_db ?? 40.0),
              avg_db: sa.avg_db != null ? Number(sa.avg_db) : (local?.avg_db ?? 40.0),
              status: sa.status || local?.status || 'normal',
            };
          });
          const supaMap = new Map(supaApts.map(a => [a.id, a]));
          const localOnly = localStore.apartments.filter(
            la => !supaMap.has(la.id) && !supaApts.some(sa => sa.number === la.number)
          );
          const merged = [...supaApts, ...localOnly];
          localStore.apartments = merged;
          localStore.saveApartments();
          return merged;
        }
      } catch (e) {
        console.warn('Erro ao carregar apartamentos do Supabase:', e);
      }
    }
    return localStore.apartments;
  },

  async getApartmentById(id: string): Promise<Apartment | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('apartments').select('*').eq('id', id).single();
        if (!error && data) return data as Apartment;
      } catch (e) {
        console.warn('Erro ao consultar apartamento por ID no Supabase:', e);
      }
    }
    return localStore.apartments.find(a => a.id === id) || null;
  },

  async createApartment(dto: CreateApartmentDTO): Promise<Apartment> {
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`.slice(0, 36);

    let buildingId = dto.building_id || DEFAULT_BUILDING_ID;

    const newApt: Apartment = {
      id: generatedId,
      building_id: buildingId,
      number: dto.number,
      floor: dto.floor || 1,
      current_db: 40.0,
      status: 'normal',
      peak_db: 40.0,
      avg_db: 40.0,
      custom_day_threshold_db: dto.custom_day_threshold_db ?? 70.0,
      custom_night_threshold_db: dto.custom_night_threshold_db ?? 60.0,
      custom_critical_threshold_db: dto.custom_critical_threshold_db ?? 80.0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      // 1. Tenta RPC segura SECURITY DEFINER
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_apartment_and_assign', {
          p_number: newApt.number,
          p_floor: newApt.floor,
          p_day_db: newApt.custom_day_threshold_db,
          p_night_db: newApt.custom_night_threshold_db,
          p_crit_db: newApt.custom_critical_threshold_db,
          p_profile_id: null,
        });

        if (!rpcError && rpcData?.success && rpcData.apartment) {
          const created = rpcData.apartment as Apartment;
          localStore.apartments = localStore.apartments.filter(a => a.id !== created.id && a.number !== created.number);
          localStore.apartments.push(created);
          localStore.saveApartments();
          localStore.notify();
          return created;
        }
      } catch (err) {
        console.warn('create_apartment_and_assign RPC indisponível, tentando fallback dinâmico:', err);
      }

      // 2. Fallback: resolve building_id real e insere direto
      try {
        buildingId = await this.getOrCreateBuildingId();
        newApt.building_id = buildingId;

        // Tentativa A: com todas as colunas
        let { data, error } = await supabase.from('apartments').insert({
          id: newApt.id,
          building_id: buildingId,
          number: newApt.number,
          floor: newApt.floor,
          custom_day_threshold_db: newApt.custom_day_threshold_db,
          custom_night_threshold_db: newApt.custom_night_threshold_db,
          custom_critical_threshold_db: newApt.custom_critical_threshold_db,
        }).select().single();

        // Tentativa B: se falhou (ex: colunas custom ainda não migradas no Postgres), insere campos básicos
        if (error) {
          const fallback = await supabase.from('apartments').insert({
            id: newApt.id,
            building_id: buildingId,
            number: newApt.number,
            floor: newApt.floor,
          }).select().single();
          if (!fallback.error && fallback.data) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && data) {
          const created: Apartment = {
            ...newApt,
            ...data,
          };
          localStore.apartments = localStore.apartments.filter(a => a.id !== created.id && a.number !== created.number);
          localStore.apartments.push(created);
          localStore.saveApartments();
          localStore.notify();
          return created;
        } else if (error) {
          console.warn('Aviso: insert no Supabase bloqueado por RLS ou FK, mantendo no storage persistente:', error);
        }
      } catch (err) {
        console.warn('Exceção ao inserir apartamento no Supabase:', err);
      }
    }

    // Persistência local garantida: o apartamento NUNCA desaparece
    localStore.apartments = localStore.apartments.filter(a => a.number !== newApt.number);
    localStore.apartments.push(newApt);
    localStore.saveApartments();
    localStore.notify();
    return newApt;
  },

  async createAndAssignApartment(
    profileId: string, 
    dto: CreateApartmentDTO
  ): Promise<{ success: boolean; apartment?: Apartment; message?: string }> {
    // 1. Garante a criação do apartamento (local + remoto resiliente)
    const apt = await this.createApartment(dto);

    // 2. Aloca o morador para este apartamento recém-criado
    await this.assignResidentToApartment(profileId, apt.id);

    return {
      success: true,
      apartment: apt,
    };
  },

  async updateApartmentThresholds(dto: UpdateApartmentThresholdsDTO): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('apartments').update({
          custom_day_threshold_db: dto.custom_day_threshold_db,
          custom_night_threshold_db: dto.custom_night_threshold_db,
          custom_critical_threshold_db: dto.custom_critical_threshold_db,
        }).eq('id', dto.apartmentId);
      } catch (e) {
        console.warn('Erro ao atualizar limites no Supabase:', e);
      }
    }

    const apt = localStore.apartments.find(a => a.id === dto.apartmentId);
    if (apt) {
      if (dto.custom_day_threshold_db !== undefined) apt.custom_day_threshold_db = dto.custom_day_threshold_db ?? undefined;
      if (dto.custom_night_threshold_db !== undefined) apt.custom_night_threshold_db = dto.custom_night_threshold_db ?? undefined;
      if (dto.custom_critical_threshold_db !== undefined) apt.custom_critical_threshold_db = dto.custom_critical_threshold_db ?? undefined;
      localStore.saveApartments();
      localStore.notify();
      return true;
    }
    return false;
  },

  async deleteApartment(apartmentId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('apartments').delete().eq('id', apartmentId);
      } catch (e) {
        console.warn('Erro ao deletar apartamento no Supabase:', e);
      }
    }

    localStore.apartments = localStore.apartments.filter(a => a.id !== apartmentId);
    localStore.saveApartments();

    // Desvincular moradores locais
    localStore.profiles.forEach(p => {
      if (p.apartment_id === apartmentId) {
        p.apartment_id = null;
        p.apartment_number = undefined;
        saveStoredAllocation(p.id, null);
      }
    });

    localStore.devices = localStore.devices.filter(d => d.apartment_id !== apartmentId);
    localStore.notify();
    return true;
  },

  async clearMockApartments(): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.rpc('clear_mock_apartments');
      } catch (e) {
        console.warn('Erro na RPC clear_mock_apartments:', e);
      }
    }

    localStore.apartments = [];
    localStore.saveApartments();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ALLOC_STORAGE_KEY);
    }
    localStore.devices = [];
    localStore.sensors = [];
    localStore.alerts = [];
    localStore.readings = [];
    localStore.profiles.forEach(p => {
      if (p.role === 'resident') {
        p.apartment_id = null;
        p.apartment_number = undefined;
      }
    });
    localStore.notify();
    return true;
  },

  // PERFIS E GESTÃO DE MORADORES
  async saveProfile(profile: Profile): Promise<Profile> {
    const computedStatus = profile.role === 'admin' 
      ? 'approved' 
      : (profile.apartment_id 
          ? (profile.status === 'blocked' ? 'blocked' : 'approved') 
          : (profile.status || 'pending'));

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Obter condomínio válido existente no banco para não violar FK
        let condoId = profile.condominium_id;
        try {
          const { data: condoData } = await supabase.from('condominiums').select('id').limit(1).maybeSingle();
          if (condoData?.id) {
            condoId = condoData.id;
          }
        } catch {
          // Ignora se consulta falhar
        }

        const payload = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || null,
          role: profile.role || 'resident',
          status: computedStatus,
          condominium_id: condoId || DEFAULT_CONDO_ID,
          apartment_id: profile.apartment_id || null,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 2. Tenta upsert direto
        const { error: upsertErr } = await supabase.from('profiles').upsert(payload);

        if (upsertErr) {
          console.warn('Upsert direto em profiles falhou, tentando fallback via RPC/insert:', upsertErr.message);

          // 3. Tenta RPC get_or_create_profile
          try {
            await supabase.rpc('get_or_create_profile', {
              p_user_id: profile.id,
              p_email: profile.email,
              p_full_name: profile.full_name,
            });
          } catch (rpcErr) {
            console.warn('RPC get_or_create_profile falhou:', rpcErr);
          }

          // 4. Se tiver apartment_id, tenta atualizar
          if (profile.apartment_id) {
            try {
              await supabase.from('profiles').update({
                apartment_id: profile.apartment_id,
                status: 'approved',
                updated_at: new Date().toISOString()
              }).eq('id', profile.id);
            } catch {
              // fallback local
            }
          }
        }
      } catch (e) {
        console.warn('Exceção ao persistir perfil no Supabase:', e);
      }
    }

    const savedProf: Profile = {
      ...profile,
      status: computedStatus,
    };
    localStore.saveProfile(savedProf);
    return savedProf;
  },

  async getProfiles(): Promise<Profile[]> {
    const allocs = getStoredAllocations();

    if (isSupabaseConfigured && supabase) {
      try {
        let rawProfiles: any[] | null = null;

        // 1. TENTA RPC DE SINCRONIZAÇÃO TOTAL COM AUTH.USERS
        try {
          const { data: syncedData, error: syncError } = await supabase.rpc('sync_and_get_all_profiles');
          if (!syncError && syncedData && Array.isArray(syncedData) && syncedData.length > 0) {
            rawProfiles = syncedData;
          }
        } catch (rpcErr) {
          console.warn('RPC sync_and_get_all_profiles ainda não aplicada no Supabase:', rpcErr);
        }

        // 2. Se a RPC não estiver disponível, consulta direta da tabela profiles
        if (!rawProfiles) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*, apartments(number)')
            .order('created_at', { ascending: false });

          if (!error && data) {
            rawProfiles = data;
          } else {
            const { data: rawData } = await supabase
              .from('profiles')
              .select('*')
              .order('created_at', { ascending: false });
            if (rawData) rawProfiles = rawData;
          }
        }

        if (rawProfiles && Array.isArray(rawProfiles)) {
          const mapped: Profile[] = rawProfiles.map((p: any) => {
            const savedAptId = allocs[p.id] || p.apartment_id;
            const apt = localStore.apartments.find(a => a.id === savedAptId || (p.apartment_number && a.number === p.apartment_number));
            const statusVal = p.role === 'admin'
              ? 'approved'
              : (savedAptId 
                  ? (p.status === 'blocked' ? 'blocked' : 'approved') 
                  : (p.status || 'pending'));

            return {
              ...p,
              status: statusVal,
              apartment_id: savedAptId || apt?.id || null,
              apartment_number: p.apartments?.number || apt?.number || p.apartment_number || undefined,
            };
          });

          // Smart merge: preserva perfis locais/demo, mas prioriza registros reais vindos da nuvem
          const supaIds = new Set(mapped.map(m => m.id));
          const supaEmails = new Set(mapped.map(m => m.email.toLowerCase()));
          const localOnly = localStore.profiles.filter(lp => !supaIds.has(lp.id) && !supaEmails.has(lp.email.toLowerCase()));
          const merged = [...mapped, ...localOnly];

          localStore.profiles = merged;
          localStore.saveProfiles();
          return merged;
        }
      } catch (err) {
        console.warn('Erro ao buscar perfis:', err);
      }
    }

    // Aplica alocações salvas nos perfis locais
    localStore.profiles.forEach(p => {
      if (allocs[p.id]) {
        p.apartment_id = allocs[p.id];
        p.status = 'approved';
        const apt = localStore.apartments.find(a => a.id === p.apartment_id || (p.apartment_number && a.number === p.apartment_number));
        if (apt) p.apartment_number = apt.number;
      }
    });

    return localStore.profiles;
  },

  async getPendingResidents(): Promise<Profile[]> {
    const profiles = await this.getProfiles();
    return profiles.filter(p => p.role === 'resident' && (!p.apartment_id || p.status === 'pending'));
  },

  async getAssignedResidents(): Promise<Profile[]> {
    const profiles = await this.getProfiles();
    return profiles.filter(p => p.role === 'resident' && Boolean(p.apartment_id) && p.status === 'approved');
  },

  async assignResidentToApartment(profileId: string, apartmentId: string): Promise<boolean> {
    const apt = localStore.apartments.find(a => a.id === apartmentId);
    let aptNumber = apt?.number || 'N/A';

    if (isSupabaseConfigured && supabase) {
      // 1. Assegura que o apartamento existe na tabela apartments do Supabase (impede FK violation)
      try {
        const { data: existingApt } = await supabase.from('apartments').select('id, number').eq('id', apartmentId).maybeSingle();
        if (!existingApt && apt) {
          await supabase.from('apartments').insert({
            id: apt.id,
            building_id: apt.building_id || DEFAULT_BUILDING_ID,
            number: apt.number,
            floor: apt.floor || 1,
            custom_day_threshold_db: apt.custom_day_threshold_db ?? 70,
            custom_night_threshold_db: apt.custom_night_threshold_db ?? 60,
            custom_critical_threshold_db: apt.custom_critical_threshold_db ?? 80,
          });
        }
      } catch (e) {
        console.warn('Aviso: falha preventiva ao garantir apartamento no Supabase:', e);
      }

      // 2. Tenta RPC atômica com SECURITY DEFINER
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('assign_resident_to_apartment', {
          p_profile_id: profileId,
          p_apartment_id: apartmentId,
        });

        if (!rpcError && rpcData?.success) {
          if (rpcData.apartment_number) aptNumber = rpcData.apartment_number;
        } else {
          // 3. Fallback: Update direto na tabela profiles com status='approved'
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              apartment_id: apartmentId,
              status: 'approved',
              role: 'resident',
              updated_at: new Date().toISOString()
            })
            .eq('id', profileId);

          if (updateError) {
            console.warn('Update direto em profiles falhou, tentando update sem coluna status:', updateError);
            try {
              await supabase
                .from('profiles')
                .update({
                  apartment_id: apartmentId,
                  updated_at: new Date().toISOString()
                })
                .eq('id', profileId);
            } catch {
              // fallback local
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar alocação no Supabase:', err);
      }
    }

    // Atualiza localStore e salva persistência local garantida
    let p = localStore.profiles.find(prof => prof.id === profileId);
    if (p) {
      p.apartment_id = apartmentId;
      p.apartment_number = aptNumber;
      p.status = 'approved';
      p.updated_at = new Date().toISOString();
      localStore.saveProfile(p);
      await this.saveProfile(p);
    } else {
      const newP: Profile = {
        id: profileId,
        full_name: 'Morador Alocado',
        email: '',
        role: 'resident',
        status: 'approved',
        condominium_id: DEFAULT_CONDO_ID,
        apartment_id: apartmentId,
        apartment_number: aptNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStore.saveProfile(newP);
      await this.saveProfile(newP);
    }
    saveStoredAllocation(profileId, apartmentId);
    localStore.notify();
    return true;
  },

  async unassignResident(profileId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('unassign_resident_from_apartment', {
          p_profile_id: profileId,
        });
        if (error || !data?.success) {
          const { error: updErr } = await supabase
            .from('profiles')
            .update({ apartment_id: null, status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', profileId);
          if (updErr) {
            await supabase
              .from('profiles')
              .update({ apartment_id: null, updated_at: new Date().toISOString() })
              .eq('id', profileId);
          }
        }
      } catch (err) {
        try {
          await supabase
            .from('profiles')
            .update({ apartment_id: null, status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', profileId);
        } catch {
          // fallback
        }
      }
    }

    const p = localStore.profiles.find(prof => prof.id === profileId);
    if (p) {
      p.apartment_id = null;
      p.status = 'pending';
      p.apartment_number = undefined;
      p.updated_at = new Date().toISOString();
      localStore.saveProfile(p);
      await this.saveProfile(p);
    }
    saveStoredAllocation(profileId, null);
    localStore.notify();
    return true;
  },

  async deleteResident(profileId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', profileId);
      } catch (e) {
        console.warn('Erro ao deletar perfil no Supabase:', e);
      }
    }

    localStore.profiles = localStore.profiles.filter(p => p.id !== profileId);
    saveStoredAllocation(profileId, null);
    localStore.notify();
    return true;
  },

  async getUserHistory(profileId: string): Promise<UserHistoryReport | null> {
    const profiles = await this.getProfiles();
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return null;

    const apt = profile.apartment_id 
      ? await this.getApartmentById(profile.apartment_id) 
      : null;

    // Alertas da unidade
    const allAlerts = await this.getAlerts(100);
    const userAlerts = profile.apartment_id 
      ? allAlerts.filter(a => a.apartment_id === profile.apartment_id) 
      : [];

    // Ocorrências vinculadas
    const allOccurrences = await this.getOccurrences();
    const userOccurrences = allOccurrences.filter(o => 
      o.reporter_id === profile.id || 
      (profile.apartment_id && o.apartment_id === profile.apartment_id)
    );

    // Leituras da unidade
    const userReadings = profile.apartment_id 
      ? localStore.readings.filter(r => r.apartment_id === profile.apartment_id).slice(0, 30)
      : [];

    const daysActive = Math.max(1, Math.round((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)));

    return {
      profile,
      apartment: apt,
      alerts: userAlerts,
      occurrences: userOccurrences,
      recentReadings: userReadings,
      stats: {
        totalAlerts: userAlerts.length,
        totalOccurrences: userOccurrences.length,
        peakDbRecorded: apt?.peak_db || 0,
        daysActive,
      }
    };
  },

  // DISPOSITIVOS
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

  // SENSORES
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

  // POLÍTICAS
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

  // ALERTAS
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

  // OCORRÊNCIAS & DENÚNCIAS
  async createOccurrence(dto: Partial<Occurrence>): Promise<Occurrence> {
    let aptNumber = dto.apartment_number;
    if (!aptNumber && dto.apartment_id) {
      const apt = localStore.apartments.find(a => a.id === dto.apartment_id);
      if (apt) aptNumber = apt.number;
    }

    const newOcc: Occurrence = {
      id: dto.id || `occ-${Date.now()}`,
      condominium_id: dto.condominium_id || DEFAULT_CONDO_ID,
      reporter_id: dto.anonymous ? undefined : dto.reporter_id,
      apartment_id: dto.apartment_id || null,
      apartment_number: aptNumber || dto.location?.replace(/[^0-9]/g, '') || undefined,
      type: dto.type || 'Música Alta / Som Excessivo',
      location: dto.location || (aptNumber ? `Apartamento ${aptNumber}` : 'Área Residencial'),
      description: dto.description || '',
      occurred_at: dto.occurred_at || new Date().toISOString(),
      status: (dto.status as OccurrenceStatus) || 'aberta',
      priority: dto.priority || 'media',
      anonymous: Boolean(dto.anonymous),
      reporter_name: dto.anonymous ? 'Morador Anônimo' : (dto.reporter_name || 'Morador'),
      noise_level_db: dto.noise_level_db,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const supaPayload: any = {
          id: newOcc.id.includes('-') && newOcc.id.length === 36 ? newOcc.id : undefined,
          condominium_id: newOcc.condominium_id,
          reporter_id: newOcc.anonymous ? null : (newOcc.reporter_id || null),
          apartment_id: newOcc.apartment_id || null,
          type: newOcc.type,
          location: newOcc.location,
          description: newOcc.description,
          occurred_at: newOcc.occurred_at,
          status: newOcc.status,
          priority: newOcc.priority,
          anonymous: newOcc.anonymous,
          apartment_number: newOcc.apartment_number,
          noise_level_db: newOcc.noise_level_db,
          created_at: newOcc.created_at,
          updated_at: newOcc.updated_at,
        };
        const { data, error } = await supabase.from('occurrences').insert(supaPayload).select().single();
        if (!error && data) {
          newOcc.id = data.id;
        }
      } catch (err) {
        console.warn('Erro ao inserir ocorrência no Supabase:', err);
      }
    }

    localStore.occurrences.unshift(newOcc);
    localStore.saveOccurrences();
    localStore.notify();
    return newOcc;
  },

  async getOccurrences(): Promise<Occurrence[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('occurrences')
          .select('*, apartments(number)')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const supaOccs: Occurrence[] = data.map((o: any) => ({
            ...o,
            apartment_number: o.apartments?.number || o.apartment_number || o.location?.replace(/[^0-9]/g, '') || undefined,
            reporter_name: o.anonymous ? 'Morador Anônimo' : (o.reporter_name || 'Morador')
          }));

          // Merge inteligente preservando registros locais
          const supaIds = new Set(supaOccs.map(s => s.id));
          const localOnly = localStore.occurrences.filter(lo => !supaIds.has(lo.id));
          const merged = [...supaOccs, ...localOnly];
          localStore.occurrences = merged;
          localStore.saveOccurrences();
          return merged;
        }
      } catch (e) {
        console.warn('Erro ao carregar ocorrências do Supabase:', e);
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
      localStore.saveOccurrences();
      localStore.notify();
    }
  },

  async decideOccurrence(id: string, decision: OccurrenceStatus, notes?: string, authorName = 'Síndico Geral'): Promise<boolean> {
    const decisionAt = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('occurrences').update({
          status: decision,
          decision,
          syndic_notes: notes || null,
          decision_at: decisionAt,
          updated_at: decisionAt,
        }).eq('id', id);
      } catch (e) {
        console.warn('Erro ao registrar decisão no Supabase:', e);
      }
    }

    const occ = localStore.occurrences.find(o => o.id === id);
    if (occ) {
      occ.status = decision;
      occ.decision = decision;
      occ.syndic_notes = notes;
      occ.decision_at = decisionAt;
      occ.updated_at = decisionAt;
      localStore.saveOccurrences();
    }

    // Registra entrada de auditoria nos comentários
    const auditText = `[DECISÃO DO SÍNDICO: ${decision.toUpperCase()}] ${notes ? 'Parecer: ' + notes : 'Decisão registrada no sistema.'}`;
    await this.addComment(id, 'admin1', auditText, authorName);

    localStore.notify();
    return true;
  },

  async getComments(occurrenceId: string): Promise<OccurrenceComment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('occurrence_comments').select('*, profiles(full_name)').eq('occurrence_id', occurrenceId).order('created_at', { ascending: true });
      if (data) {
        return data.map((c: any) => ({
          ...c,
          author_name: c.profiles?.full_name || 'Administrador'
        }));
      }
    }
    return localStore.comments[occurrenceId] || [];
  },

  async addComment(occurrenceId: string, authorId: string, comment: string, authorName?: string): Promise<OccurrenceComment> {
    const newComment: OccurrenceComment = {
      id: `comm-${Date.now()}`,
      occurrence_id: occurrenceId,
      author_id: authorId,
      comment,
      created_at: new Date().toISOString(),
      author_name: authorName || 'Administrador'
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('occurrence_comments').insert({
        occurrence_id: occurrenceId,
        author_id: authorId,
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

  // MULTAS E COBRANÇAS SIMULADAS
  async getFines(): Promise<SimulatedFine[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('fines').select('*, apartments(number)').order('created_at', { ascending: false });
        if (!error && data && Array.isArray(data)) {
          const mapped: SimulatedFine[] = data.map((f: any) => ({
            ...f,
            apartment_number: f.apartments?.number || f.apartment_number || 'N/A'
          }));
          const supaIds = new Set(mapped.map(m => m.id));
          const localOnly = localStore.fines.filter(lf => !supaIds.has(lf.id));
          const merged = [...mapped, ...localOnly];
          localStore.fines = merged;
          localStore.saveFines();
          return merged;
        }
      } catch (e) {
        console.warn('Erro ao carregar multas do Supabase:', e);
      }
    }
    return localStore.fines;
  },

  async getFinesByApartment(apartmentId: string): Promise<SimulatedFine[]> {
    const fines = await this.getFines();
    return fines.filter(f => f.apartment_id === apartmentId);
  },

  async createFine(dto: CreateFineDTO): Promise<SimulatedFine> {
    const apt = localStore.apartments.find(a => a.id === dto.apartment_id);
    const aptNumber = dto.apartment_number || apt?.number || 'N/A';

    // Gera cobrança via BillingProvider desacoplado
    const charge = await currentBillingProvider.createCharge({
      amount: dto.amount,
      description: dto.reason,
      dueDate: dto.due_date,
      apartmentNumber: aptNumber,
      occurrenceId: dto.occurrence_id,
    });

    const fine: SimulatedFine = {
      id: charge.chargeId,
      condominium_id: DEFAULT_CONDO_ID,
      apartment_id: dto.apartment_id,
      apartment_number: aptNumber,
      occurrence_id: dto.occurrence_id,
      fine_number: charge.fineNumber,
      reason: dto.reason,
      amount: Number(dto.amount),
      due_date: dto.due_date,
      issue_date: charge.issueDate,
      status: 'pendente',
      syndic_notes: dto.syndic_notes,
      barcode: charge.barcode,
      barcode_line: charge.barcode,
      qr_code_pix: charge.qrCodePix,
      pix_payload: charge.qrCodePix,
      provider: charge.provider,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('fines').insert({
          id: fine.id.includes('-') && fine.id.length === 36 ? fine.id : undefined,
          condominium_id: fine.condominium_id,
          apartment_id: fine.apartment_id,
          occurrence_id: fine.occurrence_id || null,
          fine_number: fine.fine_number,
          reason: fine.reason,
          amount: fine.amount,
          due_date: fine.due_date,
          issue_date: fine.issue_date,
          status: fine.status,
          syndic_notes: fine.syndic_notes,
          barcode: fine.barcode,
          qr_code_pix: fine.qr_code_pix,
          provider: fine.provider,
        });
      } catch (err) {
        console.warn('Erro ao inserir multa no Supabase:', err);
      }
    }

    // Se vinculada a uma ocorrência, atualiza o status da ocorrência para 'multa'
    if (dto.occurrence_id) {
      await this.decideOccurrence(
        dto.occurrence_id,
        'multa',
        `Multa ${fine.fine_number} no valor de R$ ${fine.amount.toFixed(2)} aplicada com vencimento para ${fine.due_date}. Motivo: ${fine.reason}`
      );
    }

    localStore.fines.unshift(fine);
    localStore.saveFines();
    localStore.notify();
    return fine;
  },

  async simulatePayFine(fineId: string): Promise<boolean> {
    const paidAt = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('fines').update({ status: 'paga', paid_at: paidAt, updated_at: paidAt }).eq('id', fineId);
      } catch (e) {
        console.warn('Erro ao atualizar pagamento da multa no Supabase:', e);
      }
    }

    const fine = localStore.fines.find(f => f.id === fineId);
    if (fine) {
      fine.status = 'paga';
      fine.paid_at = paidAt;
      fine.updated_at = paidAt;
      localStore.saveFines();
    }
    localStore.notify();
    return true;
  },

  // ============================================================================
  // CONVERSAS, CHAT BIDIRECIONAL E CHAT PREVENTIVO
  // ============================================================================
  async getConversations(apartmentId?: string): Promise<Conversation[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('conversations').select('*, apartments(number)').order('updated_at', { ascending: false });
        if (apartmentId) {
          query = query.eq('apartment_id', apartmentId);
        }
        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          const mapped: Conversation[] = data.map((c: any) => ({
            ...c,
            apartment_number: c.apartments?.number || c.apartment_number || 'N/A'
          }));
          const supaIds = new Set(mapped.map(m => m.id));
          const localOnly = localStore.conversations.filter(lc => !supaIds.has(lc.id));
          const merged = [...mapped, ...localOnly];
          localStore.conversations = merged;
          localStore.saveConversations();
        }
      } catch (e) {
        console.warn('Erro ao carregar conversas do Supabase:', e);
      }
    }

    let result = localStore.conversations;
    if (apartmentId) {
      result = result.filter(c => c.apartment_id === apartmentId);
    }

    // Calcula unread_count e last_message para cada conversa
    return result.map(conv => {
      const msgs = localStore.messages[conv.id] || [];
      const unread = msgs.filter(m => !m.read).length;
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].message : conv.last_message;
      return {
        ...conv,
        last_message: lastMsg,
        unread_count: unread,
      };
    });
  },

  async getConversationById(id: string): Promise<Conversation | null> {
    const convs = await this.getConversations();
    return convs.find(c => c.id === id) || null;
  },

  async getConversationByOccurrenceId(occurrenceId: string): Promise<Conversation | null> {
    const convs = await this.getConversations();
    return convs.find(c => c.occurrence_id === occurrenceId) || null;
  },

  async createConversation(dto: CreateConversationDTO): Promise<Conversation> {
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`.slice(0, 36);

    const title = dto.title || dto.subject || 'Conversa com Morador';
    const aptId = dto.apartment_id || (localStore.apartments[0]?.id || '00000000-0000-0000-0000-000000000101');
    let aptNumber = dto.apartment_number;
    if (!aptNumber && aptId) {
      const apt = localStore.apartments.find(a => a.id === aptId);
      if (apt) aptNumber = apt.number;
    }

    const newConv: Conversation = {
      id: generatedId,
      condominium_id: dto.condominium_id || DEFAULT_CONDO_ID,
      apartment_id: aptId,
      apartment_number: aptNumber,
      occurrence_id: dto.occurrence_id || null,
      created_by: dto.sender_id,
      title: title,
      subject: title,
      type: dto.type,
      status: 'aberta',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: dto.initial_message,
      unread_count: dto.initial_message ? 1 : 0,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('conversations').insert({
          id: newConv.id.includes('-') && newConv.id.length === 36 ? newConv.id : undefined,
          condominium_id: newConv.condominium_id,
          apartment_id: newConv.apartment_id,
          occurrence_id: newConv.occurrence_id,
          created_by: newConv.created_by || null,
          title: newConv.title,
          type: newConv.type,
          status: newConv.status,
          created_at: newConv.created_at,
          updated_at: newConv.updated_at,
        });
      } catch (err) {
        console.warn('Erro ao inserir conversa no Supabase:', err);
      }
    }

    localStore.conversations.unshift(newConv);
    localStore.saveConversations();

    if (dto.initial_message) {
      await this.sendMessage({
        conversation_id: newConv.id,
        sender_id: dto.sender_id,
        sender_name: dto.sender_name || 'Síndico Geral',
        sender_role: 'syndic',
        message: dto.initial_message,
        content: dto.initial_message,
      });
    }

    localStore.notify();
    return newConv;
  },

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && data && Array.isArray(data)) {
          const supaIds = new Set(data.map(m => m.id));
          const localMsgs = localStore.messages[conversationId] || [];
          const localOnly = localMsgs.filter(lm => !supaIds.has(lm.id));
          const merged = [...data, ...localOnly];
          localStore.messages[conversationId] = merged;
          localStore.saveMessages();
          return merged;
        }
      } catch (e) {
        console.warn('Erro ao carregar mensagens do Supabase:', e);
      }
    }

    return localStore.messages[conversationId] || [];
  },

  async sendMessage(dto: SendMessageDTO): Promise<ConversationMessage> {
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}`.slice(0, 36);

    const now = new Date().toISOString();
    const msgText = dto.message || dto.content || '';
    const newMsg: ConversationMessage = {
      id: generatedId,
      conversation_id: dto.conversation_id,
      sender_id: dto.sender_id,
      recipient_id: dto.recipient_id,
      sender_name: dto.sender_name,
      sender_role: dto.sender_role || (dto.sender_name.toLowerCase().includes('síndico') ? 'syndic' : 'resident'),
      message: msgText,
      content: msgText,
      read: false,
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('conversation_messages').insert({
          id: newMsg.id.includes('-') && newMsg.id.length === 36 ? newMsg.id : undefined,
          conversation_id: newMsg.conversation_id,
          sender_id: newMsg.sender_id || null,
          recipient_id: newMsg.recipient_id || null,
          sender_name: newMsg.sender_name,
          message: newMsg.message,
          read: false,
          created_at: newMsg.created_at,
        });

        // Atualiza timestamp da conversa
        await supabase.from('conversations').update({ updated_at: now }).eq('id', dto.conversation_id);
      } catch (err) {
        console.warn('Erro ao inserir mensagem no Supabase:', err);
      }
    }

    if (!localStore.messages[dto.conversation_id]) {
      localStore.messages[dto.conversation_id] = [];
    }
    localStore.messages[dto.conversation_id].push(newMsg);
    localStore.saveMessages();

    // Atualiza conversa local
    const conv = localStore.conversations.find(c => c.id === dto.conversation_id);
    if (conv) {
      conv.updated_at = now;
      conv.last_message = newMsg.message;
      localStore.saveConversations();
    }

    localStore.notify();
    return newMsg;
  },

  async markMessagesAsRead(conversationId: string, currentUserId?: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('conversation_messages').update({ read: true }).eq('conversation_id', conversationId);
        if (currentUserId) {
          query = query.neq('sender_id', currentUserId);
        }
        await query;
      } catch (e) {
        console.warn('Erro ao marcar mensagens lidas no Supabase:', e);
      }
    }

    const msgs = localStore.messages[conversationId];
    if (msgs) {
      msgs.forEach(m => {
        if (!currentUserId || m.sender_id !== currentUserId) {
          m.read = true;
        }
      });
      localStore.saveMessages();
    }

    const conv = localStore.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.unread_count = 0;
      localStore.saveConversations();
    }

    localStore.notify();
  },

  async getUnreadMessagesCount(apartmentId?: string, isSyndic?: boolean): Promise<number> {
    const allConvs = await this.getConversations(apartmentId);
    let totalUnread = 0;

    for (const conv of allConvs) {
      const msgs = localStore.messages[conv.id] || [];
      if (isSyndic) {
        // Mensagens não lidas enviadas por moradores
        totalUnread += msgs.filter(m => !m.read && m.sender_name !== 'Carlos Síndico Geral' && !m.sender_name.toLowerCase().includes('síndico')).length;
      } else {
        // Mensagens não lidas enviadas pela administração
        totalUnread += msgs.filter(m => !m.read && (m.sender_name.toLowerCase().includes('síndico') || m.sender_name.toLowerCase().includes('administração'))).length;
      }
    }
    return totalUnread;
  },

  // PIPELINE ÚNICO: INGESTÃO DE LEITURA (SIMULADOR, MANUAL OU ESP32)
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
      try {
        // 1. Tenta invocar RPC inject_noise_reading atômica
        const { error: rpcErr } = await supabase.rpc('inject_noise_reading', {
          p_apartment_id: data.apartment_id,
          p_decibel: data.decibel,
          p_source: data.source,
          p_is_test_data: data.is_test_data ?? true,
          p_sensor_id: data.sensor_id || null,
          p_device_id: data.device_id || null,
        });

        if (rpcErr) {
          console.warn('RPC inject_noise_reading indisponível, executando fallback direto no Supabase:', rpcErr.message);
          // Inserir leitura
          await supabase.from('noise_readings').insert({
            apartment_id: data.apartment_id,
            decibel: data.decibel,
            source: data.source,
            is_test_data: data.is_test_data ?? true,
            sensor_id: data.sensor_id,
            device_id: data.device_id,
          });

          // Atualizar apartments no banco
          await supabase.from('apartments').update({
            current_db: data.decibel,
            updated_at: new Date().toISOString()
          }).eq('id', data.apartment_id);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar leitura no Supabase:', err);
      }
    }

    localStore.processNoiseReading(reading);
  },

  async getLatestReadingForApartment(apartmentId: string): Promise<NoiseReading | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('noise_readings')
          .select('*')
          .eq('apartment_id', apartmentId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) return data as NoiseReading;
      } catch (e) {
        console.warn('Erro ao buscar última leitura no Supabase:', e);
      }
    }
    return localStore.readings.find(r => r.apartment_id === apartmentId) || null;
  },

  // LIMPEZA SEGURA DE DADOS DE TESTE
  async cleanTestData(): Promise<{ success: boolean; deletedCount: number }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('cleanup_test_data');
        if (!error && data) {
          localStore.apartments.forEach(apt => {
            apt.current_db = 40.0;
            apt.status = 'normal';
          });
          localStore.saveApartments();
          localStore.alerts = localStore.alerts.filter(a => !a.id.startsWith('alt-') && a.severity !== 'critical');
          localStore.readings = localStore.readings.filter(r => !r.is_test_data);
          localStore.notify();
          return { success: true, deletedCount: data.deleted_readings || 0 };
        }
      } catch (e) {
        console.warn('Erro na RPC cleanup_test_data:', e);
      }
    }

    const beforeCount = localStore.readings.length;
    localStore.readings = localStore.readings.filter(r => !r.is_test_data);
    localStore.alerts = localStore.alerts.filter(a => !a.id.startsWith('alt-'));
    
    localStore.apartments.forEach(apt => {
      apt.current_db = 40.0;
      apt.status = 'normal';
    });

    localStore.saveApartments();
    localStore.notify();
    return { success: true, deletedCount: beforeCount - localStore.readings.length };
  }
};
