begin;
-- Existing 001/002 migrations already provide sender/recipient RLS and the response RPC.
-- Nullable for historical rows; unique per sender for safe retries after lost responses.
alter table public.organizer_requests add column if not exists client_request_id uuid;
create unique index if not exists organizer_request_client_key
 on public.organizer_requests(sender_id,client_request_id) where client_request_id is not null;
grant insert(client_request_id) on public.organizer_requests to authenticated;
drop policy if exists requests_insert on public.organizer_requests;
create policy requests_insert on public.organizer_requests for insert to authenticated with check (
 sender_id=auth.uid() and sender_id<>recipient_id and status='delivered'
 and exists(select 1 from public.profiles p where p.id=recipient_id
 and p.contact_preference in ('yellow','green') and contribution_type=any(p.open_to))
);
commit;
