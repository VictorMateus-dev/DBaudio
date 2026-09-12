-- =====================================================================
-- dBSound: Migration 003 — Auth Signup, Gestão de Moradores,
-- Limites de dB por Apartamento e Limpeza de Mockados
-- =====================================================================

-- 1. ADICIONAR LIMITES CUSTOMIZADOS DE DECIBÉIS POR APARTAMENTO
ALTER TABLE public.apartments 
    ADD COLUMN IF NOT EXISTS custom_day_threshold_db NUMERIC,
    ADD COLUMN IF NOT EXISTS custom_night_threshold_db NUMERIC,
    ADD COLUMN IF NOT EXISTS custom_critical_threshold_db NUMERIC;

-- 2. FLEXIBILIZAR RESTRIÇÃO DE RESIDENTES PARA PERMITIR CADASTRO PENDENTE
-- Quando o morador cria conta, apartment_id inicia como NULL até o síndico alocar.
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS chk_resident_apartment;

ALTER TABLE public.profiles
    ADD CONSTRAINT chk_resident_apartment_flexible CHECK (
        role IN ('resident', 'admin')
    );

-- 3. TRIGGER AUTOMÁTICO DE CRIAÇÃO DE PERFIL VIA SUPABASE AUTH
-- Executado sempre que um novo usuário se registra na tabela auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_condo_id UUID;
BEGIN
    -- Seleciona o condomínio padrão cadastrado
    SELECT id INTO default_condo_id FROM public.condominiums LIMIT 1;

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        role,
        condominium_id,
        apartment_id,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        'resident',
        default_condo_id,
        NULL, -- Inicia pendente de alocação pelo síndico
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra a trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ATUALIZAÇÃO DO PIPELINE PARA RESPEITAR LIMITES CUSTOMIZADOS DO APARTAMENTO
CREATE OR REPLACE FUNCTION public.trg_process_noise_reading()
RETURNS TRIGGER AS $$
DECLARE
    v_condo_id UUID;
    v_apt RECORD;
    v_policy RECORD;
    v_current_time TIME;
    v_warn_threshold NUMERIC;
    v_crit_threshold NUMERIC;
    v_min_duration INT := 3;
    v_cooldown INT := 60;
    v_severity TEXT := 'normal';
    v_recent_high_count INT;
    v_event_id UUID;
    v_last_alert TIMESTAMPTZ;
BEGIN
    v_current_time := (NEW.recorded_at AT TIME ZONE 'America/Sao_Paulo')::TIME;

    -- Buscar dados e limites específicos do apartamento
    SELECT a.*, b.condominium_id 
    INTO v_apt
    FROM public.apartments a
    JOIN public.buildings b ON a.building_id = b.id
    WHERE a.id = NEW.apartment_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    v_condo_id := v_apt.condominium_id;

    -- Buscar política geral do condomínio
    SELECT * INTO v_policy
    FROM public.noise_policies
    WHERE condominium_id = v_condo_id
      AND enabled = true
      AND (
          (start_time <= end_time AND v_current_time >= start_time AND v_current_time < end_time)
          OR
          (start_time > end_time AND (v_current_time >= start_time OR v_current_time < end_time))
      )
    ORDER BY created_at DESC
    LIMIT 1;

    -- Determinar se é horário noturno (padrão após 22h ou política noturna)
    IF v_policy.name ILIKE '%noturna%' OR v_current_time >= '22:00'::TIME OR v_current_time < '07:00'::TIME THEN
        -- Prioriza limite customizado noturno do apartamento
        v_warn_threshold := COALESCE(v_apt.custom_night_threshold_db, v_policy.warning_threshold_db, 60.0);
        v_crit_threshold := COALESCE(v_apt.custom_critical_threshold_db, v_policy.critical_threshold_db, 70.0);
    ELSE
        -- Prioriza limite customizado diurno do apartamento
        v_warn_threshold := COALESCE(v_apt.custom_day_threshold_db, v_policy.warning_threshold_db, 70.0);
        v_crit_threshold := COALESCE(v_apt.custom_critical_threshold_db, v_policy.critical_threshold_db, 80.0);
    END IF;

    IF v_policy IS NOT NULL THEN
        v_min_duration := COALESCE(v_policy.min_duration_seconds, 3);
        v_cooldown := COALESCE(v_policy.cooldown_seconds, 60);
    END IF;

    -- Classificação de severidade
    IF NEW.decibel >= v_crit_threshold THEN
        v_severity := 'critical';
    ELSIF NEW.decibel >= v_warn_threshold THEN
        v_severity := 'warning';
    ELSE
        v_severity := 'normal';
    END IF;

    -- Se normal, não abre evento
    IF v_severity = 'normal' THEN
        RETURN NEW;
    END IF;

    -- Verificar persistência temporal (debounce de ruídos pontuais)
    SELECT COUNT(*) INTO v_recent_high_count
    FROM public.noise_readings
    WHERE apartment_id = NEW.apartment_id
      AND recorded_at >= (NEW.recorded_at - (v_min_duration || ' seconds')::INTERVAL)
      AND decibel >= v_warn_threshold;

    -- Se não atingiu o tempo mínimo de persistência, aguarda próximas amostras
    IF v_recent_high_count < v_min_duration THEN
        RETURN NEW;
    END IF;

    -- Agrupar em noise_events ativo nos últimos 5 minutos
    SELECT id INTO v_event_id
    FROM public.noise_events
    WHERE apartment_id = NEW.apartment_id
      AND ended_at >= (NEW.recorded_at - INTERVAL '5 minutes')
    ORDER BY ended_at DESC
    LIMIT 1;

    IF v_event_id IS NOT NULL THEN
        UPDATE public.noise_events
        SET ended_at = NEW.recorded_at,
            duration_seconds = EXTRACT(EPOCH FROM (NEW.recorded_at - started_at))::INT,
            peak_db = GREATEST(peak_db, NEW.decibel),
            average_db = ROUND(((average_db + NEW.decibel) / 2)::NUMERIC, 2),
            severity = CASE 
                WHEN v_severity = 'critical' OR severity = 'critical' THEN 'critical'::noise_severity
                ELSE 'warning'::noise_severity
            END
        WHERE id = v_event_id;
    ELSE
        INSERT INTO public.noise_events (
            apartment_id,
            device_id,
            sensor_id,
            peak_db,
            average_db,
            duration_seconds,
            started_at,
            ended_at,
            severity,
            source
        ) VALUES (
            NEW.apartment_id,
            NEW.device_id,
            NEW.sensor_id,
            NEW.decibel,
            NEW.decibel,
            v_min_duration,
            NEW.recorded_at - (v_min_duration || ' seconds')::INTERVAL,
            NEW.recorded_at,
            v_severity::noise_severity,
            NEW.source
        ) RETURNING id INTO v_event_id;
    END IF;

    -- Se for ruído crítico, gerar alerta respeitando o cooldown
    IF v_severity = 'critical' THEN
        SELECT created_at INTO v_last_alert
        FROM public.alerts
        WHERE apartment_id = NEW.apartment_id
          AND type = 'high_noise'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_last_alert IS NULL OR v_last_alert < (NEW.recorded_at - (v_cooldown || ' seconds')::INTERVAL) THEN
            INSERT INTO public.alerts (
                apartment_id,
                type,
                title,
                message,
                severity
            ) VALUES (
                NEW.apartment_id,
                'high_noise',
                'ALERTA!! RUÍDO ALTO DETECTADO',
                'Nível de ruído de ' || NEW.decibel || ' dB SPL excedeu o limite tolerado nesta unidade.',
                'critical'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. POLÍTICAS RLS EXPANDIDAS PARA GESTÃO COMPLETA PELO SÍNDICO
-- Permitir que o síndico crie, edite limites e exclua apartamentos
DROP POLICY IF EXISTS "Admin gerencia apartamentos" ON public.apartments;
CREATE POLICY "Admin gerencia apartamentos" ON public.apartments
    FOR ALL USING (
        public.current_user_role() = 'admin' AND
        building_id IN (SELECT id FROM public.buildings WHERE condominium_id = public.current_user_condominium_id())
    )
    WITH CHECK (
        public.current_user_role() = 'admin' AND
        building_id IN (SELECT id FROM public.buildings WHERE condominium_id = public.current_user_condominium_id())
    );

-- Permitir que o síndico atualize perfis de moradores (para alocar apartamento)
DROP POLICY IF EXISTS "Admin atualiza moradores do condomínio" ON public.profiles;
CREATE POLICY "Admin atualiza moradores do condomínio" ON public.profiles
    FOR UPDATE USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

-- Permitir que o síndico exclua/desvincule moradores do condomínio
DROP POLICY IF EXISTS "Admin remove moradores do condomínio" ON public.profiles;
CREATE POLICY "Admin remove moradores do condomínio" ON public.profiles
    FOR DELETE USING (
        public.current_user_role() = 'admin' AND
        condominium_id = public.current_user_condominium_id()
    );

-- 6. RPC PARA LIMPEZA TOTAL DE APARTAMENTOS MOCKADOS (ZERA PARA O SÍNDICO INICIAR REAL)
CREATE OR REPLACE FUNCTION public.clear_mock_apartments()
RETURNS VOID AS $$
BEGIN
    -- Desvincular moradores existentes
    UPDATE public.profiles SET apartment_id = NULL WHERE role = 'resident';
    
    -- Apagar leituras, eventos e alertas de teste
    DELETE FROM public.noise_readings;
    DELETE FROM public.noise_events;
    DELETE FROM public.alerts;
    
    -- Apagar sensores e dispositivos associados
    DELETE FROM public.sensors;
    DELETE FROM public.devices;
    
    -- Apagar apartamentos existentes
    DELETE FROM public.apartments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
