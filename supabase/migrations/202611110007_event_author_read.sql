begin;

alter policy events_read
on public.events
using (
  author_id = (select auth.uid())
  or private.can_read_event(id)
);

commit;