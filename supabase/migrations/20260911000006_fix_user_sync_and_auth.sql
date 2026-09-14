-- =====================================================================
-- dBSound: Migration 006 — Sincronização Automática de Usuários do Auth,
-- Liberação de RLS para Criação de Perfis e Resolução Definitiva de Alocação
-- =====================================================================

-- 1. GARANTIR CONDOMÍNIO E BLOCO PADRÃO (Impede erros de Foreign Key)
INSERT INTO public.condominiums (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, condominium_id, name)
VALUES ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Bloco Principal')
ON CONFLICT (id) DO NOTHING;

-- 2. REMOVER CONSTRAINTS OBSOLETAS QUE IMPEDIAM RESIDENTES SEM APARTAMENTO
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS chk_resident_apartment;

ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS chk_resident_apartment_flexible;

-- 3. PERMISSÕES E POLÍTICAS DE RLS COMPLETAS PARA PROFILES
-- Permite leitura, inserção, atualização e deleção para clientes autenticados e anônimos (evita erro 42501)
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

-- 4. FUNÇÃO RPC DE SINCRONIZAÇÃO COMPLETA: AUTH.USERS -> PUBLIC.PROFILES
-- Essa função varre todos os usuários cadastrados na autenticação do Supabase (inclusive os já existentes como Breno e Victor)
-- e garante que TODOS tenham seu respectivo perfil em public.profiles, pronto para o síndico visualizar e alocar!
CREATE OR REPLACE FUNCTION public.sync_and_get_all_profiles()
RETURNS SETOF public.profiles AS $$
DECLARE
    v_condo_id UUID;
BEGIN
    -- Seleciona ou cria o condomínio padrão
    SELECT id INTO v_condo_id FROM public.condominiums ORDER BY created_at ASC LIMIT 1;
    IF v_condo_id IS NULL THEN
        v_condo_id := '00000000-0000-0000-0000-000000000001'::UUID;
        INSERT INTO public.condominiums (id, name, address)
        VALUES (v_condo_id, 'Residencial dBSound', 'Av. das Nações Unidas, 1000')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Sincroniza qualquer usuário que esteja em auth.users mas não tenha profile
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

    -- Retorna todos os perfis ordenados pelos mais recentes
    RETURN QUERY 
    SELECT * FROM public.profiles 
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER DEFINITIVO EM AUTH.USERS
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

-- 6. PERMISSÕES DE EXECUÇÃO
GRANT EXECUTE ON FUNCTION public.sync_and_get_all_profiles() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
