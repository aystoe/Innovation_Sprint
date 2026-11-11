-- Read-only check in the CLOUD project's SQL Editor. null means the expected function is absent.
select to_regprocedure('public.before_user_created_tum(jsonb)') as signup_hook;
select n.nspname as schema_name,p.proname as function_name,
 pg_get_function_identity_arguments(p.oid) as arguments,
 pg_get_function_result(p.oid) as returns
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname='before_user_created_tum';
