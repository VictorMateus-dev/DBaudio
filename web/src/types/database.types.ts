export type Role = 'resident' | 'admin';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';
export type NoiseSeverity = 'normal' | 'warning' | 'critical';
export type ReadingSource = 'esp32' | 'manual' | 'simulation';
export type OccurrenceStatus = 'aberta' | 'em análise' | 'resolvida' | 'cancelada';
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
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  condominium_id: string;
  apartment_id?: string;
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
  apartment_id?: string;
  type: string;
  location: string;
  description: string;
  occurred_at: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority;
  anonymous: boolean;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
}

export interface OccurrenceComment {
  id: string;
  occurrence_id: string;
  author_id?: string;
  comment: string;
  created_at: string;
  author_name?: string;
}
