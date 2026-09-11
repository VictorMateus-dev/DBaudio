-- =====================================================================
-- dBSound - Monitoramento Inteligente de Ruído Residencial
-- Seed Data: Condomínio de Demonstração, Apartamentos 101-303,
-- Dispositivos ESP32, Sensores, Políticas e Usuários de Teste
-- =====================================================================

DO $$
DECLARE
    v_condo_id UUID := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    v_building_id UUID := 'b1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    v_apt_101 UUID := '10100000-0000-0000-0000-000000000101';
    v_apt_102 UUID := '10200000-0000-0000-0000-000000000102';
    v_apt_103 UUID := '10300000-0000-0000-0000-000000000103';
    v_apt_201 UUID := '20100000-0000-0000-0000-000000000201';
    v_apt_202 UUID := '20200000-0000-0000-0000-000000000202';
    v_apt_203 UUID := '20300000-0000-0000-0000-000000000203';
    v_apt_301 UUID := '30100000-0000-0000-0000-000000000301';
    v_apt_302 UUID := '30200000-0000-0000-0000-000000000302';
    v_apt_303 UUID := '30300000-0000-0000-0000-000000000303';

    v_dev_101 UUID := 'd1010000-0000-0000-0000-000000000101';
    v_dev_102 UUID := 'd1020000-0000-0000-0000-000000000102';
    v_dev_103 UUID := 'd1030000-0000-0000-0000-000000000103';
    v_dev_201 UUID := 'd2010000-0000-0000-0000-000000000201';
    v_dev_202 UUID := 'd2020000-0000-0000-0000-000000000202';
    v_dev_203 UUID := 'd2030000-0000-0000-0000-000000000203';
    v_dev_301 UUID := 'd3010000-0000-0000-0000-000000000301';
    v_dev_302 UUID := 'd3020000-0000-0000-0000-000000000302';
    v_dev_303 UUID := 'd3030000-0000-0000-0000-000000000303';

    v_admin_id UUID := 'aaaa1111-0000-0000-0000-000000000001';
    v_morador_101 UUID := 'bbbb2222-0000-0000-0000-000000000101';
    v_morador_102 UUID := 'bbbb2222-0000-0000-0000-000000000102';
    v_morador_202 UUID := 'bbbb2222-0000-0000-0000-000000000202';

    v_occ_id UUID := 'e1e2e3e4-0000-0000-0000-000000000001';
    v_sensor_101_sala UUID;
BEGIN
    -- 1. CONDOMÍNIO
    INSERT INTO public.condominiums (id, name, address)
    VALUES (v_condo_id, 'Residencial dBSound', 'Av. das Nações Inteligentes, 1000 - São Paulo, SP')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

    -- 2. BLOCO
    INSERT INTO public.buildings (id, condominium_id, name)
    VALUES (v_building_id, v_condo_id, 'Bloco A')
    ON CONFLICT (id) DO NOTHING;

    -- 3. APARTAMENTOS (101 a 303)
    INSERT INTO public.apartments (id, building_id, number, floor) VALUES
        (v_apt_101, v_building_id, '101', 1),
        (v_apt_102, v_building_id, '102', 1),
        (v_apt_103, v_building_id, '103', 1),
        (v_apt_201, v_building_id, '201', 2),
        (v_apt_202, v_building_id, '202', 2),
        (v_apt_203, v_building_id, '203', 2),
        (v_apt_301, v_building_id, '301', 3),
        (v_apt_302, v_building_id, '302', 3),
        (v_apt_303, v_building_id, '303', 3)
    ON CONFLICT (id) DO NOTHING;

    -- 4. POLÍTICAS DE RUÍDO (DIURNA: 70 dB / NOTURNA: 60 dB)
    DELETE FROM public.noise_policies WHERE condominium_id = v_condo_id;

    INSERT INTO public.noise_policies (
        condominium_id, name, start_time, end_time, threshold_db, warning_threshold_db, critical_threshold_db, min_duration_seconds, cooldown_seconds, enabled
    ) VALUES
        (v_condo_id, 'Política Diurna', '07:00:00'::TIME, '22:00:00'::TIME, 70.0, 70.0, 80.0, 3, 60, true),
        (v_condo_id, 'Política Noturna (Lei do Silêncio)', '22:00:00'::TIME, '07:00:00'::TIME, 60.0, 60.0, 70.0, 3, 60, true);

    -- 5. USUÁRIOS FICTÍCIOS NO AUTH.USERS (PARA AMBIENTES ONDE AUTONOMIA É TOTAL)
    -- Em ambiente Supabase gerenciado, o Auth cria na tabela auth.users; aqui garantimos coerência relacional.
    BEGIN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
        VALUES 
            (v_admin_id, 'admin@dbsound.com', crypt('Admin@123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Síndico Geral"}', now(), now(), 'authenticated'),
            (v_morador_101, 'morador101@dbsound.com', crypt('Morador@123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"João Silva (101)"}', now(), now(), 'authenticated'),
            (v_morador_102, 'morador102@dbsound.com', crypt('Morador@123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maria Oliveira (102)"}', now(), now(), 'authenticated'),
            (v_morador_202, 'morador202@dbsound.com', crypt('Morador@123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lucas Souza (202)"}', now(), now(), 'authenticated')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN undefined_table THEN
            NULL; -- Caso auth.users não seja acessível diretamente sem privilégios de superuser
    END;

    -- 6. PERFIS DOS USUÁRIOS
    INSERT INTO public.profiles (id, full_name, email, phone, role, condominium_id, apartment_id) VALUES
        (v_admin_id, 'Carlos Síndico Geral', 'admin@dbsound.com', '(11) 98888-0001', 'admin', v_condo_id, NULL),
        (v_morador_101, 'João Silva', 'morador101@dbsound.com', '(11) 97777-0101', 'resident', v_condo_id, v_apt_101),
        (v_morador_102, 'Maria Oliveira', 'morador102@dbsound.com', '(11) 97777-0102', 'resident', v_condo_id, v_apt_102),
        (v_morador_202, 'Lucas Souza', 'morador202@dbsound.com', '(11) 97777-0202', 'resident', v_condo_id, v_apt_202)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    -- 7. DISPOSITIVOS ESP32 (COM TOKENS EXCLUSIVOS DE CADA DISPOSITIVO)
    INSERT INTO public.devices (id, apartment_id, device_uid, name, status, firmware_version, secret_token, last_seen_at) VALUES
        (v_dev_101, v_apt_101, 'ESP32-APT-101', 'Unidade Central Apto 101', 'online', '1.2.0', 'dbsound_token_101_secure', now()),
        (v_dev_102, v_apt_102, 'ESP32-APT-102', 'Unidade Central Apto 102', 'online', '1.2.0', 'dbsound_token_102_secure', now()),
        (v_dev_103, v_apt_103, 'ESP32-APT-103', 'Unidade Central Apto 103', 'online', '1.2.0', 'dbsound_token_103_secure', now()),
        (v_dev_201, v_apt_201, 'ESP32-APT-201', 'Unidade Central Apto 201', 'online', '1.2.0', 'dbsound_token_201_secure', now()),
        (v_dev_202, v_apt_202, 'ESP32-APT-202', 'Unidade Central Apto 202', 'online', '1.2.0', 'dbsound_token_202_secure', now()),
        (v_dev_203, v_apt_203, 'ESP32-APT-203', 'Unidade Central Apto 203', 'offline', '1.1.0', 'dbsound_token_203_secure', now() - INTERVAL '3 hours'),
        (v_dev_301, v_apt_301, 'ESP32-APT-301', 'Unidade Central Apto 301', 'online', '1.2.0', 'dbsound_token_301_secure', now()),
        (v_dev_302, v_apt_302, 'ESP32-APT-302', 'Unidade Central Apto 302', 'online', '1.2.0', 'dbsound_token_302_secure', now()),
        (v_dev_303, v_apt_303, 'ESP32-APT-303', 'Unidade Central Apto 303', 'maintenance', '1.0.0', 'dbsound_token_303_secure', now() - INTERVAL '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- 8. SENSORES (3 SENSORES POR DISPOSITIVO: SALA, QUARTO, COZINHA)
    DELETE FROM public.sensors WHERE device_id IN (v_dev_101, v_dev_102, v_dev_103, v_dev_201, v_dev_202, v_dev_203, v_dev_301, v_dev_302, v_dev_303);

    INSERT INTO public.sensors (device_id, name, position, channel, enabled) VALUES
        -- Apto 101
        (v_dev_101, 'MAX9814 - Sala Principal', 'Sala', 1, true),
        (v_dev_101, 'MAX9814 - Quarto Casal', 'Quarto', 2, true),
        (v_dev_101, 'MAX9814 - Cozinha/Área', 'Cozinha', 3, true),
        -- Apto 102
        (v_dev_102, 'MAX9814 - Sala', 'Sala', 1, true),
        (v_dev_102, 'MAX9814 - Quarto', 'Quarto', 2, true),
        (v_dev_102, 'MAX9814 - Cozinha', 'Cozinha', 3, true),
        -- Apto 202
        (v_dev_202, 'MAX9814 - Sala', 'Sala', 1, true),
        (v_dev_202, 'MAX9814 - Quarto', 'Quarto', 2, true),
        (v_dev_202, 'MAX9814 - Cozinha', 'Cozinha', 3, true);

    SELECT id INTO v_sensor_101_sala FROM public.sensors WHERE device_id = v_dev_101 AND channel = 1 LIMIT 1;

    -- 9. LEITURAS INICIAIS DE TELEMETRIA (BASELINE NORMAL: 42 A 52 dB)
    INSERT INTO public.noise_readings (device_id, sensor_id, apartment_id, decibel, source, is_test_data, recorded_at) VALUES
        (v_dev_101, v_sensor_101_sala, v_apt_101, 45.2, 'esp32', false, now() - INTERVAL '50 minutes'),
        (v_dev_101, v_sensor_101_sala, v_apt_101, 48.0, 'esp32', false, now() - INTERVAL '40 minutes'),
        (v_dev_101, v_sensor_101_sala, v_apt_101, 52.4, 'esp32', false, now() - INTERVAL '30 minutes'),
        (v_dev_101, v_sensor_101_sala, v_apt_101, 46.1, 'esp32', false, now() - INTERVAL '20 minutes'),
        (v_dev_101, v_sensor_101_sala, v_apt_101, 49.5, 'esp32', false, now() - INTERVAL '10 minutes'),
        (v_dev_101, v_sensor_101_sala, v_apt_101, 44.8, 'esp32', false, now());

    -- 10. OCORRÊNCIA DEMONSTRATIVA
    INSERT INTO public.occurrences (
        id, condominium_id, reporter_id, apartment_id, type, location, description, occurred_at, status, priority, anonymous
    ) VALUES (
        v_occ_id,
        v_condo_id,
        v_morador_101,
        v_apt_202,
        'Música Alta e Batidas',
        'Apartamento 202',
        'Som mecânico com graves intensos sendo reproduzido repetidamente após às 22h30.',
        now() - INTERVAL '2 hours',
        'em análise',
        'alta',
        false
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.occurrence_comments (occurrence_id, author_id, comment, created_at)
    VALUES
        (v_occ_id, v_admin_id, 'Notificação orientativa enviada preventivamente ao morador do apartamento citado via painel.', now() - INTERVAL '1 hour 30 minutes'),
        (v_occ_id, v_morador_101, 'Ruído cessou por volta das 23h45. Agradeço a rápida intervenção!', now() - INTERVAL '30 minutes')
    ON CONFLICT DO NOTHING;

END $$;
