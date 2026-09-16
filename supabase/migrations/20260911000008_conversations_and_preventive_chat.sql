
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES public.occurrences(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ocorrencia', 'preventivo')) DEFAULT 'ocorrencia',
    status TEXT NOT NULL CHECK (status IN ('aberta', 'fechada', 'arquivada')) DEFAULT 'aberta',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_condo ON public.conversations(condominium_id);
CREATE INDEX IF NOT EXISTS idx_conversations_apt ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_occ ON public.conversations(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv ON public.conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_read ON public.conversation_messages(conversation_id, read);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

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
