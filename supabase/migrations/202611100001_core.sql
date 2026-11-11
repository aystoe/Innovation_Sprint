-- Fresh Supabase project. Run as postgres via Supabase migrations.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.valid_traits(v jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(v) <> 'array' then false else
 jsonb_array_length(v) <= 100 and not exists (
 select 1 from jsonb_array_elements(v) t where jsonb_typeof(t) <> 'object'
 or not (t ? 'kind' and t ? 'value')
 or jsonb_typeof(t->'kind') <> 'string' or jsonb_typeof(t->'value') <> 'string'
 or t->>'kind' not in ('interests','courses','profession','major')
 or length(btrim(t->>'value')) not between 1 and 600) end
$$;
create function private.valid_paths(paths text[], prefix text) returns boolean
language sql immutable set search_path = '' as $$
 select not exists (select 1 from unnest(paths) p where p is null
 or left(p,length(prefix)) <> prefix or p ~ '(^|/)\.\.?(/|$)'
 or length(p) > 500)
$$;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 80),
 occupation text not null default '' check (length(occupation)<=120),
 bio text not null default '' check (length(bio)<=1200),
 major text not null default '' check (length(major)<=120),
 interests text not null default '' check (length(interests)<=600),
 courses text not null default '' check (length(courses)<=500),
 photo_path text,
 social text not null default '' check (length(social)<=500),
 social_other text not null default '' check (length(social_other)<=500),
 topics text[] not null default '{}' check (cardinality(topics)<=30),
 open_to text[] not null default '{}' check (open_to <@ array['Speaker','Jury','Mentor','Feedback']::text[]),
 contact_preference text not null default 'gray' check (contact_preference in ('gray','yellow','green')),
 created_at timestamptz not null default now(),
 check (photo_path is null or private.valid_paths(array[photo_path],id::text||'/'))
);
-- No login email, role, or client-editable attendance aggregate in profiles.
create table public.events (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null default auth.uid() references public.profiles(id),
 created_mode text not null default 'member' check (created_mode in ('member','organizer')),
 type text not null check (type in ('job','cofounder','official','hobby','alumni','party','announcement')),
 title text not null check (length(btrim(title)) between 1 and 100),
 description text not null check (length(btrim(description)) between 1 and 3000),
 location text not null check (length(btrim(location)) between 1 and 140),
 starts_at timestamptz not null, ends_at timestamptz not null,
 audience_mode text not null default 'everyone' check (audience_mode in ('everyone','targeted')),
 audience_traits jsonb not null default '[]' check (private.valid_traits(audience_traits)),
 topics text[] not null default '{}' check (cardinality(topics)<=30),
 channel_digest boolean not null default false,
 channel_slack boolean not null default false,
 channel_calendar boolean not null default false,
 image_path text, color text not null default 'blue', art text not null default '',
 created_at timestamptz not null default now(),
 check (ends_at > starts_at),
 check (audience_mode <> 'targeted' or jsonb_array_length(audience_traits)>0),
 check (image_path is null or private.valid_paths(array[image_path],author_id::text||'/'||id::text||'/'))
);
create table public.event_participants (
 event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 registration_status text not null default 'registered' check (registration_status in ('registered','cancelled')),
 registered_at timestamptz not null default now(), cancelled_at timestamptz,
 attended boolean not null default false,
 attendance_marked_at timestamptz,
 attendance_marked_by uuid references public.profiles(id),
 primary key (event_id,user_id),
 check (not attended or registration_status = 'registered'),
 check ((attendance_marked_at is null) = (attendance_marked_by is null)),
 check (not attended or attendance_marked_by is not null),
 check ((registration_status='cancelled') = (cancelled_at is not null))
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(),
 user_low uuid not null references public.profiles(id),
 user_high uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check (user_low < user_high), unique(user_low,user_high)
);
create table public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 primary key(conversation_id,user_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null default auth.uid(),
 body text not null check (length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 foreign key(conversation_id,sender_id) references public.conversation_members(conversation_id,user_id)
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles(id),
 body text not null default '' check (length(body)<=2000),
 photo_paths text[] not null default '{}' check (cardinality(photo_paths)<=4),
 created_at timestamptz not null default now(),
 check (length(btrim(body))>0 or cardinality(photo_paths)>0),
 check (private.valid_paths(photo_paths,author_id::text||'/'||event_id::text||'/'))
);
-- Current UI sends one request to one recipient; batch sends create independent rows.
create table public.organizer_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null default auth.uid() references public.profiles(id),
 recipient_id uuid not null references public.profiles(id),
 contribution_type text not null check (contribution_type in ('Speaker','Jury','Mentor','Feedback')),
 title text not null check (length(btrim(title)) between 1 and 150),
 body text not null check (length(btrim(body)) between 1 and 2000),
 status text not null default 'delivered' check (status in ('delivered','opened','yes','no')),
 created_at timestamptz not null default now(), opened_at timestamptz, responded_at timestamptz
);

-- Security-definer helpers avoid recursive RLS; never accept a caller-provided viewer UUID.
create function private.can_read_event(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
 select 1 from public.events e where e.id=eid and (
 e.author_id=auth.uid() or e.audience_mode='everyone' or exists (
 select 1 from public.profiles p cross join lateral jsonb_array_elements(e.audience_traits) t
 where p.id=auth.uid() and exists (
 select 1 from unnest(case t->>'kind'
 when 'interests' then regexp_split_to_array(p.interests, E'[,;\n]')
 when 'courses' then regexp_split_to_array(p.courses, E'[,;\n]')
 when 'profession' then array[p.occupation] when 'major' then array[p.major]
 else '{}'::text[] end) v where lower(btrim(v))=lower(btrim(t->>'value'))))))
$$;
create function private.owns_event(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.events where id=eid and author_id=auth.uid())
$$;
create function private.in_conversation(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid())
$$;
create function private.can_review(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select private.can_read_event(eid) and exists(select 1 from public.events where id=eid and ends_at<=now())
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.organizer_requests enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy events_read on public.events for select to authenticated using (private.can_read_event(id));
create policy events_insert on public.events for insert to authenticated with check (author_id=auth.uid());
create policy events_update on public.events for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy events_delete on public.events for delete to authenticated using (author_id=auth.uid());
create policy participants_read on public.event_participants for select to authenticated using (user_id=auth.uid() or private.owns_event(event_id));
create policy conversations_read on public.conversations for select to authenticated using (private.in_conversation(id));
create policy members_read on public.conversation_members for select to authenticated using (private.in_conversation(conversation_id));
create policy messages_read on public.messages for select to authenticated using (private.in_conversation(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id=auth.uid() and private.in_conversation(conversation_id));
create policy reviews_read on public.reviews for select to authenticated using (private.can_read_event(event_id));
create policy reviews_insert on public.reviews for insert to authenticated with check (author_id=auth.uid() and private.can_review(event_id));
create policy reviews_update on public.reviews for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid() and private.can_review(event_id));
create policy reviews_delete on public.reviews for delete to authenticated using (author_id=auth.uid());
create policy requests_read on public.organizer_requests for select to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());
create policy requests_insert on public.organizer_requests for insert to authenticated with check (
 sender_id=auth.uid() and status='delivered' and exists(select 1 from public.profiles p
 where p.id=recipient_id and p.contact_preference in ('yellow','green') and contribution_type=any(p.open_to)));

-- Explicit grants: prevent owner/recipient/event/timestamp rewrites and attendance forgery.
revoke all on public.profiles,public.events,public.event_participants,public.conversations,
 public.conversation_members,public.messages,public.reviews,public.organizer_requests from public,anon,authenticated;
grant select on public.profiles,public.events,public.event_participants,public.conversations,
 public.conversation_members,public.messages,public.reviews,public.organizer_requests to authenticated;
grant insert(id,name,occupation,bio,major,interests,courses,photo_path,social,social_other,topics,open_to,contact_preference),
 update(name,occupation,bio,major,interests,courses,photo_path,social,social_other,topics,open_to,contact_preference) on public.profiles to authenticated;
grant insert(id,author_id,created_mode,type,title,description,location,starts_at,ends_at,audience_mode,audience_traits,topics,channel_digest,channel_slack,channel_calendar,image_path,color,art),
 update(type,title,description,location,starts_at,ends_at,audience_mode,audience_traits,topics,channel_digest,channel_slack,channel_calendar,image_path,color,art),delete on public.events to authenticated;
grant insert(conversation_id,sender_id,body) on public.messages to authenticated;
grant insert(event_id,author_id,body,photo_paths),update(body,photo_paths),delete on public.reviews to authenticated;
grant insert(recipient_id,sender_id,contribution_type,title,body) on public.organizer_requests to authenticated;

create index profiles_name_idx on public.profiles(lower(name) text_pattern_ops);
create index profiles_open_to_idx on public.profiles using gin(open_to);
create index profiles_contact_idx on public.profiles(contact_preference);
create index events_author_idx on public.events(author_id,created_at desc);
create index events_feed_idx on public.events(type,starts_at desc);
create index events_end_idx on public.events(ends_at);
create index participants_user_idx on public.event_participants(user_id,registration_status,event_id);
create index participants_attendance_actor_idx on public.event_participants(attendance_marked_by);
create index conversations_high_idx on public.conversations(user_high);
create index members_user_idx on public.conversation_members(user_id,conversation_id);
create index messages_order_idx on public.messages(conversation_id,created_at,id);
create index messages_sender_idx on public.messages(conversation_id,sender_id);
create index reviews_event_idx on public.reviews(event_id,created_at);
create index reviews_author_idx on public.reviews(author_id);
create index requests_sender_idx on public.organizer_requests(sender_id,created_at desc);
create index requests_recipient_idx on public.organizer_requests(recipient_id,status,created_at desc);

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.valid_traits(jsonb),private.valid_paths(text[],text),
 private.can_read_event(uuid),private.owns_event(uuid),private.in_conversation(uuid),private.can_review(uuid) to authenticated;
commit;
