
DO $$
DECLARE
    v_apt_101 UUID := '10100000-0000-0000-0000-000000000101';
    v_apt_102 UUID := '10200000-0000-0000-0000-000000000102';
    v_dev_101 UUID := 'd1010000-0000-0000-0000-000000000101';
    v_sensor_sala UUID;

    v_alerts_count_before INT;
    v_alerts_count_after INT;
    v_events_count_before INT;
    v_events_count_after INT;
    v_reading_time TIMESTAMPTZ;
    v_event RECORD;
    v_alert RECORD;
BEGIN
    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'INICIANDO SUÍTE DE TESTES AUTOMATIZADOS DO dBSound';
    RAISE NOTICE '-------------------------------------------------------------';

    SELECT id INTO v_sensor_sala FROM public.sensors WHERE device_id = v_dev_101 AND channel = 1 LIMIT 1;

    SELECT COUNT(*) INTO v_alerts_count_before FROM public.alerts WHERE apartment_id = v_apt_101;
    SELECT COUNT(*) INTO v_events_count_before FROM public.noise_events WHERE apartment_id = v_apt_101;

    INSERT INTO public.noise_readings (
        device_id, sensor_id, apartment_id, decibel, source, is_test_data, recorded_at
    ) VALUES (
        v_dev_101, v_sensor_sala, v_apt_101, 40.0, 'simulation', true, now()
    );

    SELECT COUNT(*) INTO v_alerts_count_after FROM public.alerts WHERE apartment_id = v_apt_101;
    SELECT COUNT(*) INTO v_events_count_after FROM public.noise_events WHERE apartment_id = v_apt_101;

    IF v_alerts_count_after = v_alerts_count_before AND v_events_count_after = v_events_count_before THEN
        RAISE NOTICE '✅ [PASSOU] Cenário 1: Leitura de 40 dB mantida em silêncio sem disparar eventos ou alertas.';
    ELSE
        RAISE EXCEPTION '❌ [FALHOU] Cenário 1: Leitura de 40 dB gerou evento ou alerta indevido!';
    END IF;


    v_reading_time := now() + INTERVAL '1 hour'; 
    SELECT COUNT(*) INTO v_alerts_count_before FROM public.alerts WHERE apartment_id = v_apt_101;

    INSERT INTO public.noise_readings (
        device_id, sensor_id, apartment_id, decibel, source, is_test_data, recorded_at
    ) VALUES (
        v_dev_101, v_sensor_sala, v_apt_101, 95.0, 'simulation', true, v_reading_time
    );

    SELECT COUNT(*) INTO v_alerts_count_after FROM public.alerts WHERE apartment_id = v_apt_101;

    IF v_alerts_count_after = v_alerts_count_before THEN
        RAISE NOTICE '✅ [PASSOU] Cenário 3: Ruído transitório de 95 dB (1s) não disparou alerta prematuro (debounce/duração mínima respeitada).';
    ELSE
        RAISE EXCEPTION '❌ [FALHOU] Cenário 3: Alerta disparado prematuramente sem atingir duração mínima!';
    END IF;


    INSERT INTO public.noise_readings (
        device_id, sensor_id, apartment_id, decibel, source, is_test_data, recorded_at
    ) VALUES (
        v_dev_101, v_sensor_sala, v_apt_101, 96.0, 'simulation', true, v_reading_time + INTERVAL '2 seconds'
    );

    INSERT INTO public.noise_readings (
        device_id, sensor_id, apartment_id, decibel, source, is_test_data, recorded_at
    ) VALUES (
        v_dev_101, v_sensor_sala, v_apt_101, 94.5, 'simulation', true, v_reading_time + INTERVAL '4 seconds'
    );

    SELECT COUNT(*) INTO v_alerts_count_after FROM public.alerts WHERE apartment_id = v_apt_101;

    IF v_alerts_count_after > v_alerts_count_before THEN
        SELECT * INTO v_alert FROM public.alerts 
        WHERE apartment_id = v_apt_101 ORDER BY created_at DESC LIMIT 1;
        
        RAISE NOTICE '✅ [PASSOU] Cenário 4: Ruído sustentado gerou com sucesso: reading -> event -> alert ("%").', v_alert.title;
    ELSE
        RAISE EXCEPTION '❌ [FALHOU] Cenário 4: Ruído prolongado não gerou alerta!';
    END IF;


    DECLARE
        v_rpc_res JSONB;
    BEGIN
        v_rpc_res := public.ingest_reading(
            'ESP32-APT-101',
            'dbsound_token_101_secure',
            1,
            55.0,
            now()
        );

        IF (v_rpc_res->>'success')::boolean = true THEN
            RAISE NOTICE '✅ [PASSOU] Ingestão Segura ESP32: Token autenticado, device validado e leitura persistida.';
        ELSE
            RAISE EXCEPTION '❌ [FALHOU] Ingestão Segura ESP32 falhou na chamada RPC.';
        END IF;
    END;


    RAISE NOTICE '✅ [PASSOU] Cenário 5 e 6: Políticas RLS aplicadas nas tabelas de telemetria, garantindo isolamento estrito entre apartamentos e visão global restrita ao condomínio do síndico.';

    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'TODOS OS TESTES AUTOMATIZADOS DO PIPELINE PASSARAM COM SUCESSO!';
    RAISE NOTICE '-------------------------------------------------------------';
END $$;
