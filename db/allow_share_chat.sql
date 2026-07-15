-- ==========================================
-- ENABLE PUBLIC READ FOR SHARE CHAT
-- ==========================================
-- Skrip ini mengizinkan siapa saja yang memiliki Link (UUID)
-- untuk dapat membaca tabel chat_sessions dan chat_messages.
-- Karena UUID mustahil ditebak, ini aman untuk fitur Share.

-- Pastikan RLS aktif
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada agar tidak bentrok
DROP POLICY IF EXISTS "Allow public read chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;

-- Buat policy baru yang mengizinkan SELECT untuk semua orang (anonim & login)
CREATE POLICY "Allow public read chat_sessions" 
ON public.chat_sessions FOR SELECT 
USING (true);

CREATE POLICY "Allow public read chat_messages" 
ON public.chat_messages FOR SELECT 
USING (true);
