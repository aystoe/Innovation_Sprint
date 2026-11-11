-- TEST PROJECT ONLY. Replace all three UUID placeholders with existing registered
-- profiles. This modifies preferences temporarily and rolls everything back.
begin;
select set_config('test.sender','REPLACE_WITH_ACCOUNT_A_UUID',true);
select set_config('test.recipient','REPLACE_WITH_ACCOUNT_B_UUID',true);
select set_config('test.third','REPLACE_WITH_ACCOUNT_C_UUID',true);
select set_config('test.request',gen_random_uuid()::text,true);
select set_config('test.client',gen_random_uuid()::text,true);
do $$ begin
 if (select count(distinct id) from public.profiles where id in
 (current_setting('test.sender')::uuid,current_setting('test.recipient')::uuid,current_setting('test.third')::uuid))<>3
 then raise exception 'Provide three distinct existing profiles'; end if;
end $$;
update public.profiles set contact_preference='green',open_to=array['Mentor']
 where id=current_setting('test.recipient')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.sender'),true);
insert into public.organizer_requests(sender_id,recipient_id,contribution_type,title,body,client_request_id)
 values(auth.uid(),current_setting('test.recipient')::uuid,'Mentor','Test request','Test message',current_setting('test.client')::uuid);
select set_config('test.request',(select id::text from public.organizer_requests where sender_id=auth.uid() and client_request_id=current_setting('test.client')::uuid),true);
do $$ begin
 begin
  insert into public.organizer_requests(sender_id,recipient_id,contribution_type,title,body,client_request_id)
   values(auth.uid(),current_setting('test.recipient')::uuid,'Mentor','Duplicate','Test',current_setting('test.client')::uuid);
  raise exception 'FAIL duplicate accepted';
 exception when unique_violation then null; end;
 begin
  perform public.respond_to_organizer_request(current_setting('test.request')::uuid,'yes');
  raise exception 'FAIL sender answered';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.organizer_requests(sender_id,recipient_id,contribution_type,title,body)
   values(current_setting('test.third')::uuid,current_setting('test.recipient')::uuid,'Mentor','Spoof','Test');
  raise exception 'FAIL forged sender accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.organizer_requests(sender_id,recipient_id,contribution_type,title,body)
   values(auth.uid(),current_setting('test.recipient')::uuid,'Speaker','Wrong type','Test');
  raise exception 'FAIL unselected request type accepted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.third'),true);
do $$ begin
 if exists(select 1 from public.organizer_requests where id=current_setting('test.request')::uuid)
 then raise exception 'FAIL third party read request'; end if;
 begin
  perform public.respond_to_organizer_request(current_setting('test.request')::uuid,'no');
  raise exception 'FAIL third party answered';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.recipient'),true);
select public.respond_to_organizer_request(current_setting('test.request')::uuid,'yes');
do $$ begin
 if not exists(select 1 from public.organizer_requests where id=current_setting('test.request')::uuid and status='yes')
 then raise exception 'FAIL recipient answer not saved'; end if;
end $$;
reset role;
update public.profiles set contact_preference='gray' where id=current_setting('test.recipient')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.sender'),true);
do $$ begin
 begin
  insert into public.organizer_requests(sender_id,recipient_id,contribution_type,title,body)
   values(auth.uid(),current_setting('test.recipient')::uuid,'Mentor','Grey recipient','Test');
  raise exception 'FAIL grey member accepted request';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: sender identity, recipient response, third-party RLS, duplicate, consent checks' as result;
