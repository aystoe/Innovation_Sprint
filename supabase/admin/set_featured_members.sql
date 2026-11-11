-- Trusted project administrator only. Replaces the entire ordered team list atomically.
-- psql "$ADMIN_DB_URL" -X -v ON_ERROR_STOP=1 \
--   -v member_ids='["real-auth-uuid-1","real-auth-uuid-2"]' \
--   -f supabase/admin/set_featured_members.sql
-- [] intentionally clears all team placements; it does NOT delete profiles.
\set ON_ERROR_STOP on
begin;
lock table public.featured_members in exclusive mode;
create temporary table requested_featured_members (
 user_id uuid primary key references public.profiles(id), display_order integer not null unique
) on commit drop;
insert into requested_featured_members(user_id,display_order)
 select value::uuid,(ordinality-1)::integer
 from jsonb_array_elements_text(:'member_ids'::jsonb) with ordinality;
-- Invalid UUID, missing profile, or duplicate user fails before replacing the list.
delete from public.featured_members;
insert into public.featured_members select user_id,display_order from requested_featured_members;
commit;
