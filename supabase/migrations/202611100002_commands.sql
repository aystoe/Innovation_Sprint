begin;
-- All write RPCs derive the actor from the JWT and explicitly authorize it.
create function public.set_event_registration(p_event_id uuid, p_registered boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events; p public.event_participants; actor uuid := auth.uid();
begin
 if actor is null or p_registered is null then raise exception 'Authentication and registration choice required' using errcode='42501'; end if;
 select * into e from public.events where id=p_event_id for update;
 if not found then raise exception 'Event unavailable' using errcode='42501'; end if;
 select * into p from public.event_participants where event_id=p_event_id and user_id=actor for update;
 if p.attended then raise exception 'Recorded attendance cannot be cancelled or overwritten' using errcode='42501'; end if;
 if p_registered then
   if not private.can_read_event(p_event_id) or e.type not in ('official','hobby','alumni','party') or e.ends_at<=now() then
     raise exception 'Registration unavailable' using errcode='42501'; end if;
   insert into public.event_participants(event_id,user_id) values(p_event_id,actor)
   on conflict(event_id,user_id) do update set registration_status='registered',
     registered_at=case when event_participants.registration_status='cancelled' then now() else event_participants.registered_at end,
     cancelled_at=null;
 else
   -- A member may cancel their own application even after losing audience access.
   update public.event_participants set registration_status='cancelled',cancelled_at=coalesce(cancelled_at,now())
   where event_id=p_event_id and user_id=actor;
 end if;
end $$;
create function public.set_event_attendance(p_event_id uuid,p_user_id uuid,p_attended boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.events;
begin
 select * into e from public.events where id=p_event_id for update;
 if auth.uid() is null or e.author_id is distinct from auth.uid() or p_attended is null then
 raise exception 'Only the event author may mark attendance' using errcode='42501'; end if;
 if e.starts_at>now() then raise exception 'Event has not started' using errcode='42501'; end if;
 update public.event_participants set attended=p_attended,attendance_marked_at=now(),attendance_marked_by=auth.uid()
 where event_id=p_event_id and user_id=p_user_id and registration_status='registered';
 if not found then raise exception 'Active registration required' using errcode='42501'; end if;
end $$;
create function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); lo uuid; hi uuid; cid uuid;
begin
 if actor is null or p_other_user_id is null or actor=p_other_user_id
 or not exists(select 1 from public.profiles where id=actor)
 or not exists(select 1 from public.profiles where id=p_other_user_id) then
 raise exception 'Choose another registered member' using errcode='42501'; end if;
 lo:=least(actor,p_other_user_id); hi:=greatest(actor,p_other_user_id);
 -- Unique canonical pair arbitrates concurrent/reversed requests atomically.
 insert into public.conversations(user_low,user_high) values(lo,hi)
 on conflict(user_low,user_high) do update set user_low=excluded.user_low returning id into cid;
 insert into public.conversation_members(conversation_id,user_id) values(cid,lo),(cid,hi) on conflict do nothing;
 return cid;
end $$;
create function public.respond_to_organizer_request(p_request_id uuid,p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.organizer_requests;
begin
 select * into r from public.organizer_requests where id=p_request_id for update;
 if auth.uid() is null or r.recipient_id is distinct from auth.uid() or p_status is null or p_status not in ('opened','yes','no') then
 raise exception 'Only the recipient may respond' using errcode='42501'; end if;
 -- Opening an already answered request must not erase the answer.
 if p_status='opened' and r.status in ('yes','no') then return; end if;
 update public.organizer_requests set status=p_status,opened_at=coalesce(opened_at,now()),
 responded_at=case when p_status in ('yes','no') then now() else responded_at end where id=p_request_id;
end $$;
revoke all on function public.set_event_registration(uuid,boolean),public.set_event_attendance(uuid,uuid,boolean),
 public.get_or_create_direct_conversation(uuid),public.respond_to_organizer_request(uuid,text) from public,anon,authenticated;
grant execute on function public.set_event_registration(uuid,boolean),public.set_event_attendance(uuid,uuid,boolean),
 public.get_or_create_direct_conversation(uuid),public.respond_to_organizer_request(uuid,text) to authenticated;
commit;
