create table if not exists public.syncdev_rooms (
    room_id text primary key check (char_length(room_id) between 1 and 128),
    code text not null default '' check (char_length(code) <= 500000),
    revision text not null default '' check (char_length(revision) <= 160),
    author_id text not null default '' check (char_length(author_id) <= 100),
    updated_at timestamptz not null default now()
);

create table if not exists public.syncdev_room_clients (
    room_id text not null references public.syncdev_rooms(room_id) on delete cascade,
    client_id text not null check (char_length(client_id) between 1 and 100),
    username text not null check (char_length(username) between 1 and 32),
    seen_at timestamptz not null default now(),
    primary key (room_id, client_id)
);

create index if not exists syncdev_room_clients_seen_at_idx
    on public.syncdev_room_clients (room_id, seen_at);

alter table public.syncdev_rooms enable row level security;
alter table public.syncdev_room_clients enable row level security;

revoke all on public.syncdev_rooms from anon, authenticated;
revoke all on public.syncdev_room_clients from anon, authenticated;
