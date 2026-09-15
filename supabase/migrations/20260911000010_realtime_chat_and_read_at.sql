-- =====================================================================
-- dBSound: Migração 010 — Realtime Chat, Replica Identity e Read Receipts (read_at)
-- =====================================================================

-- 1. Adiciona coluna read_at na tabela conversation_messages se não existir
ALTER TABLE public.conversation_messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Migra mensagens antigas que já estavam marcadas como read = true
UPDATE public.conversation_messages
SET read_at = created_at
WHERE read = true AND read_at IS NULL;

-- 3. Configura REPLICA IDENTITY FULL para que UPDATEs no Realtime enviem todos os campos
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;

-- 4. Adiciona índices para otimização de consultas de mensagens lidas e não lidas
CREATE INDEX IF NOT EXISTS idx_conv_messages_read_at ON public.conversation_messages(conversation_id, read_at);
CREATE INDEX IF NOT EXISTS idx_conv_messages_sender_read ON public.conversation_messages(conversation_id, sender_id, read_at);

-- 5. Habilita Replicação no supabase_realtime para as tabelas de conversas e mensagens
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
    END IF;
END $$;

-- 6. Garante permissões irrestritas para os papéis de aplicação
GRANT ALL ON public.conversations TO anon, authenticated, service_role;
GRANT ALL ON public.conversation_messages TO anon, authenticated, service_role;
