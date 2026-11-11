begin;
alter table public.conversations add column message_sequence bigint not null default 0;
alter table public.messages add column sequence bigint, add column client_message_id uuid;
with numbered as (select id,row_number() over(partition by conversation_id order by created_at,id) n from public.messages)
update public.messages m set sequence=n.n,client_message_id=m.id from numbered n where n.id=m.id;
update public.conversations c set message_sequence=coalesce((select max(sequence) from public.messages m where m.conversation_id=c.id),0);
alter table public.messages alter column sequence set not null,alter column client_message_id set not null,
 add constraint message_sequence_positive check(sequence>0),
 add constraint message_room_sequence unique(conversation_id,sequence),
 add constraint message_retry_unique unique(sender_id,client_message_id);
-- All sends allocate their order under the same room lock. No direct write bypass.
revoke insert on public.messages from authenticated;
revoke insert(conversation_id,sender_id,body) on public.messages from authenticated;
create function public.send_direct_message(p_conversation_id uuid,p_client_message_id uuid,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); m public.messages; seq bigint; content text:=btrim(p_body);
begin
 if actor is null or not private.in_conversation(p_conversation_id) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if p_client_message_id is null or content is null or length(content) not between 1 and 2000 then raise exception 'Invalid message' using errcode='22023'; end if;
 perform 1 from public.conversations where id=p_conversation_id for update;
 select * into m from public.messages where sender_id=actor and client_message_id=p_client_message_id;
 if found then
  if m.conversation_id<>p_conversation_id or m.body<>content then raise exception 'Retry ID already used for another message' using errcode='22023'; end if;
 else
  update public.conversations set message_sequence=message_sequence+1 where id=p_conversation_id returning message_sequence into seq;
  insert into public.messages(conversation_id,sender_id,body,sequence,client_message_id,created_at)
   values(p_conversation_id,actor,content,seq,p_client_message_id,clock_timestamp()) returning * into m;
 end if;
 return to_jsonb(m)||jsonb_build_object('sequence',m.sequence::text);
end $$;
create function public.list_direct_messages(p_conversation_id uuid,p_before bigint default null,p_after bigint default null,p_limit integer default 40)
returns jsonb language plpgsql stable set search_path='' as $$
begin
 if auth.uid() is null or not private.in_conversation(p_conversation_id) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 100 or (p_before is not null and p_after is not null) then raise exception 'Invalid page' using errcode='22023'; end if;
 return (select coalesce(jsonb_agg(item order by sequence),'[]'::jsonb) from (
  select m.sequence,to_jsonb(m)||jsonb_build_object('sequence',m.sequence::text) item from public.messages m
  where conversation_id=p_conversation_id and (p_before is null or sequence<p_before) and (p_after is null or sequence>p_after)
  order by case when p_after is not null then sequence end asc,sequence desc limit p_limit
 ) q);
end $$;
create function public.list_direct_conversations(p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid page' using errcode='22023'; end if;
 return (select coalesce(jsonb_agg(item order by last_at desc,id),'[]'::jsonb) from (
 select c.id,coalesce(m.created_at,c.created_at) last_at,jsonb_build_object('id',c.id,'person',to_jsonb(p),
 'last_body',m.body,'last_sender',m.sender_id,'last_at',coalesce(m.created_at,c.created_at)) item
 from public.conversations c join public.profiles p on p.id=case when c.user_low=auth.uid() then c.user_high else c.user_low end
 left join lateral (select body,sender_id,created_at from public.messages where conversation_id=c.id order by sequence desc limit 1) m on true
 order by last_at desc,c.id offset p_offset limit p_limit) q);
end $$;
revoke all on function public.send_direct_message(uuid,uuid,text),public.list_direct_messages(uuid,bigint,bigint,integer),public.list_direct_conversations(integer,integer) from public,anon,authenticated;
grant execute on function public.send_direct_message(uuid,uuid,text),public.list_direct_messages(uuid,bigint,bigint,integer),public.list_direct_conversations(integer,integer) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversation_members') then alter publication supabase_realtime add table public.conversation_members; end if;
end $$;
commit;
