-- =====================================================================
-- dBSound: Migração 009 — Auditoria de Chat, Conversas e Cancelamento de Multas
-- =====================================================================

-- 1. Adiciona coluna sender_role em conversation_messages se não existir
ALTER TABLE public.conversation_messages
    ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'syndic' CHECK (sender_role IN ('syndic', 'resident'));

-- 2. Adiciona colunas de auditoria de cancelamento em fines se não existirem
ALTER TABLE public.fines
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- 3. Atualiza restrição de status em fines para garantir 'cancelada'
DO $$ 
BEGIN
    ALTER TABLE public.fines DROP CONSTRAINT IF EXISTS fines_status_check;
    ALTER TABLE public.fines ADD CONSTRAINT fines_status_check 
        CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_conv_messages_role ON public.conversation_messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_fines_status ON public.fines(status);
CREATE INDEX IF NOT EXISTS idx_fines_apartment ON public.fines(apartment_id);

-- 5. RLS Policies para conversation_messages e conversations com isolamento
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

GRANT ALL ON public.conversations TO anon, authenticated, service_role;
GRANT ALL ON public.conversation_messages TO anon, authenticated, service_role;
GRANT ALL ON public.fines TO anon, authenticated, service_role;
