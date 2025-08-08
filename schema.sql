-- Enable UUID + extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Profiles (users table mirror)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  last_seen timestamptz default now(),
  theme jsonb,
  created_at timestamptz default now()
);

-- Chat rooms
create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text,
  is_group boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Room members (many-to-many)
create table if not exists public.room_members (
  room_id uuid references public.chat_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS after all tables exist
alter table public.profiles enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Profiles are viewable by authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Chat rooms policies
create policy "Rooms are viewable to members" on public.chat_rooms
  for select using (
    exists(
      select 1 from public.room_members rm
      where rm.room_id = chat_rooms.id and rm.user_id = auth.uid()
    )
  );

create policy "Creator can delete room" on public.chat_rooms
  for delete using (created_by = auth.uid());

-- Room members policies
-- Members can read memberships for rooms they belong to
create policy "Members can read memberships" on public.room_members
  for select using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id and rm.user_id = auth.uid()
    )
  );

-- A user can join/leave themselves OR the room creator can manage all memberships
create policy "Insert memberships" on public.room_members
  for insert with check (
    user_id = auth.uid() or exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id and cr.created_by = auth.uid()
    )
  );

create policy "Delete memberships" on public.room_members
  for delete using (
    user_id = auth.uid() or exists (
      select 1 from public.chat_rooms cr
      where cr.id = room_id and cr.created_by = auth.uid()
    )
  );

-- Messages policies
create policy "Members can read messages" on public.messages
  for select using (
    exists (
      select 1 from public.room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid()
    )
  );

create policy "Members can send messages" on public.messages
  for insert with check (
    exists (
      select 1 from public.room_members rm where rm.room_id = messages.room_id and rm.user_id = auth.uid()
    ) and sender_id = auth.uid()
  );

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;

-- Helper: on sign up create profile with a simple username
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


