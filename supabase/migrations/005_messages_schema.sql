-- ============================================================
-- City-Pulse: Private Messages Schema
-- ============================================================

-- 1. CONVERSATIONS (thread between 2 users)
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_participants unique (participant_1, participant_2),
  constraint different_participants check (participant_1 <> participant_2)
);

alter table public.conversations enable row level security;

create policy "Users see own conversations"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_1);

create policy "Participants can update conversation"
  on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create trigger on_conversation_updated
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- 2. MESSAGES
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants see messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and c.status = 'active'
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- 3. BLOCKED USERS
create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "Users can see own blocks"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

create policy "Users can block"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

create policy "Users can unblock"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- 4. VIEW: conversations with last message & participant info
create or replace view public.conversations_with_details as
select
  c.*,
  p1.display_name as p1_name,
  p1.avatar_url as p1_avatar,
  p2.display_name as p2_name,
  p2.avatar_url as p2_avatar,
  lm.content as last_message,
  lm.created_at as last_message_at,
  lm.sender_id as last_sender_id,
  coalesce(unread.count, 0) as unread_count
from public.conversations c
left join public.profiles p1 on p1.id = c.participant_1
left join public.profiles p2 on p2.id = c.participant_2
left join lateral (
  select content, created_at, sender_id
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc limit 1
) lm on true
left join lateral (
  select count(*)::int as count
  from public.messages m
  where m.conversation_id = c.id
  and m.is_read = false
  and m.sender_id <> auth.uid()
) unread on true;

-- 5. INDEXES
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_messages_sender on public.messages(sender_id);
create index idx_conversations_p1 on public.conversations(participant_1);
create index idx_conversations_p2 on public.conversations(participant_2);
create index idx_blocked_users_blocked on public.blocked_users(blocked_id);
