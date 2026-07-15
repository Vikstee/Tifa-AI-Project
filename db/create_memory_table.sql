-- ==========================================
-- CREATE USER MEMORIES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_text TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_memories_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own memory"
ON public.user_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
ON public.user_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
ON public.user_memories FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
