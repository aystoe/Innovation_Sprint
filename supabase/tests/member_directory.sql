-- Isolated Supabase only; run after migrations 001–005. All fixtures roll back.
begin;
create function pg_temp.must(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
create function pg_temp.denied(q text,expected text) returns void language plpgsql as $$
begin begin execute q; exception when others then if sqlstate=expected then return; end if; raise; end;
 raise exception 'Unexpectedly accepted: %',q; end $$;
insert into auth.users(id,email) values
 ('40000000-0000-4000-8000-000000000001','directory-a@tum.de'),
 ('40000000-0000-4000-8000-000000000002','directory-b@tum.de'),
 ('40000000-0000-4000-8000-000000000003','directory-c@mytum.de'),
 ('40000000-0000-4000-8000-000000000004','directory-d@mytum.de');
insert into public.profiles(id,name,occupation,major,courses,interests,topics,contact_preference) values
 ('40000000-0000-4000-8000-000000000001','José Kim','Student','Engineering','Sprint; ML','Robotics',array['AI'],'green'),
 ('40000000-0000-4000-8000-000000000002','Anna Lee','Student','Engineering','Sprint','Hiking','{}','yellow'),
 ('40000000-0000-4000-8000-000000000003','Zoe Kim','Founder','Design','ML','Robotics','{}','gray'),
 ('40000000-0000-4000-8000-000000000004','José Kim','Student','Engineering','Sprint','Robotics','{}','green');
insert into public.featured_members(user_id,display_order) values
 ('40000000-0000-4000-8000-000000000003',0),('40000000-0000-4000-8000-000000000002',1);
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.must((public.search_members()->>'total')::int=4,'only actual profiles returned');
select pg_temp.must(public.search_members()->'items'->0->>'id'='40000000-0000-4000-8000-000000000003','team order precedes alphabetic order');
select pg_temp.must(public.search_members(p_page_size=>1,p_page=>1)->'items'->0->>'id'='40000000-0000-4000-8000-000000000002','team sorting before pagination');
select pg_temp.must((public.search_members(p_query=>'JOSE  kim')->>'total')::int=2,'name words case and accent normalization');
select pg_temp.must(public.search_members(p_query=>'jose',p_page_size=>1)->'items'->0->>'id'='40000000-0000-4000-8000-000000000001','duplicate names ordered by UUID');
select pg_temp.must(public.search_members(p_query=>'jose',p_page_size=>1,p_page=>1)->'items'->0->>'id'='40000000-0000-4000-8000-000000000004','second duplicate name on next page');
select pg_temp.must((public.search_members(p_occupation=>' student ',p_major=>'engineering',p_course=>'ml',p_interests=>array['AI','No match'])->>'total')::int=1,'AND attributes and OR interests including topics');
select pg_temp.must((public.search_members(p_course=>'M')->>'total')::int=0,'courses match whole tokens');
select pg_temp.must((public.search_members(p_query=>'%')->>'total')::int=0,'wildcard input is literal');
select pg_temp.must((public.search_members(p_contact=>'gray')->>'total')::int=1,'contact preference filter');
select pg_temp.must((public.search_members(p_query=>'jose')->'items'->0->>'team_order') is null,'nonmatching team not pinned');
select pg_temp.must(public.search_members(p_page=>99)->'items'='[]'::jsonb and (public.search_members(p_page=>99)->>'total')::int=4,'empty page retains total');
select pg_temp.must(not exists(select 1 from jsonb_array_elements(public.search_members()->'items') item where item ? 'email' or item ? 'email_change' or item ? 'encrypted_password'),'no auth secrets in directory payload');
select pg_temp.must(public.member_filter_options()->'interests' @> '["AI","Hiking","Robotics"]','filter options include all profiles rather than current page');
select pg_temp.denied($q$select public.search_members(p_page=>-1)$q$,'22023');
select pg_temp.denied($q$select public.search_members(p_page_size=>10000)$q$,'22023');
select pg_temp.denied($q$insert into public.featured_members values('40000000-0000-4000-8000-000000000001',5)$q$,'42501');
select pg_temp.denied($q$update public.featured_members set display_order=20$q$,'42501');
select pg_temp.denied($q$delete from public.featured_members$q$,'42501');
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"organizer"}}',true);
select pg_temp.denied($q$update public.featured_members set display_order=20$q$,'42501');
reset role;
select pg_temp.denied($q$insert into public.featured_members values('49999999-0000-4000-8000-000000000001',3)$q$,'23503');
select pg_temp.denied($q$insert into public.featured_members values('40000000-0000-4000-8000-000000000001',0)$q$,'23505');
select pg_temp.must((select relrowsecurity from pg_class where oid='public.featured_members'::regclass),'team table RLS enabled');
set local role anon;
select pg_temp.denied($q$select public.search_members()$q$,'42501');
select pg_temp.denied($q$select public.member_filter_options()$q$,'42501');
select pg_temp.denied($q$select * from public.featured_members$q$,'42501');
reset role;
rollback;
\echo 'Directory SQL tests passed; fixtures rolled back.'
