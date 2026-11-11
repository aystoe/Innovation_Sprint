begin;
alter table public.events add column registration_mode text not null default 'internal' check(registration_mode in ('internal','external','both','none')),
 add column external_url text check(external_url is null or (length(external_url)<=2000 and external_url ~ '^https://[^[:space:]]+$')),
 add column capacity integer check(capacity is null or capacity>0),
 add column source_key text unique,
 add column host_label text not null default '' check(length(host_label)<=200),
 add column time_confirmed boolean not null default true,
 add column revision bigint not null default 1;
alter table public.events add constraint external_registration_url_required check(registration_mode not in ('external','both') or external_url is not null);
grant insert(registration_mode,external_url,capacity,host_label,time_confirmed),update(registration_mode,external_url,capacity,host_label,time_confirmed) on public.events to authenticated;
create function private.event_update_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare occupied bigint;
begin
 select count(*) into occupied from public.event_participants where event_id=new.id and registration_status='registered';
 if new.capacity is not null and occupied>new.capacity then raise exception 'Capacity is below active registrations' using errcode='23514'; end if;
 if occupied>0 and (new.registration_mode not in ('internal','both') or new.type not in ('official','hobby','alumni','party')) then
 raise exception 'Cancel existing registrations before disabling app registration' using errcode='23514'; end if;
 new.revision=old.revision+1; return new;
end $$;
create trigger events_update_guard before update on public.events for each row execute function private.event_update_guard();
create or replace function public.set_event_registration(p_event_id uuid,p_registered boolean)
returns void language plpgsql security definer set search_path='' as $$
declare e public.events; p public.event_participants; actor uuid:=auth.uid(); occupied bigint;
begin
 if actor is null or p_registered is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into e from public.events where id=p_event_id for update;
 if not found then raise exception 'Event unavailable' using errcode='42501'; end if;
 select * into p from public.event_participants where event_id=p_event_id and user_id=actor for update;
 if p_registered then
  if not private.can_read_event(e.id) or e.registration_mode not in ('internal','both')
   or e.type not in ('official','hobby','alumni','party') or e.ends_at<=now() then
   raise exception 'App registration unavailable' using errcode='42501'; end if;
  if p.registration_status='registered' then return; end if;
  select count(*) into occupied from public.event_participants where event_id=e.id and registration_status='registered';
  if e.capacity is not null and occupied>=e.capacity then raise exception 'This event is full' using errcode='23514'; end if;
  insert into public.event_participants(event_id,user_id) values(e.id,actor)
   on conflict(event_id,user_id) do update set registration_status='registered',registered_at=now(),cancelled_at=null;
 else
  if p.attended then raise exception 'Recorded attendance cannot be cancelled' using errcode='42501'; end if;
  update public.event_participants set registration_status='cancelled',cancelled_at=coalesce(cancelled_at,now()) where event_id=e.id and user_id=actor;
 end if;
end $$;
create function private.event_registration_summary(eid uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when private.can_read_event(eid) then jsonb_build_object(
 'registered_count',(select count(*) from public.event_participants where event_id=eid and registration_status='registered'),
 'my_registration',(select registration_status from public.event_participants where event_id=eid and user_id=auth.uid()),
 'my_attended',coalesce((select attended from public.event_participants where event_id=eid and user_id=auth.uid()),false)) else '{}'::jsonb end
$$;
create function public.list_events(p_offset integer default 0,p_limit integer default 100,p_id uuid default null)
returns jsonb language plpgsql stable set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_offset<0 or p_offset is null or p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid page' using errcode='22023'; end if;
 return (select coalesce(jsonb_agg(item order by starts_at,id),'[]'::jsonb) from (
 select e.id,e.starts_at,to_jsonb(e)||jsonb_build_object('author_name',p.name)||private.event_registration_summary(e.id) item
 from public.events e join public.profiles p on p.id=e.author_id where p_id is null or e.id=p_id
 order by e.starts_at,e.id offset p_offset limit p_limit) q);
end $$;
-- Realtime carries only a private invalidation counter, not event rows or deleted-row payloads.
create table public.event_sync (user_id uuid primary key references public.profiles(id) on delete cascade,epoch bigint not null default 1);
alter table public.event_sync enable row level security;
create policy event_sync_read on public.event_sync for select to authenticated using(user_id=auth.uid());
revoke all on public.event_sync from public,anon,authenticated;
grant select on public.event_sync to authenticated;
create function private.event_matches_profile(e public.events,p public.profiles) returns boolean
language sql immutable set search_path='' as $$
 select e.id is not null and (e.author_id=p.id or e.audience_mode='everyone' or exists(
 select 1 from jsonb_array_elements(e.audience_traits) t cross join lateral unnest(case t->>'kind'
 when 'interests' then regexp_split_to_array(p.interests,E'[,;\n]') when 'courses' then regexp_split_to_array(p.courses,E'[,;\n]')
 when 'profession' then array[p.occupation] when 'major' then array[p.major] else '{}'::text[] end) v
 where lower(btrim(v))=lower(btrim(t->>'value'))))
$$;
create function private.notify_event_change() returns trigger language plpgsql security definer set search_path='' as $$
declare before_event public.events; after_event public.events;
begin
 if tg_op<>'INSERT' then before_event=old; end if;
 if tg_op<>'DELETE' then after_event=new; end if;
 insert into public.event_sync(user_id) select p.id from public.profiles p
 where private.event_matches_profile(before_event,p) or private.event_matches_profile(after_event,p) order by p.id
 on conflict(user_id) do update set epoch=event_sync.epoch+1;
 return null;
end $$;
create trigger events_notify after insert or update or delete on public.events for each row execute function private.notify_event_change();
create function private.notify_participation_change() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.events;
begin
 select * into e from public.events where id=new.event_id;
 insert into public.event_sync(user_id) select p.id from public.profiles p
 where p.id=new.user_id or private.event_matches_profile(e,p) order by p.id
 on conflict(user_id) do update set epoch=event_sync.epoch+1;
 return null;
end $$;
create trigger participants_notify after insert or update on public.event_participants for each row execute function private.notify_participation_change();
create function private.notify_profile_event_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.event_sync(user_id) values(new.id) on conflict(user_id) do update set epoch=event_sync.epoch+1;
 return null;
end $$;
create trigger profiles_event_access after insert or update on public.profiles for each row execute function private.notify_profile_event_access();
insert into public.event_sync(user_id) select id from public.profiles on conflict do nothing;
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_sync') then
 alter publication supabase_realtime add table public.event_sync; end if;
end $$;
revoke all on function private.event_update_guard(),private.event_registration_summary(uuid),private.event_matches_profile(public.events,public.profiles),
 private.notify_event_change(),private.notify_participation_change(),private.notify_profile_event_access(),public.list_events(integer,integer,uuid)
 from public,anon,authenticated;
grant execute on function private.event_registration_summary(uuid),public.list_events(integer,integer,uuid) to authenticated;
update storage.buckets set file_size_limit=5242880,public=false,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='event-images';
commit;
