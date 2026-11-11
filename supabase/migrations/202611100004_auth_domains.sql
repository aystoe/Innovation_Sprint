begin;
-- Same exact ASCII address policy as src/auth/domain.ts. No subdomain/suffix loopholes.
create function private.allowed_tum_email(value text) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce(lower(value) ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@(tum\.de|mytum\.de)$',false)
$$;
-- Hook functions are invoker, not postgres security-definer.
create function public.before_user_created_tum(event jsonb) returns jsonb
language plpgsql set search_path = '' as $$
begin
 if not private.allowed_tum_email(event->'user'->>'email') then
   return jsonb_build_object('error',jsonb_build_object('http_code',403,
     'message','Only @tum.de and @mytum.de email addresses are allowed.'));
 end if;
 return '{}'::jsonb;
end $$;
-- Before User Created does NOT run on updateUser({ email }). Guard both the
-- current address and pending email_change before any confirmation email is sent.
create function private.guard_tum_email() returns trigger
language plpgsql set search_path = '' as $$
begin
 if not private.allowed_tum_email(new.email) then
   raise exception 'Only @tum.de and @mytum.de email addresses are allowed.' using errcode='23514';
 end if;
 if coalesce(new.email_change,'') <> '' and not private.allowed_tum_email(new.email_change) then
   raise exception 'Email changes must stay within tum.de or mytum.de.' using errcode='23514';
 end if;
 return new;
end $$;
-- Fail rather than silently leave pre-existing non-domain accounts able to sign in.
do $$ begin
 if exists(select 1 from auth.users where not private.allowed_tum_email(email)
 or (coalesce(email_change,'')<>'' and not private.allowed_tum_email(email_change))) then
 raise exception 'Existing Auth users have disallowed current/pending emails. Review and remediate them before migration 004.';
 end if;
end $$;
create trigger common_ground_tum_email_guard
 before insert or update of email,email_change on auth.users
 for each row execute function private.guard_tum_email();
revoke all on function private.allowed_tum_email(text),private.guard_tum_email(),public.before_user_created_tum(jsonb)
 from public,anon,authenticated,service_role;
grant usage on schema private,public to supabase_auth_admin;
grant execute on function private.allowed_tum_email(text),private.guard_tum_email(),public.before_user_created_tum(jsonb) to supabase_auth_admin;
comment on function public.before_user_created_tum(jsonb) is
 'Configure Authentication > Hooks > Before User Created. Domain allowlist only; email confirmation remains OFF.';
commit;
