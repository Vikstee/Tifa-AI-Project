-- 1. Create a new Storage Bucket named 'chat_attachments'
insert into storage.buckets (id, name, public) 
values ('chat_attachments', 'chat_attachments', true)
on conflict (id) do nothing;

-- 2. Allow public access to read files
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'chat_attachments' );

-- 3. Allow authenticated users to upload files
create policy "Auth Upload" 
on storage.objects for insert 
with check ( bucket_id = 'chat_attachments' AND auth.role() = 'authenticated' );

-- 4. Add 'files' column to chat_messages table to store file URLs
alter table chat_messages 
add column if not exists files jsonb default '[]'::jsonb;
