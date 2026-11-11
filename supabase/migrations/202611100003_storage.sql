begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('event-images','event-images',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('review-images','review-images',false,10485760,array['image/jpeg','image/png','image/webp']);
-- Path format: avatars/<user UUID>/<filename>; other buckets/<user UUID>/<event UUID>/<filename>.
create function private.can_upload_image(bucket text,path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare eid uuid;
begin
 if auth.uid() is null or split_part(path,'/',1)<>auth.uid()::text
 or path ~ '(^|/)\.\.?(/|$)' or length(path)>500 then return false; end if;
 if bucket='avatars' then return array_length(string_to_array(path,'/'),1)=2 and split_part(path,'/',2)<>''; end if;
 if bucket not in ('event-images','review-images') or array_length(string_to_array(path,'/'),1)<>3 or split_part(path,'/',3)='' then return false; end if;
 begin eid:=split_part(path,'/',2)::uuid; exception when invalid_text_representation then return false; end;
 if bucket='event-images' then return private.owns_event(eid); end if;
 return private.can_review(eid);
end $$;
create function private.can_read_image(bucket text,path text) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and case bucket
 when 'avatars' then exists(select 1 from public.profiles where photo_path=path)
 when 'event-images' then exists(select 1 from public.events where image_path=path and private.can_read_event(id))
 when 'review-images' then exists(select 1 from public.reviews where path=any(photo_paths) and private.can_read_event(event_id))
 else false end
$$;
revoke all on function private.can_upload_image(text,text),private.can_read_image(text,text) from public,anon,authenticated;
grant execute on function private.can_upload_image(text,text),private.can_read_image(text,text) to authenticated;
-- Supabase owns storage.objects and already enables its RLS. Never disable it.
create policy cg_images_read on storage.objects for select to authenticated using (
 bucket_id in ('avatars','event-images','review-images') and
 ((owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text) or private.can_read_image(bucket_id,name)));
create policy cg_images_insert on storage.objects for insert to authenticated with check (
 owner_id=auth.uid()::text and private.can_upload_image(bucket_id,name));
create policy cg_images_update on storage.objects for update to authenticated using (
 bucket_id in ('avatars','event-images','review-images') and owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text)
 with check (owner_id=auth.uid()::text and private.can_upload_image(bucket_id,name));
create policy cg_images_delete on storage.objects for delete to authenticated using (
 bucket_id in ('avatars','event-images','review-images') and owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text);
create index profiles_photo_idx on public.profiles(photo_path) where photo_path is not null;
create index events_image_idx on public.events(image_path) where image_path is not null;
create index reviews_photos_idx on public.reviews using gin(photo_paths);
commit;
