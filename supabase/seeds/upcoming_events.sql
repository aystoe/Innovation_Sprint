-- psql "$ADMIN_DB_URL" -X -v ON_ERROR_STOP=1 -v creator_id="ACTUAL_PROFILE_UUID" -f supabase/seeds/upcoming_events.sql
\set ON_ERROR_STOP on
begin;
insert into public.events(id,author_id,source_key,host_label,type,title,description,location,starts_at,ends_at,registration_mode,external_url,capacity,time_confirmed,topics)
select '172cda23-ab39-5698-a9b4-8833b7366f7d', :'creator_id'::uuid,'public-makers-pd-2026','Public Makers · PD – Berater der öffentlichen Hand','official','Public Makers: Case Event mit der PD','Who does the state call when they need advice? Public sector consultants!

Join the first Public Makers Case Event with PD – Berater der öffentlichen Hand.

• Gain hands-on experience in public sector consulting through a challenging case.
• Work in an interdisciplinary team to strategize and prototype with real PD consultants.
• Discover Germany’s in-house public sector consulting agency.

Knowledge of German is required.
Limited spots. Application deadline: November 10, 2026.

Apply: https://forms.gle/wTVL796AR2qu4xNB9
Public Makers: https://www.publicmakers.org/
PD: https://www.pd-g.de/','TUM Think Tank','2026-11-16T14:00:00+01:00','2026-11-16T16:00:00+01:00','external','https://forms.gle/wTVL796AR2qu4xNB9',null,true,array(select jsonb_array_elements_text('["Workshop", "Networking"]'::jsonb))
on conflict(source_key) do nothing;
insert into public.events(id,author_id,source_key,host_label,type,title,description,location,starts_at,ends_at,registration_mode,external_url,capacity,time_confirmed,topics)
select 'd6e0ba8d-8ae2-555a-bbbd-76a7c8e35ce9', :'creator_id'::uuid,'bmw-mm-workshop-2026','BMW × Manage and More','official','BMW × MM Co-Creation Workshop: The Vehicle Side of Tomorrow','Join BMW engineers to rethink the future of the vehicle side.

Explore everything from door handles and side windows to new interaction and door-opening concepts.

Together, we will explore future customer needs, develop use cases and turn them into concrete product ideas.

Language: English
Available places: 15 student spots','Munich Urban Colab · Innovation Lab','2026-11-13T09:00:00+01:00','2026-11-13T12:00:00+01:00','internal',null,15,true,array(select jsonb_array_elements_text('["Workshop", "AI & Technology"]'::jsonb))
on conflict(source_key) do nothing;
insert into public.events(id,author_id,source_key,host_label,type,title,description,location,starts_at,ends_at,registration_mode,external_url,capacity,time_confirmed,topics)
select 'b828a7d6-8ccc-593d-a9da-3d67e7561c04', :'creator_id'::uuid,'start-and-spread-2026','Manage and More','official','Start and Spread 2026','Start and Spread is back!

Join our pitch and networking event with live startup pitches, an expert jury, inspiring speakers and people from the Munich startup scene.

Food and drinks are included.
Bring your friends and teammates!

Tickets: https://www.manageandmore.de/start-and-spread-2026/','ADAC-Zentrale · Munich','2026-11-26T17:15:00+01:00','2026-11-26T23:00:00+01:00','external','https://www.manageandmore.de/start-and-spread-2026/',null,true,array(select jsonb_array_elements_text('["Entrepreneurship", "Networking"]'::jsonb))
on conflict(source_key) do nothing;
insert into public.events(id,author_id,source_key,host_label,type,title,description,location,starts_at,ends_at,registration_mode,external_url,capacity,time_confirmed,topics)
select '9802dc22-886a-5bd3-b129-54b96e813d5b', :'creator_id'::uuid,'tum-ideaward-2026','TUM · UnternehmerTUM','official','TUM IDEAward 2026','Celebrate innovation at the annual TUM IDEAward ceremony!

Ten pre-selected founding teams from TUM will present their game-changing ideas.
The three most promising teams will receive prizes totalling €37,500.

After the stage programme, join the networking session to discover offerings from the TUM & UnternehmerTUM ecosystem and exchange ideas with fellow innovators.

Date: Thursday, November 26, 2026
Location: TUM City Campus, Munich
Admission: Free ticket required.

Get your free ticket: https://IDEAward2026.eventbrite.de','TUM City Campus · Munich','2026-11-26T00:00:00+01:00','2026-11-26T23:59:00+01:00','external','https://IDEAward2026.eventbrite.de',null,false,array(select jsonb_array_elements_text('["Entrepreneurship", "Networking"]'::jsonb))
on conflict(source_key) do nothing;
commit;
