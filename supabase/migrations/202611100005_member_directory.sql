begin;
-- Team placement is presentation metadata, never an application role.
create table public.featured_members (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 display_order integer not null check (display_order>=0),
 constraint featured_members_order_unique unique(display_order) deferrable initially immediate
);
alter table public.featured_members enable row level security;
create policy featured_members_read on public.featured_members for select to authenticated using (true);
revoke all on public.featured_members from public,anon,authenticated;
grant select on public.featured_members to authenticated;
-- Only trusted project administrators (SQL Editor/postgres or server service role) manage placement.
grant all on public.featured_members to service_role;

create function private.member_text(value text) returns text
language sql immutable set search_path='' as $$
 select lower(btrim(regexp_replace(regexp_replace(normalize(coalesce(value,''),NFD),
 U&'[\0300-\036f]','','g'),'[[:space:]]+',' ','g')))
$$;
create function private.member_tokens(value text) returns text[]
language sql immutable set search_path='' as $$
 select coalesce(array_agg(distinct private.member_text(t)) filter(where private.member_text(t)<>''),'{}'::text[])
 from unnest(regexp_split_to_array(coalesce(value,''),E'[,;\n]')) t
$$;
create function private.member_interest_tokens(interests text, topics text[]) returns text[]
language sql immutable set search_path='' as $$
 select coalesce(array_agg(distinct private.member_text(t)) filter(where private.member_text(t)<>''),'{}'::text[])
 from unnest(private.member_tokens(interests)||coalesce(topics,'{}')) t
$$;
-- Invoker functions preserve profiles and featured_members RLS; no auth.users read is necessary.
create function public.search_members(
 p_query text default '', p_occupation text default '', p_major text default '',
 p_course text default '', p_interests text[] default '{}', p_contact text default '',
 p_page integer default 0, p_page_size integer default 20
) returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_page is null or p_page<0 or p_page>100000 or p_page_size is null or p_page_size<1 or p_page_size>50
 or length(coalesce(p_query,''))>200 or cardinality(p_interests)>30
 or coalesce(p_contact,'') not in ('','gray','yellow','green') then
 raise exception 'Invalid directory query' using errcode='22023'; end if;
 with filtered as materialized (
  select p.id,p.name,p.occupation,p.bio,p.major,p.interests,p.courses,p.photo_path,
   p.social,p.social_other,p.topics,p.open_to,p.contact_preference,f.display_order as team_order,
   private.member_text(p.name) as sort_name
  from public.profiles p left join public.featured_members f on f.user_id=p.id
  where not exists (select 1 from unnest(string_to_array(private.member_text(p_query),' ')) word
    where word<>'' and strpos(private.member_text(p.name),word)=0)
   and (coalesce(p_occupation,'')='' or private.member_text(p.occupation)=private.member_text(p_occupation))
   and (coalesce(p_major,'')='' or private.member_text(p.major)=private.member_text(p_major))
   and (coalesce(p_course,'')='' or private.member_tokens(p.courses) @> array[private.member_text(p_course)])
   and (coalesce(cardinality(p_interests),0)=0 or private.member_interest_tokens(p.interests,p.topics) &&
     array(select private.member_text(t) from unnest(p_interests) t))
   and (coalesce(p_contact,'')='' or p.contact_preference=p_contact)
 ), paged as (
  select * from filtered order by team_order asc nulls last,sort_name,id
  limit p_page_size offset p_page*p_page_size
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(paged)-'sort_name'
  order by team_order asc nulls last,sort_name,id) from paged),'[]'::jsonb),
  'total',(select count(*) from filtered),'page',p_page,'page_size',p_page_size) into result;
 return result;
end $$;
create function public.member_filter_options() returns jsonb
language sql stable set search_path='' as $$
 with values_by_kind as (
  select 'occupations' kind, occupation val from public.profiles
  union all select 'majors',major from public.profiles
  union all select 'courses',unnest(regexp_split_to_array(courses,E'[,;\n]')) from public.profiles
  union all select 'interests',unnest(regexp_split_to_array(interests,E'[,;\n]')||topics) from public.profiles
 ), unique_values as (
  select kind,private.member_text(val) normalized,min(btrim(val)) label
  from values_by_kind where private.member_text(val)<>'' group by kind,private.member_text(val)
 ), grouped_options as (select kind,jsonb_agg(label order by normalized) labels from unique_values group by kind)
 select jsonb_build_object('occupations','[]'::jsonb,'majors','[]'::jsonb,'courses','[]'::jsonb,'interests','[]'::jsonb)
 || coalesce(jsonb_object_agg(kind,labels),'{}'::jsonb) from grouped_options
$$;
revoke all on function private.member_text(text),private.member_tokens(text),private.member_interest_tokens(text,text[]),
 public.search_members(text,text,text,text,text[],text,integer,integer),public.member_filter_options()
 from public,anon,authenticated;
grant execute on function private.member_text(text),private.member_tokens(text),private.member_interest_tokens(text,text[]),
 public.search_members(text,text,text,text,text[],text,integer,integer),public.member_filter_options() to authenticated;
create index profiles_directory_name_idx on public.profiles(private.member_text(name),id);
create index profiles_directory_occupation_idx on public.profiles(private.member_text(occupation));
create index profiles_directory_major_idx on public.profiles(private.member_text(major));
create index profiles_directory_courses_idx on public.profiles using gin(private.member_tokens(courses));
create index profiles_directory_interests_idx on public.profiles using gin(private.member_interest_tokens(interests,topics));
-- Reassert server-side avatar limits, including direct API uploads bypassing PhotoPicker.
update storage.buckets set public=false,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='avatars';
commit;
