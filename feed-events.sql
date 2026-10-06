begin;
alter table public.feed_posts add column event_at timestamptz;
insert into public.feed_activity_types(name) values ('event');
alter table public.feed_posts add constraint feed_event_date
    check ((activity_type='event' and event_at is not null) or (activity_type<>'event' and event_at is null));
create index feed_upcoming_events on public.feed_posts(event_at,id) where activity_type='event';

create function public.feed_publish_event(
    event_key uuid, body text, event_at timestamptz, audience text default null,
    comments_enabled boolean default true, expected_owner uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; selected_audience text;
begin
    if auth.uid() is null then raise exception 'Sign in to create an event.'; end if;
    if expected_owner is not null and expected_owner<>auth.uid() then raise exception 'Account changed.'; end if;
    select p.id into result from public.feed_posts p where p.owner_id=auth.uid() and p.event_key=feed_publish_event.event_key;
    if result is not null then
        if not exists(select 1 from public.feed_posts p where p.id=result and p.activity_type='event') then
            raise exception 'This activity key belongs to another activity.';
        end if;
        return result;
    end if;
    if event_at is null or event_at<=now() then raise exception 'Choose a future event date and time.'; end if;
    select p.default_audience into selected_audience from public.feed_profiles p where p.user_id=auth.uid();
    if selected_audience is null then raise exception 'Open Home Feed to set up your account.'; end if;
    insert into public.feed_posts(owner_id,activity_type,event_key,body,audience,comments_enabled,event_at)
    values(auth.uid(),'event',feed_publish_event.event_key,btrim(body),coalesce(audience,selected_audience),
        comments_enabled,feed_publish_event.event_at)
    on conflict on constraint feed_posts_owner_id_event_key_key do nothing returning id into result;
    if result is null then
        select p.id into result from public.feed_posts p where p.owner_id=auth.uid() and p.event_key=feed_publish_event.event_key;
        if not exists(select 1 from public.feed_posts p where p.id=result and p.activity_type='event') then
            raise exception 'This activity key belongs to another activity.';
        end if;
    end if;
    return result;
end;
$$;

create function public.feed_upcoming(
    after_time timestamptz default null, after_id uuid default null
) returns jsonb language sql stable security invoker set search_path='' as $$
    select coalesce(jsonb_agg(to_jsonb(events) order by event_at,id),'[]'::jsonb) from (
        select p.id,p.owner_id,p.body,p.audience,p.event_at,profile.display_name
        from public.feed_posts p join public.feed_profiles profile on profile.user_id=p.owner_id
        where p.activity_type='event' and p.event_at>now()
            and (after_time is null or (p.event_at,p.id)>(after_time,after_id))
        order by p.event_at,p.id limit 50
    ) events;
$$;
revoke all on function public.feed_publish_event(uuid,text,timestamptz,text,boolean,uuid),public.feed_upcoming(timestamptz,uuid)
    from public,anon,authenticated;
grant execute on function public.feed_publish_event(uuid,text,timestamptz,text,boolean,uuid) to authenticated;
grant execute on function public.feed_upcoming(timestamptz,uuid) to anon,authenticated;
commit;
