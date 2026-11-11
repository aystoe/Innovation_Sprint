begin;
-- Active occupancy is counted for every registration and every visible event summary.
-- Existing participants_user_idx begins with user_id and does not serve event counts.
create index participants_active_event_idx on public.event_participants(event_id)
 where registration_status='registered';
-- list_events uses starts_at,id globally, not type as the leading sort key.
create index events_chronological_idx on public.events(starts_at,id);
commit;
