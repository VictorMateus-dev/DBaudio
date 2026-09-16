INSERT INTO public.condominiums (id, name, address, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Condomínio Residencial Parque das Flores',
    'Av. das Nações Unidas, 1000',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, condominium_id, name, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002'::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Bloco Principal',
    now()
)
ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_condo_id UUID;
BEGIN
    SELECT id INTO default_condo_id FROM public.condominiums ORDER BY created_at ASC LIMIT 1;
    
    IF default_condo_id IS NULL THEN
        INSERT INTO public.condominiums (id, name, address, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Condomínio Residencial Parque das Flores', 'Av. das Nações Unidas, 1000', now(), now())
        ON CONFLICT (id) DO NOTHING;
        
        INSERT INTO public.buildings (id, condominium_id, name, created_at)
        VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal', now())
        ON CONFLICT (id) DO NOTHING;

        default_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;

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
        NULL,
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
CREATE OR REPLACE FUNCTION public.assign_resident_to_apartment(
    p_profile_id UUID,
    p_apartment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_apt_number TEXT;
    v_profile_name TEXT;
BEGIN
    SELECT number INTO v_apt_number FROM public.apartments WHERE id = p_apartment_id;
    IF v_apt_number IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apartamento não encontrado.');
    END IF;
    SELECT full_name INTO v_profile_name FROM public.profiles WHERE id = p_profile_id;
    IF v_profile_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Perfil de morador não encontrado.');
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
CREATE OR REPLACE FUNCTION public.unassign_resident_from_apartment(
    p_profile_id UUID
)
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
    SELECT id INTO v_building_id FROM public.buildings LIMIT 1;
    IF v_building_id IS NULL THEN
        INSERT INTO public.condominiums (id, name, address)
        VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Condomínio Residencial Parque das Flores', 'Av. das Nações Unidas, 1000')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.buildings (id, condominium_id, name)
        VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal')
        ON CONFLICT (id) DO NOTHING;

        v_building_id := '00000000-0000-0000-0000-000000000002'::UUID;
    END IF;
    INSERT INTO public.apartments (
        building_id,
        number,
        floor,
        custom_day_threshold_db,
        custom_night_threshold_db,
        custom_critical_threshold_db,
        created_at
    ) VALUES (
        v_building_id,
        p_number,
        COALESCE(p_floor, 1),
        COALESCE(p_day_db, 70.0),
        COALESCE(p_night_db, 60.0),
        COALESCE(p_crit_db, 80.0),
        now()
    )
    RETURNING * INTO v_new_apt;
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
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

    IF v_profile IS NULL THEN
        SELECT id INTO v_condo_id FROM public.condominiums LIMIT 1;
        IF v_condo_id IS NULL THEN
            INSERT INTO public.condominiums (id, name, address)
            VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Condomínio Residencial Parque das Flores', 'Av. das Nações Unidas, 1000')
            ON CONFLICT (id) DO NOTHING;
            v_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
        END IF;

        INSERT INTO public.profiles (
            id, full_name, email, role, condominium_id, apartment_id, created_at, updated_at
        ) VALUES (
            p_user_id,
            COALESCE(p_full_name, split_part(p_email, '@', 1)),
            p_email,
            'resident',
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
DROP POLICY IF EXISTS "Moradores veem seu próprio apartamento" ON public.apartments;
CREATE POLICY "Moradores veem seu próprio apartamento" ON public.apartments
    FOR SELECT USING (
        id IN (SELECT apartment_id FROM public.profiles WHERE id = auth.uid())
        OR public.current_user_role() = 'admin'
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Leitura de perfis no condomínio" ON public.profiles;
CREATE POLICY "Leitura de perfis no condomínio" ON public.profiles
    FOR SELECT USING (true);
GRANT EXECUTE ON FUNCTION public.assign_resident_to_apartment(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unassign_resident_from_apartment(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_apartment_and_assign(TEXT, INT, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO authenticated, anon;
