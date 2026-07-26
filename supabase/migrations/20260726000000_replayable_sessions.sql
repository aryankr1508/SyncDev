alter table public.syncdev_rooms
    add column if not exists host_key_hash text not null default '';
alter table public.syncdev_rooms
    add column if not exists mode text not null default 'interview';
alter table public.syncdev_rooms
    add column if not exists edit_policy text not null default 'everyone';
alter table public.syncdev_rooms
    add column if not exists language text not null default 'javascript';
alter table public.syncdev_rooms
    add column if not exists created_at timestamptz not null default now();
alter table public.syncdev_rooms
    add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

alter table public.syncdev_room_clients
    add column if not exists role text not null default 'participant';
alter table public.syncdev_room_clients
    add column if not exists token_hash text not null default '';

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'syncdev_rooms_mode_check'
    ) then
        alter table public.syncdev_rooms
            add constraint syncdev_rooms_mode_check
            check (mode in ('interview', 'training', 'debugging'));
    end if;
    if not exists (
        select 1 from pg_constraint
        where conname = 'syncdev_rooms_edit_policy_check'
    ) then
        alter table public.syncdev_rooms
            add constraint syncdev_rooms_edit_policy_check
            check (edit_policy in ('everyone', 'host-only'));
    end if;
    if not exists (
        select 1 from pg_constraint
        where conname = 'syncdev_room_clients_role_check'
    ) then
        alter table public.syncdev_room_clients
            add constraint syncdev_room_clients_role_check
            check (role in ('host', 'participant', 'observer'));
    end if;
end $$;

create table if not exists public.syncdev_room_events (
    event_id text primary key check (char_length(event_id) between 1 and 160),
    room_id text not null references public.syncdev_rooms(room_id) on delete cascade,
    event_type text not null
        check (event_type in (
            'code',
            'checkpoint',
            'restore',
            'run',
            'test-run',
            'settings',
            'role'
        )),
    revision text not null default '' check (char_length(revision) <= 160),
    actor_id text not null default '' check (char_length(actor_id) <= 100),
    actor_name text not null default '' check (char_length(actor_name) <= 32),
    code text not null default '' check (char_length(code) <= 500000),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.syncdev_room_tests (
    room_id text not null references public.syncdev_rooms(room_id) on delete cascade,
    test_id text not null check (char_length(test_id) between 1 and 160),
    label text not null check (char_length(label) between 1 and 80),
    stdin text not null default '' check (char_length(stdin) <= 20000),
    expected_output text not null default '' check (char_length(expected_output) <= 50000),
    is_hidden boolean not null default false,
    created_by text not null default '' check (char_length(created_by) <= 100),
    created_at timestamptz not null default now(),
    primary key (room_id, test_id)
);

create index if not exists syncdev_room_events_created_at_idx
    on public.syncdev_room_events (room_id, created_at desc);
create index if not exists syncdev_rooms_expires_at_idx
    on public.syncdev_rooms (expires_at);

alter table public.syncdev_room_events enable row level security;
alter table public.syncdev_room_tests enable row level security;

revoke all on public.syncdev_room_events from anon, authenticated;
revoke all on public.syncdev_room_tests from anon, authenticated;
