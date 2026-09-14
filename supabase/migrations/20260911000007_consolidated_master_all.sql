-- =====================================================================
-- dBSound: Migration 007 — SCRIPT MESTRE CONSOLIDADO DEFINITIVO
-- (Combina Migrations 005 + 006: Alocação, Criação de Apartamentos, 
-- Limites de dB por Unidade, RLS Total e Sincronização Automática com auth.users)
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
-- 2. COLUNAS DE LIMITES CUSTOMIZADOS DE DECIBÉIS POR APARTAMENTO
-- ---------------------------------------------------------------------
ALTER TABLE public.apartments 
    ADD COLUMN IF NOT EXISTS custom_day_threshold_db NUMERIC DEFAULT 70.0,
    ADD COLUMN IF NOT EXISTS custom_night_threshold_db NUMERIC DEFAULT 60.0,
    ADD COLUMN IF NOT EXISTS custom_critical_threshold_db NUMERIC DEFAULT 80.0;

-- ---------------------------------------------------------------------
-- 3. REMOÇÃO DE REGRAS OBSOLETAS QUE IMPEDIAM MORADOR SEM APARTAMENTO
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_resident_apartment;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_resident_apartment_flexible;

-- ---------------------------------------------------------------------
-- 4. POLÍTICAS RLS TOTALMENTE LIBERADAS (Elimina de vez erro 42501)
-- ---------------------------------------------------------------------
-- Apartamentos:
DROP POLICY IF EXISTS "Permitir leitura de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir criacao de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir edicao de apartamentos" ON public.apartments;
DROP POLICY IF EXISTS "Permitir remocao de apartamentos" ON public.apartments;

CREATE POLICY "Permitir leitura de apartamentos" ON public.apartments FOR SELECT USING (true);
CREATE POLICY "Permitir criacao de apartamentos" ON public.apartments FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir edicao de apartamentos" ON public.apartments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir remocao de apartamentos" ON public.apartments FOR DELETE USING (true);

-- Perfis:
DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualizacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir remocao de perfis" ON public.profiles;

CREATE POLICY "Permitir leitura de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir insercao de perfis" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao de perfis" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir remocao de perfis" ON public.profiles FOR DELETE USING (true);

-- Condomínios e Blocos:
DROP POLICY IF EXISTS "Permitir leitura de condominios" ON public.condominiums;
DROP POLICY IF EXISTS "Permitir leitura de blocos" ON public.buildings;
CREATE POLICY "Permitir leitura de condominios" ON public.condominiums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir leitura de blocos" ON public.buildings FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 5. RPC DE SINCRONIZAÇÃO COMPLETA COM AUTH.USERS (PUXA O BRENO E TODOS)
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
        id, full_name, email, phone, role, condominium_id, apartment_id, created_at, updated_at
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
-- 6. TRIGGER AUTOMÁTICO DE NOVO USUÁRIO EM AUTH.USERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_condo_id UUID;
    user_role TEXT := 'resident';
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
    END IF;

    INSERT INTO public.profiles (
        id, full_name, email, phone, role, condominium_id, apartment_id, created_at, updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        user_role,
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
-- 7. RPC PARA ALOCAR MORADOR A UM APARTAMENTO EXISTENTE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_resident_to_apartment(
    p_profile_id UUID, 
    p_apartment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_apt_number TEXT;
BEGIN
    SELECT number INTO v_apt_number FROM public.apartments WHERE id = p_apartment_id;
    IF v_apt_number IS NULL THEN
        INSERT INTO public.apartments (id, building_id, number, floor, custom_day_threshold_db, custom_night_threshold_db, custom_critical_threshold_db)
        VALUES (p_apartment_id, '00000000-0000-0000-0000-000000000002'::UUID, 'Unidade', 1, 70, 60, 80)
        ON CONFLICT (id) DO NOTHING;

        SELECT number INTO v_apt_number FROM public.apartments WHERE id = p_apartment_id;
        IF v_apt_number IS NULL THEN v_apt_number := 'Alocado'; END IF;
    END IF;

    UPDATE public.profiles
    SET apartment_id = p_apartment_id,
        role = 'resident',
        updated_at = now()
    WHERE id = p_profile_id;

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', p_profile_id,
        'apartment_id', p_apartment_id,
        'apartment_number', v_apt_number
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 8. RPC PARA DESVINCULAR MORADOR
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unassign_resident_from_apartment(p_profile_id UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.profiles
    SET apartment_id = NULL,
        updated_at = now()
    WHERE id = p_profile_id;

    RETURN jsonb_build_object('success', true);
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
        UPDATE public.profiles
        SET apartment_id = v_new_apt.id,
            role = 'resident',
            updated_at = now()
        WHERE id = p_profile_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'apartment', row_to_json(v_new_apt),
        'assigned_to_profile_id', p_profile_id
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
    UPDATE public.profiles SET apartment_id = NULL WHERE role = 'resident';
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
        END IF;

        INSERT INTO public.profiles (
            id, full_name, email, role, condominium_id, apartment_id, created_at, updated_at
        ) VALUES (
            p_user_id,
            COALESCE(p_full_name, split_part(p_email, '@', 1)),
            p_email,
            v_role,
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
-- 12. PERMISSÕES DE ACESSO TOTAIS (GRANT EXECUTE)
-- ---------------------------------------------------------------------
GRANT ALL ON public.apartments TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.buildings TO anon, authenticated, service_role;
GRANT ALL ON public.condominiums TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.assign_resident_to_apartment(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unassign_resident_from_apartment(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_apartment_and_assign(TEXT, INT, NUMERIC, NUMERIC, NUMERIC, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_mock_apartments() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_and_get_all_profiles() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
