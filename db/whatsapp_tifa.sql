-- TIFA WhatsApp group controls and audit trail.
-- Run this migration in Supabase SQL Editor before enabling the worker.

create table if not exists public.whatsapp_allowed_groups (
  id uuid primary key default gen_random_uuid(),
  group_jid text unique not null,
  group_lid text,
  group_name text,
  is_active boolean not null default false,
  allowed_senders jsonb not null default '[]'::jsonb,
  allowed_commands jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_allowed_groups_active_idx
  on public.whatsapp_allowed_groups (is_active, group_jid);

create table if not exists public.whatsapp_tifa_requests (
  id uuid primary key default gen_random_uuid(),
  message_id text unique not null,
  group_jid text not null,
  group_lid text,
  sender_id text not null,
  sender_lid text,
  prompt text not null,
  response_text text,
  report_title text,
  status text not null default 'received'
    check (status in ('received', 'processing', 'sent', 'ignored', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists whatsapp_tifa_requests_group_idx
  on public.whatsapp_tifa_requests (group_jid, created_at desc);

alter table public.whatsapp_allowed_groups enable row level security;
alter table public.whatsapp_tifa_requests enable row level security;

-- No public policies are created intentionally. The worker/API must use the
-- Supabase service-role key kept only on the server, never in the browser.
