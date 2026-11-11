-- ONLY in a separate, disposable Supabase project. NEVER in production migrations.
create or replace function public.loadtest_environment() returns text
language sql immutable set search_path='' as $$ select 'isolated-loadtest-only'::text $$;
revoke all on function public.loadtest_environment() from public;
grant execute on function public.loadtest_environment() to anon,authenticated,service_role;
