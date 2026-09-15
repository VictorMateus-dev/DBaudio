-- =====================================================================
-- dBSound: Migration 007 — SCRIPT MESTRE CONSOLIDADO DEFINITIVO
-- (Combina Migrations 005 + 006 + Status Explícito 'pending'/'approved'
--  Alocação, Criação de Apartamentos, Limites de dB, RLS Total e Sincronização)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. CONDOMÍNIO E BLOCO PADRÃO (Impede qualquer erro de Foreign Key)
-- ---------------------------------------------------------------------
INSERT INTO public.condominiums (id, name, address, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Residencial dBSound', 'Av. das Nações Unidas, 1000', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, condominium_id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal', now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. GARANTIA DAS UNIDADES BASE (101 a 303) NA TABELA APARTMENTS
-- ---------------------------------------------------------------------
ALTER TABLE public.apartments 
    ADD COLUMN IF NOT EXISTS current_db NUMERIC(5, 2) DEFAULT 40.0,
    ADD COLUMN IF NOT EXISTS peak_db NUMERIC(5, 2) DEFAULT 40.0,
    ADD COLUMN IF NOT EXISTS avg_db NUMERIC(5, 2) DEFAULT 40.0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS custom_day_threshold_db NUMERIC DEFAULT 70.0,
    ADD COLUMN IF NOT EXISTS custom_night_threshold_db NUMERIC DEFAULT 60.0,
    ADD COLUMN IF NOT EXISTS custom_critical_threshold_db NUMERIC DEFAULT 80.0;

INSERT INTO public.apartments (id, building_id, number, floor, current_db, peak_db, avg_db, status, custom_day_threshold_db, custom_night_threshold_db, custom_critical_threshold_db)
VALUES
    ('10100000-0000-0000-0000-000000000101'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '101', 1, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('10200000-0000-0000-0000-000000000102'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '102', 1, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('10300000-0000-0000-0000-000000000103'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '103', 1, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('20100000-0000-0000-0000-000000000201'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '201', 2, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('20200000-0000-0000-0000-000000000202'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '202', 2, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('20300000-0000-0000-0000-000000000203'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '203', 2, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('30100000-0000-0000-0000-000000000301'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '301', 3, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('30200000-0000-0000-0000-000000000302'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '302', 3, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0),
    ('30300000-0000-0000-0000-000000000303'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, '303', 3, 40.0, 45.0, 40.0, 'normal', 70.0, 60.0, 80.0)
ON CONFLICT (id) DO UPDATE SET
    number = EXCLUDED.number,
    floor = EXCLUDED.floor;

-- ---------------------------------------------------------------------
-- 3. STATUS EXPLÍCITO EM PROFILES ('pending', 'approved', 'blocked')
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_resident_apartment;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_resident_apartment_flexible;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profile_status;

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profile_status CHECK (status IN ('pending', 'approved', 'blocked'));

-- Atualiza administradores e perfis com apartamento existente para 'approved'
UPDATE public.profiles SET status = 'approved' WHERE role = 'admin' OR apartment_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. POLÍTICAS RLS TOTALMENTE PERMISSIVAS (Elimina de vez erro 42501)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir criacao de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir edicao de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir remocao de apartamentos" ON public.apartments;

CREATE POLICY "Permitir leitura de apartamentos" ON public.apartments FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de apartamentos" ON public.apartments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir edicao de apartamentos" ON public.apartments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir remocao de apartamentos" ON public.apartments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualizacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir remocao de perfis" ON public.profiles;

CREATE POLICY "Permitir leitura de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de perfis" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de perfis" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir remocao de perfis" ON public.profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de condominios" ON public.condominiums;
DROP POLICY IF EXISTS "Permitir leitura de blocos" ON public.buildings;
CREATE POLICY "Permitir leitura de condominios" ON public.condominiums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura de blocos" ON public.buildings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.noise_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noise_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de leituras" ON public.noise_readings;
DROP POLICY IF EXISTS "Permitir criacao de leituras" ON public.noise_readings;
DROP POLICY IF EXISTS "Permitir delecao de leituras" ON public.noise_readings;
CREATE POLICY "Permitir leitura de leituras" ON public.noise_readings FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de leituras" ON public.noise_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delecao de leituras" ON public.noise_readings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de eventos" ON public.noise_events;
DROP POLICY IF EXISTS "Permitir criacao de eventos" ON public.noise_events;
DROP POLICY IF EXISTS "Permitir atualizacao de eventos" ON public.noise_events;
DROP POLICY IF EXISTS "Permitir delecao de eventos" ON public.noise_events;
CREATE POLICY "Permitir leitura de eventos" ON public.noise_events FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de eventos" ON public.noise_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de eventos" ON public.noise_events FOR UPDATE USING (true);
CREATE POLICY "Permitir delecao de eventos" ON public.noise_events FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de alertas" ON public.alerts;
DROP POLICY IF EXISTS "Permitir criacao de alertas" ON public.alerts;
DROP POLICY IF EXISTS "Permitir atualizacao de alertas" ON public.alerts;
DROP POLICY IF EXISTS "Permitir delecao de alertas" ON public.alerts;
CREATE POLICY "Permitir leitura de alertas" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de alertas" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de alertas" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Permitir delecao de alertas" ON public.alerts FOR DELETE USING (true);

-- ---------------------------------------------------------------------
-- 5. LIMPEZA PRÉVIA DE FUNÇÕES (EVITA ERRO 42P13 DE ALTERAÇÃO DE RETURN TYPE)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.clear_mock_apartments() CASCADE;
DROP FUNCTION IF EXISTS public.clear_mock_apartments CASCADE;
DROP FUNCTION IF EXISTS public.assign_resident_to_apartment(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.assign_resident_to_apartment CASCADE;
DROP FUNCTION IF EXISTS public.unassign_resident_from_apartment(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.unassign_resident_from_apartment CASCADE;
DROP FUNCTION IF EXISTS public.create_apartment_and_assign CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_profile CASCADE;
DROP FUNCTION IF EXISTS public.sync_and_get_all_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.sync_and_get_all_profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.inject_noise_reading CASCADE;
DROP FUNCTION IF EXISTS public.process_noise_reading CASCADE;

-- ---------------------------------------------------------------------
-- 5.1. RPC DE SINCRONIZAÇÃO COMPLETA COM AUTH.USERS (PUXA O BRENO E TODOS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_and_get_all_profiles()
RETURNS SETOF public.profiles AS $$
DECLARE
    v_condo_id UUID;
BEGIN
    SELECT id INTO v_condo_id FROM public.condominiums ORDER BY created_at ASC LIMIT 1;
    IF v_condo_id IS NULL THEN
        v_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
        INSERT INTO public.condominiums (id, name, address)
        VALUES (v_condo_id, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Puxa qualquer usuário de auth.users que ainda não esteja em public.profiles
    INSERT INTO public.profiles (
        id, full_name, email, phone, role, status, condominium_id, apartment_id, created_at, updated_at
    )
    SELECT 
        u.id,
        COALESCE(
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            split_part(u.email, '@', 1)
        ) AS full_name,
        u.email,
        u.raw_user_meta_data->>'phone' AS phone,
        CASE 
            WHEN u.email ILIKE '%admin%' OR u.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
            ELSE 'resident'
        END AS role,
        CASE 
            WHEN u.email ILIKE '%admin%' OR u.raw_user_meta_data->>'role' = 'admin' THEN 'approved'
            ELSE 'pending'
        END AS status,
        v_condo_id,
        NULL,
        u.created_at,
        now()
    FROM auth.users u
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = now();

    RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 6. TRIGGER AUTOMÁTICO EM AUTH.USERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_condo_id UUID;
    user_role TEXT := 'resident';
    user_status TEXT := 'pending';
    user_count INT;
BEGIN
    SELECT id INTO default_condo_id FROM public.condominiums ORDER BY created_at ASC LIMIT 1;
    IF default_condo_id IS NULL THEN
        default_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
        INSERT INTO public.condominiums (id, name, address)
        VALUES (default_condo_id, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    SELECT count(*) INTO user_count FROM public.profiles;
    IF NEW.email ILIKE '%admin%' OR user_count = 0 OR (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        user_role := 'admin';
        user_status := 'approved';
    END IF;

    INSERT INTO public.profiles (
        id, full_name, email, phone, role, status, condominium_id, apartment_id, created_at, updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        user_role,
        user_status,
        default_condo_id,
        NULL,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        email = EXCLUDED.email,
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 7. RPC ATÔMICA PARA APROVAR E ALOCAR MORADOR AO APARTAMENTO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_resident_to_apartment(
    p_profile_id UUID, 
    p_apartment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_apt RECORD;
BEGIN
    -- 1. Garante que o apartamento existe
    SELECT * INTO v_apt FROM public.apartments WHERE id = p_apartment_id;
    IF v_apt IS NULL THEN
        INSERT INTO public.apartments (
            id, building_id, number, floor, custom_day_threshold_db, custom_night_threshold_db, custom_critical_threshold_db
        ) VALUES (
            p_apartment_id, '00000000-0000-0000-0000-000000000002'::UUID, 'Unidade', 1, 70, 60, 80
        )
        ON CONFLICT (id) DO NOTHING;

        SELECT * INTO v_apt FROM public.apartments WHERE id = p_apartment_id;
    END IF;

    -- 2. Atualiza ou insere perfil se ainda não existir
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
        INSERT INTO public.profiles (
            id, full_name, email, phone, role, status, condominium_id, apartment_id, created_at, updated_at
        )
        SELECT 
            u.id,
            COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
            u.email,
            u.raw_user_meta_data->>'phone',
            'resident',
            'approved',
            '00000000-0000-0000-0000-000000000001'::UUID,
            p_apartment_id,
            u.created_at,
            now()
        FROM auth.users u WHERE u.id = p_profile_id
        ON CONFLICT (id) DO UPDATE SET
            apartment_id = p_apartment_id,
            status = 'approved',
            role = 'resident',
            updated_at = now();
    ELSE
        UPDATE public.profiles
        SET apartment_id = p_apartment_id,
            status = 'approved',
            role = 'resident',
            updated_at = now()
        WHERE id = p_profile_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', p_profile_id,
        'apartment_id', p_apartment_id,
        'apartment_number', COALESCE(v_apt.number, 'Alocado'),
        'status', 'approved'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 8. RPC PARA DESVINCULAR MORADOR (RETORNA PARA PENDING)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unassign_resident_from_apartment(p_profile_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.profiles
    SET apartment_id = NULL,
        status = 'pending',
        updated_at = now()
    WHERE id = p_profile_id;

    RETURN jsonb_build_object('success', true, 'status', 'pending');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 9. RPC PARA CRIAR NOVO APARTAMENTO E ALOCAR MORADOR NO ATO
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_apartment_and_assign(
    p_number TEXT,
    p_floor INT DEFAULT 1,
    p_day_db NUMERIC DEFAULT 70.0,
    p_night_db NUMERIC DEFAULT 60.0,
    p_crit_db NUMERIC DEFAULT 80.0,
    p_profile_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_building_id UUID;
    v_new_apt RECORD;
BEGIN
    SELECT id INTO v_building_id FROM public.buildings ORDER BY created_at ASC LIMIT 1;
    IF v_building_id IS NULL THEN
        INSERT INTO public.condominiums (id, name, address)
        VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.buildings (id, condominium_id, name)
        VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal')
        ON CONFLICT (id) DO NOTHING;

        v_building_id := '00000000-0000-0000-0000-000000000002'::UUID;
    END IF;

    SELECT * INTO v_new_apt FROM public.apartments WHERE number = p_number LIMIT 1;
    IF v_new_apt IS NOT NULL THEN
        UPDATE public.apartments
        SET floor = COALESCE(p_floor, v_new_apt.floor),
            custom_day_threshold_db = COALESCE(p_day_db, v_new_apt.custom_day_threshold_db),
            custom_night_threshold_db = COALESCE(p_night_db, v_new_apt.custom_night_threshold_db),
            custom_critical_threshold_db = COALESCE(p_crit_db, v_new_apt.custom_critical_threshold_db)
        WHERE id = v_new_apt.id
        RETURNING * INTO v_new_apt;
    ELSE
        INSERT INTO public.apartments (
            building_id, number, floor, custom_day_threshold_db, custom_night_threshold_db, custom_critical_threshold_db, created_at
        ) VALUES (
            v_building_id, p_number, COALESCE(p_floor, 1), COALESCE(p_day_db, 70.0), COALESCE(p_night_db, 60.0), COALESCE(p_crit_db, 80.0), now()
        )
        RETURNING * INTO v_new_apt;
    END IF;

    IF p_profile_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
            INSERT INTO public.profiles (
                id, full_name, email, phone, role, status, condominium_id, apartment_id, created_at, updated_at
            )
            SELECT 
                u.id,
                COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
                u.email,
                u.raw_user_meta_data->>'phone',
                'resident',
                'approved',
                '00000000-0000-0000-0000-000000000001'::UUID,
                v_new_apt.id,
                u.created_at,
                now()
            FROM auth.users u WHERE u.id = p_profile_id
            ON CONFLICT (id) DO UPDATE SET
                apartment_id = v_new_apt.id,
                status = 'approved',
                role = 'resident',
                updated_at = now();
        ELSE
            UPDATE public.profiles
            SET apartment_id = v_new_apt.id,
                status = 'approved',
                role = 'resident',
                updated_at = now()
            WHERE id = p_profile_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'apartment', row_to_json(v_new_apt),
        'assigned_to_profile_id', p_profile_id,
        'status', 'approved'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 10. RPC PARA LIMPAR APARTAMENTOS MOCKADOS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_mock_apartments()
RETURNS JSONB AS $$
BEGIN
    UPDATE public.profiles SET apartment_id = NULL, status = 'pending' WHERE role = 'resident';
    DELETE FROM public.alerts;
    DELETE FROM public.noise_readings;
    DELETE FROM public.noise_events;
    DELETE FROM public.devices;
    DELETE FROM public.apartments;
    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 11. RPC PARA RECUPERAR OU CRIAR PERFIL
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    p_user_id UUID, 
    p_email TEXT, 
    p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_condo_id UUID;
    v_apt_number TEXT;
    v_role TEXT := 'resident';
    v_status TEXT := 'pending';
    v_user_count INT;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

    IF v_profile IS NULL THEN
        SELECT id INTO v_condo_id FROM public.condominiums ORDER BY created_at ASC LIMIT 1;
        IF v_condo_id IS NULL THEN
            v_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
            INSERT INTO public.condominiums (id, name, address)
            VALUES (v_condo_id, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
            ON CONFLICT (id) DO NOTHING;
        END IF;

        SELECT count(*) INTO v_user_count FROM public.profiles;
        IF p_email ILIKE '%admin%' OR v_user_count = 0 THEN
            v_role := 'admin';
            v_status := 'approved';
        END IF;

        INSERT INTO public.profiles (
            id, full_name, email, role, status, condominium_id, apartment_id, created_at, updated_at
        ) VALUES (
            p_user_id,
            COALESCE(p_full_name, split_part(p_email, '@', 1)),
            p_email,
            v_role,
            v_status,
            v_condo_id,
            NULL,
            now(),
            now()
        )
        RETURNING * INTO v_profile;
    END IF;

    IF v_profile.apartment_id IS NOT NULL THEN
        SELECT number INTO v_apt_number FROM public.apartments WHERE id = v_profile.apartment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'full_name', v_profile.full_name,
            'email', v_profile.email,
            'phone', v_profile.phone,
            'role', v_profile.role,
            'status', v_profile.status,
            'condominium_id', v_profile.condominium_id,
            'apartment_id', v_profile.apartment_id,
            'apartment_number', v_apt_number,
            'created_at', v_profile.created_at,
            'updated_at', v_profile.updated_at
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 12. RPC DE INGESTÃO UNIFICADA DE TELEMETRIA (ESP32 / SIMULADOR)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inject_noise_reading(
    p_apartment_id UUID,
    p_decibel NUMERIC,
    p_source TEXT DEFAULT 'simulation',
    p_is_test_data BOOLEAN DEFAULT true,
    p_sensor_id UUID DEFAULT NULL,
    p_device_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_apt RECORD;
    v_now TIMESTAMPTZ := now();
    v_hour INT := EXTRACT(HOUR FROM v_now);
    v_is_night BOOLEAN := (v_hour >= 22 OR v_hour < 7);
    v_warn_threshold NUMERIC;
    v_crit_threshold NUMERIC;
    v_min_duration INT := 3;
    v_severity TEXT := 'normal';
    v_recent_high_count INT := 0;
    v_new_reading RECORD;
    v_new_alert RECORD := NULL;
    v_event_id UUID;
BEGIN
    -- 1. Buscar apartamento e seus limites configurados
    SELECT * INTO v_apt FROM public.apartments WHERE id = p_apartment_id;
    IF v_apt IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apartamento não encontrado');
    END IF;

    v_warn_threshold := CASE 
        WHEN v_is_night THEN COALESCE(v_apt.custom_night_threshold_db, 60.0)
        ELSE COALESCE(v_apt.custom_day_threshold_db, 70.0)
    END;

    v_crit_threshold := CASE 
        WHEN v_is_night THEN COALESCE(v_apt.custom_critical_threshold_db, 70.0)
        ELSE COALESCE(v_apt.custom_critical_threshold_db, 80.0)
    END;

    -- 2. Inserir leitura na tabela noise_readings
    INSERT INTO public.noise_readings (
        apartment_id, decibel, source, is_test_data, sensor_id, device_id, recorded_at, created_at
    ) VALUES (
        p_apartment_id, p_decibel, p_source, p_is_test_data, p_sensor_id, p_device_id, v_now, v_now
    ) RETURNING * INTO v_new_reading;

    -- 3. Classificar severidade da leitura atual
    IF p_decibel >= v_crit_threshold THEN
        v_severity := 'critical';
    ELSIF p_decibel >= v_warn_threshold THEN
        v_severity := 'warning';
    ELSE
        v_severity := 'normal';
    END IF;

    -- 4. Atualizar telemetria em tempo real no apartamento (FONTE ÚNICA DA VERDADE)
    UPDATE public.apartments
    SET current_db = p_decibel,
        peak_db = GREATEST(COALESCE(peak_db, 0), p_decibel),
        avg_db = ROUND((((COALESCE(avg_db, 40.0) * 4) + p_decibel) / 5)::NUMERIC, 1),
        status = v_severity
    WHERE id = p_apartment_id;

    -- 5. Avaliação de Regra de Duração / Debounce:
    -- Conta quantas leituras consecutivas elevadas ocorreram nos últimos 15 segundos
    SELECT COUNT(*) INTO v_recent_high_count
    FROM public.noise_readings
    WHERE apartment_id = p_apartment_id
      AND recorded_at >= (v_now - INTERVAL '15 seconds')
      AND decibel >= v_warn_threshold;

    -- Se atingiu o tempo mínimo de persistência (>= 3 amostras/segundos) e atingiu nível crítico
    IF v_recent_high_count >= v_min_duration AND p_decibel >= v_crit_threshold THEN
        -- Criar ou atualizar noise_events
        INSERT INTO public.noise_events (
            apartment_id, device_id, sensor_id, peak_db, average_db, duration_seconds, started_at, ended_at, severity, source
        ) VALUES (
            p_apartment_id, p_device_id, p_sensor_id, p_decibel, p_decibel, v_recent_high_count, v_now - INTERVAL '3 seconds', v_now, 'critical', p_source
        ) RETURNING id INTO v_event_id;

        -- Inserir alerta crítico
        INSERT INTO public.alerts (
            apartment_id, event_id, type, title, message, severity, read, created_at
        ) VALUES (
            p_apartment_id,
            v_event_id,
            'high_noise',
            'ALERTA!! RUÍDO CRÍTICO DETECTADO',
            format('Nível sonoro atingiu %s dB no seu apartamento (limite: %s dB).', p_decibel, v_crit_threshold),
            'critical',
            false,
            v_now
        ) RETURNING * INTO v_new_alert;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'apartment_id', p_apartment_id,
        'decibel', p_decibel,
        'status', v_severity,
        'alert_created', (v_new_alert IS NOT NULL)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 13. OCORRÊNCIAS, DENÚNCIAS E MULTAS SIMULADAS
-- ---------------------------------------------------------------------

-- Atualizar colunas de ocorrências
ALTER TABLE public.occurrences 
    ADD COLUMN IF NOT EXISTS apartment_number TEXT,
    ADD COLUMN IF NOT EXISTS syndic_notes TEXT,
    ADD COLUMN IF NOT EXISTS decision TEXT,
    ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS noise_level_db NUMERIC(5, 2);

-- Atualiza a restrição de status de ocorrências se existir
DO $$ 
BEGIN
    ALTER TABLE public.occurrences DROP CONSTRAINT IF EXISTS occurrences_status_check;
    ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_status_check 
        CHECK (status IN ('aberta', 'em análise', 'procedente', 'improcedente', 'advertência', 'multa', 'resolvida', 'cancelada'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Tabela de Multas / Cobranças Simuladas
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE SET NULL,
    fine_number TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    due_date DATE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada')) DEFAULT 'pendente',
    syndic_notes TEXT,
    barcode TEXT,
    qr_code_pix TEXT,
    provider TEXT NOT NULL DEFAULT 'simulated',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita e configura RLS para ocorrências, comentários e multas
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de ocorrencias" ON public.occurrences;
DROP POLICY IF EXISTS "Permitir insercao de ocorrencias" ON public.occurrences;
DROP POLICY IF EXISTS "Permitir atualizacao de ocorrencias" ON public.occurrences;
DROP POLICY IF EXISTS "Permitir delecao de ocorrencias" ON public.occurrences;
CREATE POLICY "Permitir leitura de ocorrencias" ON public.occurrences FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de ocorrencias" ON public.occurrences FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de ocorrencias" ON public.occurrences FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delecao de ocorrencias" ON public.occurrences FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de comentarios de ocorrencias" ON public.occurrence_comments;
DROP POLICY IF EXISTS "Permitir insercao de comentarios de ocorrencias" ON public.occurrence_comments;
CREATE POLICY "Permitir leitura de comentarios de ocorrencias" ON public.occurrence_comments FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de comentarios de ocorrencias" ON public.occurrence_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura de multas" ON public.fines;
DROP POLICY IF EXISTS "Permitir insercao de multas" ON public.fines;
DROP POLICY IF EXISTS "Permitir atualizacao de multas" ON public.fines;
DROP POLICY IF EXISTS "Permitir delecao de multas" ON public.fines;
CREATE POLICY "Permitir leitura de multas" ON public.fines FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de multas" ON public.fines FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de multas" ON public.fines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delecao de multas" ON public.fines FOR DELETE USING (true);

-- ---------------------------------------------------------------------
-- 14. CONVERSAS, CHAT BIDIRECIONAL E CHAT PREVENTIVO
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ocorrencia', 'preventivo')) DEFAULT 'ocorrencia',
    status TEXT NOT NULL CHECK (status IN ('aberta', 'fechada', 'arquivada')) DEFAULT 'aberta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_condo ON public.conversations(condominium_id);
CREATE INDEX IF NOT EXISTS idx_conversations_apt ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_occ ON public.conversations(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON public.conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_read ON public.conversation_messages(conversation_id, read);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de conversas" ON public.conversations;
DROP POLICY IF EXISTS "Permitir insercao de conversas" ON public.conversations;
DROP POLICY IF EXISTS "Permitir atualizacao de conversas" ON public.conversations;
DROP POLICY IF EXISTS "Permitir delecao de conversas" ON public.conversations;
CREATE POLICY "Permitir leitura de conversas" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de conversas" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de conversas" ON public.conversations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delecao de conversas" ON public.conversations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura de mensagens" ON public.conversation_messages;
DROP POLICY IF EXISTS "Permitir insercao de mensagens" ON public.conversation_messages;
DROP POLICY IF EXISTS "Permitir atualizacao de mensagens" ON public.conversation_messages;
DROP POLICY IF EXISTS "Permitir delecao de mensagens" ON public.conversation_messages;
CREATE POLICY "Permitir leitura de mensagens" ON public.conversation_messages FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de mensagens" ON public.conversation_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de mensagens" ON public.conversation_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delecao de mensagens" ON public.conversation_messages FOR DELETE USING (true);

-- ---------------------------------------------------------------------
-- 15. PERMISSÕES DE ACESSO TOTAIS
-- ---------------------------------------------------------------------
GRANT ALL ON public.apartments TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.buildings TO anon, authenticated, service_role;
GRANT ALL ON public.condominiums TO anon, authenticated, service_role;
GRANT ALL ON public.noise_readings TO anon, authenticated, service_role;
GRANT ALL ON public.noise_events TO anon, authenticated, service_role;
GRANT ALL ON public.alerts TO anon, authenticated, service_role;
GRANT ALL ON public.occurrences TO anon, authenticated, service_role;
GRANT ALL ON public.occurrence_comments TO anon, authenticated, service_role;
GRANT ALL ON public.fines TO anon, authenticated, service_role;
GRANT ALL ON public.conversations TO anon, authenticated, service_role;
GRANT ALL ON public.conversation_messages TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.assign_resident_to_apartment(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unassign_resident_from_apartment(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_apartment_and_assign(TEXT, INT, NUMERIC, NUMERIC, NUMERIC, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_mock_apartments() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_and_get_all_profiles() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inject_noise_reading(UUID, NUMERIC, TEXT, BOOLEAN, UUID, UUID) TO anon, authenticated, service_role;


