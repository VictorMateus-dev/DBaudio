export type Role = 'resident' | 'admin';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';
export type NoiseSeverity = 'normal' | 'warning' | 'critical';
export type ReadingSource = 'esp32' | 'manual' | 'simulation';
export type OccurrenceStatus = 'aberta' | 'em análise' | 'procedente' | 'improcedente' | 'advertência' | 'multa' | 'resolvida' | 'cancelada';
export type OccurrencePriority = 'baixa' | 'media' | 'alta';

export interface Condominium {
  id: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  condominium_id: string;
  name: string;
  created_at: string;
}

export interface Apartment {
  id: string;
  building_id: string;
  number: string;
  floor?: number;
  created_at: string;
  current_db?: number;
  status?: 'normal' | 'warning' | 'critical' | 'offline';
  peak_db?: number;
  avg_db?: number;
  custom_day_threshold_db?: number;
  custom_night_threshold_db?: number;
  custom_critical_threshold_db?: number;
}

export type ProfileStatus = 'pending' | 'approved' | 'blocked';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  status?: ProfileStatus;
  condominium_id: string;
  apartment_id?: string | null;
  apartment_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  apartment_id: string;
  device_uid: string;
  name: string;
  status: DeviceStatus;
  firmware_version: string;
  secret_token?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  apartment_number?: string;
}

export interface Sensor {
  id: string;
  device_id: string;
  name: string;
  position: string; // Sala, Quarto, Cozinha
  channel: number;
  enabled: boolean;
  created_at: string;
}

export interface NoisePolicy {
  id: string;
  condominium_id: string;
  name: string;
  start_time: string;
  end_time: string;
  threshold_db: number;
  warning_threshold_db: number;
  critical_threshold_db: number;
  min_duration_seconds: number;
  cooldown_seconds: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoiseReading {
  id: string;
  device_id?: string;
  sensor_id?: string;
  apartment_id: string;
  decibel: number;
  source: ReadingSource;
  is_test_data: boolean;
  recorded_at: string;
  created_at: string;
  apartment_number?: string;
  sensor_position?: string;
}

export interface NoiseEvent {
  id: string;
  apartment_id: string;
  device_id?: string;
  sensor_id?: string;
  peak_db: number;
  average_db: number;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
  severity: NoiseSeverity;
  acknowledged: boolean;
  source: ReadingSource;
  created_at: string;
  apartment_number?: string;
}

export interface Alert {
  id: string;
  apartment_id: string;
  event_id?: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'warning' | 'critical';
  read: boolean;
  created_at: string;
  apartment_number?: string;
}

export interface Occurrence {
  id: string;
  condominium_id: string;
  reporter_id?: string;
  apartment_id?: string | null;
  apartment_number?: string;
  type: string;
  location: string;
  description: string;
  occurred_at: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority;
  anonymous: boolean;
  syndic_notes?: string;
  decision?: string;
  decision_at?: string;
  noise_level_db?: number;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
}

export type FineStatus = 'pendente' | 'paga' | 'vencida' | 'cancelada';

export interface SimulatedFine {
  id: string;
  condominium_id: string;
  apartment_id: string;
  apartment_number?: string;
  occurrence_id?: string;
  fine_number: string;
  reason: string;
  amount: number;
  due_date: string;
  issue_date: string;
  status: FineStatus;
  syndic_notes?: string;
  regimental_observation?: string;
  barcode: string;
  barcode_line?: string;
  qr_code_pix?: string;
  pix_payload?: string;
  provider: string;
  paid_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  previous_status?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFineDTO {
  apartment_id: string;
  apartment_number?: string;
  occurrence_id?: string;
  reason: string;
  amount: number;
  due_date: string;
  syndic_notes?: string;
}

export interface CancelFineDTO {
  fine_id: string;
  cancellation_reason: string;
  cancelled_by?: string;
}

export interface OccurrenceComment {
  id: string;
  occurrence_id: string;
  author_id?: string;
  comment: string;
  created_at: string;
  author_name?: string;
}

export type ConversationType = 'ocorrencia' | 'preventivo';
export type ConversationStatus = 'aberta' | 'fechada' | 'arquivada';

export interface Conversation {
  id: string;
  condominium_id: string;
  apartment_id: string;
  apartment_number?: string;
  occurrence_id?: string | null;
  created_by?: string;
  title: string;
  subject?: string;
  type: ConversationType;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id?: string;
  recipient_id?: string;
  sender_name: string;
  sender_role: 'syndic' | 'resident';
  message: string;
  content: string;
  read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface CreateConversationDTO {
  condominium_id?: string;
  apartment_id?: string;
  apartment_number?: string;
  occurrence_id?: string | null;
  type: ConversationType;
  title?: string;
  subject?: string;
  initial_message?: string;
  sender_id?: string;
  sender_name?: string;
}

export interface SendMessageDTO {
  conversation_id: string;
  sender_id?: string;
  recipient_id?: string;
  sender_name: string;
  sender_role?: 'syndic' | 'resident';
  message?: string;
  content?: string;
}

export interface UserHistoryReport {
  profile: Profile;
  apartment?: Apartment | null;
  alerts: Alert[];
  occurrences: Occurrence[];
  recentReadings: NoiseReading[];
  stats: {
    totalAlerts: number;
    totalOccurrences: number;
    peakDbRecorded: number;
    daysActive: number;
  };
}

export interface CreateApartmentDTO {
  number: string;
  floor?: number;
  building_id?: string;
  custom_day_threshold_db?: number;
  custom_night_threshold_db?: number;
  custom_critical_threshold_db?: number;
}

export interface UpdateApartmentThresholdsDTO {
  apartmentId: string;
  custom_day_threshold_db?: number | null;
  custom_night_threshold_db?: number | null;
  custom_critical_threshold_db?: number | null;
}
