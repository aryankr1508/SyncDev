create or replace function public.prune_syncdev_room_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.syncdev_room_events
    where event_id in (
        select event_id
        from public.syncdev_room_events
        where room_id = new.room_id
        order by created_at desc, event_id desc
        offset 120
    );
    return new;
end;
$$;

drop trigger if exists syncdev_room_events_prune_trigger
    on public.syncdev_room_events;

create trigger syncdev_room_events_prune_trigger
after insert on public.syncdev_room_events
for each row execute function public.prune_syncdev_room_events();

revoke all on function public.prune_syncdev_room_events() from public;
