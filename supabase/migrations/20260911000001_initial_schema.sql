
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS public.condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.apartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    floor INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('resident', 'admin')),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_resident_apartment CHECK (
        (role = 'resident' AND apartment_id IS NOT NULL) OR
        (role = 'admin')
    )
);


CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    device_uid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'maintenance')) DEFAULT 'offline',
    firmware_version TEXT DEFAULT '1.0.0',
    secret_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL, 
    channel INTEGER NOT NULL, 
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_channel UNIQUE (device_id, channel)
);


CREATE TABLE IF NOT EXISTS public.noise_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Política Padrão',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    threshold_db NUMERIC NOT NULL,
    warning_threshold_db NUMERIC NOT NULL,
    critical_threshold_db NUMERIC NOT NULL,
    min_duration_seconds INTEGER NOT NULL DEFAULT 3,
    cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.noise_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    decibel NUMERIC(5, 2) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('esp32', 'manual', 'simulation')),
    is_test_data BOOLEAN NOT NULL DEFAULT false,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.noise_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    sensor_id UUID REFERENCES public.sensors(id) ON DELETE SET NULL,
    peak_db NUMERIC(5, 2) NOT NULL,
    average_db NUMERIC(5, 2) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('normal', 'warning', 'critical')),
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL CHECK (source IN ('esp32', 'manual', 'simulation')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.noise_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'high_noise',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
    type TEXT NOT NULL, 
    location TEXT NOT NULL, 
    description TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('aberta', 'em análise', 'resolvida', 'cancelada')) DEFAULT 'aberta',
    priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta')) DEFAULT 'media',
    anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.occurrence_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id UUID NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_apartments_building ON public.apartments(building_id);
CREATE INDEX IF NOT EXISTS idx_buildings_condominium ON public.buildings(condominium_id);
CREATE INDEX IF NOT EXISTS idx_profiles_condominium ON public.profiles(condominium_id);
CREATE INDEX IF NOT EXISTS idx_profiles_apartment ON public.profiles(apartment_id);
CREATE INDEX IF NOT EXISTS idx_devices_apartment ON public.devices(apartment_id);
CREATE INDEX IF NOT EXISTS idx_devices_uid ON public.devices(device_uid);
CREATE INDEX IF NOT EXISTS idx_sensors_device ON public.sensors(device_id);

CREATE INDEX IF NOT EXISTS idx_noise_readings_apt_time ON public.noise_readings(apartment_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_noise_readings_device ON public.noise_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_noise_readings_test ON public.noise_readings(is_test_data);

CREATE INDEX IF NOT EXISTS idx_noise_events_apt_time ON public.noise_events(apartment_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_noise_events_severity ON public.noise_events(severity);

CREATE INDEX IF NOT EXISTS idx_alerts_apt_read ON public.alerts(apartment_id, read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_occurrences_condo ON public.occurrences(condominium_id, status);
CREATE INDEX IF NOT EXISTS idx_occurrences_reporter ON public.occurrences(reporter_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_created_at ON public.occurrences(created_at DESC);


CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_apartment_id()
RETURNS UUID AS $$
    SELECT apartment_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_condominium_id()
RETURNS UUID AS $$
    SELECT condominium_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e moradores veem seu condomínio" ON public.condominiums
    FOR SELECT USING (id = public.current_user_condominium_id());

CREATE POLICY "Admins e moradores veem blocos do condomínio" ON public.buildings
    FOR SELECT USING (condominium_id = public.current_user_condominium_id());

CREATE POLICY "Admins veem todos os apartamentos do condomínio" ON public.apartments
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        building_id IN (SELECT id FROM public.buildings WHERE condominium_id = public.current_user_condominium_id())
    );

CREATE POLICY "Moradores veem apenas seu próprio apartamento" ON public.apartments
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        id = public.current_user_apartment_id()
    );

CREATE POLICY "Usuário vê seu próprio perfil" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin vê perfis do condomínio" ON public.profiles
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

CREATE POLICY "Usuário atualiza seu próprio perfil" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins veem todos os dispositivos do condomínio" ON public.devices
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Moradores veem dispositivos do seu apartamento" ON public.devices
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        apartment_id = public.current_user_apartment_id()
    );

CREATE POLICY "Admins veem todos os sensores do condomínio" ON public.sensors
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        device_id IN (
            SELECT d.id FROM public.devices d
            JOIN public.apartments a ON d.apartment_id = a.id
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Moradores veem sensores do seu dispositivo" ON public.sensors
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        device_id IN (SELECT id FROM public.devices WHERE apartment_id = public.current_user_apartment_id())
    );

CREATE POLICY "Admins e moradores leem políticas do condomínio" ON public.noise_policies
    FOR SELECT USING (condominium_id = public.current_user_condominium_id());

CREATE POLICY "Apenas admin gerencia políticas do condomínio" ON public.noise_policies
    FOR ALL USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

CREATE POLICY "Moradores veem leituras apenas do seu apartamento" ON public.noise_readings
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        apartment_id = public.current_user_apartment_id()
    );

CREATE POLICY "Admins veem todas as leituras do condomínio" ON public.noise_readings
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Permitir inserção de leituras autorizadas" ON public.noise_readings
    FOR INSERT WITH CHECK (
        (public.current_user_role() = 'resident' AND apartment_id = public.current_user_apartment_id())
        OR
        (public.current_user_role() = 'admin' AND apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        ))
        OR
        auth.uid() IS NULL
    );

CREATE POLICY "Admin pode deletar leituras de teste" ON public.noise_readings
    FOR DELETE USING (
        public.current_user_role() = 'admin' AND
        is_test_data = true AND
        apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Moradores veem eventos apenas do seu apartamento" ON public.noise_events
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        apartment_id = public.current_user_apartment_id()
    );

CREATE POLICY "Admins veem todos os eventos do condomínio" ON public.noise_events
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Permitir atualizar acknowledged no evento" ON public.noise_events
    FOR UPDATE USING (
        (public.current_user_role() = 'resident' AND apartment_id = public.current_user_apartment_id())
        OR
        (public.current_user_role() = 'admin')
    );

CREATE POLICY "Moradores veem seus alertas" ON public.alerts
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        apartment_id = public.current_user_apartment_id()
    );

CREATE POLICY "Admins veem todos os alertas do condomínio" ON public.alerts
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        apartment_id IN (
            SELECT a.id FROM public.apartments a
            JOIN public.buildings b ON a.building_id = b.id
            WHERE b.condominium_id = public.current_user_condominium_id()
        )
    );

CREATE POLICY "Moradores marcam alerta como lido" ON public.alerts
    FOR UPDATE USING (
        public.current_user_role() = 'resident' AND
        apartment_id = public.current_user_apartment_id()
    );

CREATE POLICY "Morador vê suas ocorrências criadas" ON public.occurrences
    FOR SELECT USING (
        public.current_user_role() = 'resident' AND
        reporter_id = auth.uid()
    );

CREATE POLICY "Admin vê todas as ocorrências do condomínio" ON public.occurrences
    FOR SELECT USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

CREATE POLICY "Morador cria nova ocorrência" ON public.occurrences
    FOR INSERT WITH CHECK (
        public.current_user_role() = 'resident' AND
        condominium_id = public.current_user_condominium_id() AND
        (reporter_id = auth.uid() OR anonymous = true)
    );

CREATE POLICY "Admin atualiza status de ocorrência" ON public.occurrences
    FOR UPDATE USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

CREATE POLICY "Visualizar comentários de ocorrência permitida" ON public.occurrence_comments
    FOR SELECT USING (
        occurrence_id IN (
            SELECT id FROM public.occurrences
            WHERE (
                (public.current_user_role() = 'resident' AND reporter_id = auth.uid()) OR
                (public.current_user_role() = 'admin' AND condominium_id = public.current_user_condominium_id())
            )
        )
    );

CREATE POLICY "Adicionar comentário em ocorrência" ON public.occurrence_comments
    FOR INSERT WITH CHECK (
        occurrence_id IN (
            SELECT id FROM public.occurrences
            WHERE (
                (public.current_user_role() = 'resident' AND reporter_id = auth.uid()) OR
                (public.current_user_role() = 'admin' AND condominium_id = public.current_user_condominium_id())
            )
        )
    );


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'noise_readings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.noise_readings;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'noise_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.noise_events;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'devices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'occurrences'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;
