ALTER TABLE public.conversation_messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
UPDATE public.conversation_messages
SET read_at = created_at
WHERE read = true AND read_at IS NULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_read_at ON public.conversation_messages(conversation_id, read_at);
CREATE INDEX IF NOT EXISTS idx_conv_messages_sender_read ON public.conversation_messages(conversation_id, sender_id, read_at);
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
GRANT ALL ON public.conversations TO anon, authenticated, service_role;
GRANT ALL ON public.conversation_messages TO anon, authenticated, service_role;
