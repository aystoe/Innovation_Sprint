-- Disposable Supabase database, migrations 001–007. psql -X -v ON_ERROR_STOP=1 -f this-file
begin;
create function pg_temp.must(v boolean,label text) returns void language plpgsql as $$ begin
 if v is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
create function pg_temp.denied(q text,expected text) returns void language plpgsql as $$ begin
 begin execute q; exception when others then if sqlstate=expected then return; end if; raise; end;
 raise exception 'Unexpected success: %',q; end $$;
insert into auth.users(id,email) values
 ('70000000-0000-4000-8000-000000000001','chat-a@tum.de'),
 ('70000000-0000-4000-8000-000000000002','chat-b@tum.de'),
 ('70000000-0000-4000-8000-000000000003','chat-c@tum.de');
insert into public.profiles(id,name) values
 ('70000000-0000-4000-8000-000000000001','A'),('70000000-0000-4000-8000-000000000002','B'),('70000000-0000-4000-8000-000000000003','C');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select set_config('test.chat_id',public.get_or_create_direct_conversation('70000000-0000-4000-8000-000000000002')::text,true);
select pg_temp.must(public.get_or_create_direct_conversation('70000000-0000-4000-8000-000000000002')::text=current_setting('test.chat_id'),'profile and search return same room');
select pg_temp.denied($q$select public.get_or_create_direct_conversation('70000000-0000-4000-8000-000000000001')$q$,'42501');
select public.send_direct_message(current_setting('test.chat_id')::uuid,'71000000-0000-4000-8000-000000000001','Hello');
select public.send_direct_message(current_setting('test.chat_id')::uuid,'71000000-0000-4000-8000-000000000001','Hello');
select pg_temp.must((select count(*) from public.messages)=1,'retry sends exactly one message');
select pg_temp.must((select sender_id=auth.uid() from public.messages),'server sender is JWT subject');
select pg_temp.denied($q$select public.send_direct_message(current_setting('test.chat_id')::uuid,'71000000-0000-4000-8000-000000000001','Changed')$q$,'22023');
select pg_temp.denied($q$insert into public.messages(conversation_id,sender_id,body) values(current_setting('test.chat_id')::uuid,'70000000-0000-4000-8000-000000000002','Spoof')$q$,'42501');
select pg_temp.denied($q$update public.messages set sender_id='70000000-0000-4000-8000-000000000002'$q$,'42501');
select pg_temp.denied($q$delete from public.messages$q$,'42501');
select pg_temp.denied($q$insert into public.conversation_members values(current_setting('test.chat_id')::uuid,'70000000-0000-4000-8000-000000000003')$q$,'42501');
select public.send_direct_message(current_setting('test.chat_id')::uuid,gen_random_uuid(),'message '||n) from generate_series(2,85) n;
select pg_temp.must(jsonb_array_length(public.list_direct_messages(current_setting('test.chat_id')::uuid))=40,'latest page limited');
select pg_temp.must(public.list_direct_messages(current_setting('test.chat_id')::uuid)->0->>'sequence'='46','latest starts at sequence 46');
select pg_temp.must(public.list_direct_messages(current_setting('test.chat_id')::uuid,p_before=>46)->0->>'sequence'='6','earlier page is exclusive and ascending');
select pg_temp.must(public.list_direct_messages(current_setting('test.chat_id')::uuid,p_after=>40)->0->>'sequence'='41','recovery starts after cursor');
select pg_temp.must(jsonb_array_length(public.list_direct_messages(current_setting('test.chat_id')::uuid,p_after=>80))=5,'recovery final page');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.must(public.get_or_create_direct_conversation('70000000-0000-4000-8000-000000000001')::text=current_setting('test.chat_id'),'reverse pair same room');
select pg_temp.must((select count(*) from public.conversation_members)=2,'exactly two members');
select pg_temp.must((select count(*) from public.messages)=85,'recipient reads messages');
select pg_temp.must(jsonb_array_length(public.list_direct_conversations())=1,'recipient inbox');
select public.send_direct_message(current_setting('test.chat_id')::uuid,'71000000-0000-4000-8000-000000000001','Reply');
select pg_temp.must((select count(*) from public.messages)=86,'different sender may use same retry ID');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.must((select count(*) from public.conversations)=0,'third party cannot read rooms');
select pg_temp.must((select count(*) from public.conversation_members)=0,'third party cannot read membership');
select pg_temp.must((select count(*) from public.messages)=0,'third party cannot read messages');
select pg_temp.must(public.list_direct_conversations()='[]'::jsonb,'third party has empty inbox');
select pg_temp.denied($q$select public.list_direct_messages(current_setting('test.chat_id')::uuid)$q$,'42501');
select pg_temp.denied($q$select public.send_direct_message(current_setting('test.chat_id')::uuid,gen_random_uuid(),'Intrude')$q$,'42501');
reset role;
select pg_temp.must((select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('messages','conversation_members'))=2,'realtime publication');
set local role anon;
select pg_temp.denied($q$select * from public.messages$q$,'42501');
select pg_temp.denied($q$select public.list_direct_conversations()$q$,'42501');
select pg_temp.denied($q$select public.send_direct_message(current_setting('test.chat_id')::uuid,gen_random_uuid(),'Anon')$q$,'42501');
rollback;
