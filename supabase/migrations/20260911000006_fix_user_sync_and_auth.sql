INSERT INTO public.condominiums (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, condominium_id, name)
VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS chk_resident_apartment;

ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS chk_resident_apartment_flexible;
DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualizacao de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir remocao de perfis" ON public.profiles;

CREATE POLICY "Permitir leitura de perfis" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Permitir insercao de perfis" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de perfis" ON public.profiles
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir remocao de perfis" ON public.profiles
    FOR DELETE USING (true);

GRANT ALL ON public.profiles TO anon, authenticated, service_role;
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
    RETURN QUERY 
    SELECT * FROM public.profiles 
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        CASE WHEN NEW.email ILIKE '%admin%' OR NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin' ELSE 'resident' END,
        v_condo_id,
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
GRANT EXECUTE ON FUNCTION public.sync_and_get_all_profiles() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
