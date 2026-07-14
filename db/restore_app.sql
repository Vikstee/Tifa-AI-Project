-- ==========================================
-- SCRIPT RESTORE CORE APP (CHAT & SESSIONS)
-- ==========================================

-- 1. Buat ulang tabel Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Buat ulang tabel Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' atau 'assistant'
    content TEXT NOT NULL,
    files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Aktifkan Keamanan RLS (Row Level Security)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Akses (Policy)
-- User hanya bisa melihat, membuat, dan menghapus sesi chat miliknya sendiri
CREATE POLICY "Manage own chat sessions" 
ON chat_sessions FOR ALL 
USING (auth.uid() = user_id);

-- User hanya bisa mengelola pesan yang ada di dalam sesi miliknya
CREATE POLICY "Manage own chat messages" 
ON chat_messages FOR ALL 
USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- 5. Pastikan Storage Bucket aman (Opsional jika ikut terhapus)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_attachments');

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat_attachments' AND auth.role() = 'authenticated');
