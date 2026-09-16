

CREATE OR REPLACE FUNCTION public.ingest_reading(
    p_device_uid TEXT,
    p_device_token TEXT,
    p_channel INTEGER,
    p_decibel NUMERIC,
    p_recorded_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB AS $$
DECLARE
    v_device RECORD;
    v_sensor_id UUID;
    v_reading_id UUID;
BEGIN
    SELECT id, apartment_id, status INTO v_device
    FROM public.devices
    WHERE device_uid = p_device_uid AND secret_token = p_device_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acesso negado: dispositivo ou token inválido.' USING ERRCODE = '28000';
    END IF;

    IF v_device.status = 'maintenance' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Dispositivo em manutenção.');
    END IF;

    SELECT id INTO v_sensor_id
    FROM public.sensors
    WHERE device_id = v_device.id AND channel = p_channel AND enabled = true
    LIMIT 1;

    UPDATE public.devices
    SET status = 'online', last_seen_at = now(), updated_at = now()
    WHERE id = v_device.id;

    INSERT INTO public.noise_readings (
        device_id,
        sensor_id,
        apartment_id,
        decibel,
        source,
        is_test_data,
        recorded_at
    ) VALUES (
        v_device.id,
        v_sensor_id,
        v_device.apartment_id,
        p_decibel,
        'esp32',
        false,
        COALESCE(p_recorded_at, now())
    ) RETURNING id INTO v_reading_id;

    RETURN jsonb_build_object(
        'success', true,
        'reading_id', v_reading_id,
        'apartment_id', v_device.apartment_id,
        'decibel', p_decibel,
        'timestamp', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.process_noise_reading()
RETURNS TRIGGER AS $$
DECLARE
    v_condominium_id UUID;
    v_reading_time TIME;
    v_policy RECORD;
    v_threshold NUMERIC := 70.0;
    v_warning_threshold NUMERIC := 70.0;
    v_critical_threshold NUMERIC := 80.0;
    v_min_duration INTEGER := 3;
    v_cooldown INTEGER := 60;
    v_severity TEXT;
    v_existing_event RECORD;
    v_event_id UUID;
    v_duration INTEGER;
    v_alert_exists BOOLEAN;
BEGIN
    SELECT b.condominium_id INTO v_condominium_id
    FROM public.apartments a
    JOIN public.buildings b ON a.building_id = b.id
    WHERE a.id = NEW.apartment_id;

    v_reading_time := (NEW.recorded_at AT TIME ZONE 'America/Sao_Paulo')::TIME;

    SELECT * INTO v_policy
    FROM public.noise_policies
    WHERE condominium_id = v_condominium_id
      AND enabled = true
      AND (
        (start_time <= end_time AND v_reading_time >= start_time AND v_reading_time < end_time)
        OR
        (start_time > end_time AND (v_reading_time >= start_time OR v_reading_time < end_time))
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_threshold := v_policy.threshold_db;
        v_warning_threshold := v_policy.warning_threshold_db;
        v_critical_threshold := v_policy.critical_threshold_db;
        v_min_duration := v_policy.min_duration_seconds;
        v_cooldown := v_policy.cooldown_seconds;
    ELSE
        IF v_reading_time >= '22:00:00'::TIME OR v_reading_time < '07:00:00'::TIME THEN
            v_threshold := 60.0;
            v_warning_threshold := 60.0;
            v_critical_threshold := 70.0;
        ELSE
            v_threshold := 70.0;
            v_warning_threshold := 70.0;
            v_critical_threshold := 80.0;
        END IF;
    END IF;

    IF NEW.decibel < v_warning_threshold THEN
        RETURN NEW;
    END IF;

    IF NEW.decibel >= v_critical_threshold THEN
        v_severity := 'critical';
    ELSE
        v_severity := 'warning';
    END IF;

    SELECT id, peak_db, average_db, duration_seconds, started_at, ended_at, severity
    INTO v_existing_event
    FROM public.noise_events
    WHERE apartment_id = NEW.apartment_id
      AND ended_at >= (NEW.recorded_at - INTERVAL '15 seconds')
    ORDER BY ended_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_duration := GREATEST(1, EXTRACT(EPOCH FROM (NEW.recorded_at - v_existing_event.started_at))::INTEGER);

        UPDATE public.noise_events
        SET ended_at = NEW.recorded_at,
            duration_seconds = v_duration,
            peak_db = GREATEST(v_existing_event.peak_db, NEW.decibel),
            average_db = ROUND(((v_existing_event.average_db * v_existing_event.duration_seconds + NEW.decibel) / (v_existing_event.duration_seconds + 1))::NUMERIC, 2),
            severity = CASE 
                WHEN v_severity = 'critical' OR v_existing_event.severity = 'critical' THEN 'critical' 
                ELSE 'warning' 
            END,
            device_id = COALESCE(NEW.device_id, v_existing_event.device_id),
            sensor_id = COALESCE(NEW.sensor_id, v_existing_event.sensor_id)
        WHERE id = v_existing_event.id;

        v_event_id := v_existing_event.id;

        IF v_duration >= v_min_duration THEN
            SELECT EXISTS(
                SELECT 1 FROM public.alerts
                WHERE event_id = v_event_id
                   OR (apartment_id = NEW.apartment_id AND created_at >= (NEW.recorded_at - (v_cooldown || ' seconds')::INTERVAL))
            ) INTO v_alert_exists;

            IF NOT v_alert_exists THEN
                INSERT INTO public.alerts (
                    apartment_id,
                    event_id,
                    type,
                    title,
                    message,
                    severity
                ) VALUES (
                    NEW.apartment_id,
                    v_event_id,
                    'high_noise',
                    CASE 
                        WHEN v_severity = 'critical' THEN 'ALERTA!! RUÍDO ALTO DETECTADO'
                        ELSE 'Aviso: Nível de Ruído Elevado'
                    END,
                    format('Nível sonoro atingiu %s dB no seu apartamento.', NEW.decibel),
                    v_severity
                );
            END IF;
        END IF;

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
            acknowledged,
            source
        ) VALUES (
            NEW.apartment_id,
            NEW.device_id,
            NEW.sensor_id,
            NEW.decibel,
            NEW.decibel,
            1,
            NEW.recorded_at,
            NEW.recorded_at,
            v_severity,
            false,
            NEW.source
        ) RETURNING id INTO v_event_id;

        IF v_min_duration <= 1 THEN
            INSERT INTO public.alerts (
                apartment_id,
                event_id,
                type,
                title,
                message,
                severity
            ) VALUES (
                NEW.apartment_id,
                v_event_id,
                'high_noise',
                CASE 
                    WHEN v_severity = 'critical' THEN 'ALERTA!! RUÍDO ALTO DETECTADO'
                    ELSE 'Aviso: Nível de Ruído Elevado'
                END,
                format('Nível sonoro atingiu %s dB no seu apartamento.', NEW.decibel),
                v_severity
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_noise_reading ON public.noise_readings;
CREATE TRIGGER trg_process_noise_reading
    AFTER INSERT ON public.noise_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.process_noise_reading();


CREATE OR REPLACE FUNCTION public.cleanup_test_data()
RETURNS JSONB AS $$
DECLARE
    v_deleted_readings INTEGER;
    v_deleted_events INTEGER;
    v_deleted_alerts INTEGER;
BEGIN
    WITH deleted_r AS (
        DELETE FROM public.noise_readings
        WHERE is_test_data = true
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_readings FROM deleted_r;

    WITH deleted_e AS (
        DELETE FROM public.noise_events
        WHERE source = 'simulation'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_events FROM deleted_e;

    WITH deleted_a AS (
        DELETE FROM public.alerts
        WHERE event_id IS NULL OR event_id NOT IN (SELECT id FROM public.noise_events)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_alerts FROM deleted_a;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_readings', v_deleted_readings,
        'deleted_events', v_deleted_events,
        'deleted_alerts', v_deleted_alerts
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
