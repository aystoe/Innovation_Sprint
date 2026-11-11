-- After migrations 001–004. Run as postgres on an isolated local database.
-- psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/auth_domains.sql
begin;
create function pg_temp.must(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end $$;
create function pg_temp.denied(q text,expected text) returns void language plpgsql as $$
begin
 begin execute q; exception when others then if sqlstate=expected then return; end if; raise; end;
 raise exception 'Unexpectedly accepted: %',q;
end $$;
select pg_temp.must(private.allowed_tum_email('a@tum.de'),'tum.de accepted');
select pg_temp.must(private.allowed_tum_email('A@MYTUM.DE'),'case insensitive domain');
select pg_temp.must(not private.allowed_tum_email('a@cs.tum.de'),'subdomain denied');
select pg_temp.must(not private.allowed_tum_email('a@tum.de.evil.com'),'suffix denied');
select pg_temp.must(not private.allowed_tum_email('a@evil-tum.de'),'prefix denied');
select pg_temp.must(not private.allowed_tum_email('a@tum.de@evil.com'),'multiple at signs denied');
select pg_temp.must(not private.allowed_tum_email(null),'missing email denied');
select pg_temp.must(not private.allowed_tum_email('a@gmail.com'),'non-TUM email denied');
select pg_temp.must(not has_function_privilege('anon','public.before_user_created_tum(jsonb)','execute'),'anon cannot execute hook');
select pg_temp.must(not has_function_privilege('authenticated','public.before_user_created_tum(jsonb)','execute'),'client cannot execute hook');
set local role supabase_auth_admin;
select pg_temp.must(public.before_user_created_tum('{"user":{"email":"a@tum.de"}}')='{}'::jsonb,'Auth role accepts TUM signup');
select pg_temp.must(public.before_user_created_tum('{"user":{"email":"a@gmail.com"}}')->'error'->>'http_code'='403','Auth role rejects other domain');
select pg_temp.must(public.before_user_created_tum('{}')->'error'->>'http_code'='403','hook fails closed without email');
reset role;
insert into auth.users(id,email) values('30000000-0000-4000-8000-000000000001','auth-test@tum.de');
select pg_temp.denied($q$insert into auth.users(id,email) values('30000000-0000-4000-8000-000000000002','a@gmail.com')$q$,'23514');
select pg_temp.denied($q$update auth.users set email='a@gmail.com' where id='30000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.denied($q$update auth.users set email_change='a@gmail.com' where id='30000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.denied($q$update auth.users set email_change='a@tum.de.evil.com' where id='30000000-0000-4000-8000-000000000001'$q$,'23514');
update auth.users set email_change='changed@mytum.de' where id='30000000-0000-4000-8000-000000000001';
update auth.users set email='changed@mytum.de',email_change='' where id='30000000-0000-4000-8000-000000000001';
select pg_temp.must((select email='changed@mytum.de' from auth.users where id='30000000-0000-4000-8000-000000000001'),'allowed-domain change succeeds');
rollback;
\echo 'Auth domain SQL checks passed; all fixtures rolled back.'
