-- Staging only. Capture before and after migration 008 with the same fixture data.
-- Run authenticated with a real fixture UUID in a transaction; no privilege bypass plans.
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'user_id','role','authenticated')::text,true);
set local role authenticated;
explain(analyze,buffers,format json)
 select count(*) from public.event_participants where event_id=:'event_id'::uuid and registration_status='registered';
explain(analyze,buffers,format json)
 select id,starts_at from public.events order by starts_at,id limit 100;
explain(analyze,buffers,format json)
 select public.search_members(p_query=>'Member 12',p_page_size=>20);
rollback;
-- Note: EXPLAIN of an RPC exposes the function boundary, not its internal nested plans.
-- Use pg_stat_statements + query reports / auto_explain on staging for internal query detail.
