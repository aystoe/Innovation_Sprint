-- Disposable database, migrations 001–006 applied. Run with ON_ERROR_STOP=1.
begin;
create function pg_temp.must(v boolean,label text) returns void language plpgsql as $$ begin
 if v is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
create function pg_temp.denied(q text,expected text) returns void language plpgsql as $$ begin
 begin execute q; exception when others then if sqlstate=expected then return; end if; raise; end;
 raise exception 'Unexpected success: %',q; end $$;
insert into auth.users(id,email) values
 ('50000000-0000-4000-8000-000000000001','events-a@tum.de'),
 ('50000000-0000-4000-8000-000000000002','events-b@tum.de'),
 ('50000000-0000-4000-8000-000000000003','events-c@tum.de');
insert into public.profiles(id,name,interests) values
 ('50000000-0000-4000-8000-000000000001','A','Art'),
 ('50000000-0000-4000-8000-000000000002','B','Robotics'),
 ('50000000-0000-4000-8000-000000000003','C','Art');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
insert into public.events(id,type,title,description,location,starts_at,ends_at,capacity) values
 ('60000000-0000-4000-8000-000000000001','official','Capacity test','Test','Munich',now()+interval '1 day',now()+interval '2 days',1);
insert into public.events(id,type,title,description,location,starts_at,ends_at,registration_mode,external_url) values
 ('60000000-0000-4000-8000-000000000002','official','External','Test','Munich',now()+interval '1 day',now()+interval '2 days','external','https://example.com/register');
select pg_temp.must((select count(*) from public.event_sync)=1,'only own sync row visible');
select pg_temp.denied($q$update public.event_sync set epoch=100$q$,'42501');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.set_event_registration('60000000-0000-4000-8000-000000000001',true);
select public.set_event_registration('60000000-0000-4000-8000-000000000001',true);
select pg_temp.must(public.list_events(p_id=>'60000000-0000-4000-8000-000000000001')->0->>'registered_count'='1','idempotent application count');
select pg_temp.must(public.list_events(p_id=>'60000000-0000-4000-8000-000000000001')->0->>'my_attended'='false','application is not attendance');
select pg_temp.denied($q$select public.set_event_registration('60000000-0000-4000-8000-000000000002',true)$q$,'42501');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.denied($q$select public.set_event_registration('60000000-0000-4000-8000-000000000001',true)$q$,'23514');
select pg_temp.must((select count(*) from public.event_participants)=0,'aggregate count does not expose another applicant');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.denied($q$update public.events set registration_mode='none' where id='60000000-0000-4000-8000-000000000001'$q$,'23514');
update public.events set capacity=2 where id='60000000-0000-4000-8000-000000000001';
select pg_temp.must((select revision=2 from public.events where id='60000000-0000-4000-8000-000000000001'),'server revision increment');
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.set_event_registration('60000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.denied($q$update public.events set capacity=1 where id='60000000-0000-4000-8000-000000000001'$q$,'23514');
update public.events set audience_mode='targeted',audience_traits='[{"kind":"interests","value":"Robotics"}]' where id='60000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.must(public.list_events(p_id=>'60000000-0000-4000-8000-000000000001')='[]'::jsonb,'revoked audience cannot read event');
select pg_temp.must(private.event_registration_summary('60000000-0000-4000-8000-000000000001')='{}'::jsonb,'hidden event counts not leaked');
select public.set_event_registration('60000000-0000-4000-8000-000000000001',false);
select pg_temp.must((select registration_status='cancelled' from public.event_participants where event_id='60000000-0000-4000-8000-000000000001'),'own cancellation after audience loss');
reset role;
select pg_temp.must(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_sync'),'invalidation publication configured');
set local role anon;
select pg_temp.denied($q$select public.list_events()$q$,'42501');
select pg_temp.denied($q$select * from public.event_sync$q$,'42501');
reset role;
rollback;
\echo 'Live event SQL tests passed; fixtures rolled back.'
