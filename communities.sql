begin;

create table public.communities (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id),
    name text not null check (char_length(btrim(name)) between 3 and 80),
    description text not null check (char_length(btrim(description)) between 10 and 1000),
    city text not null check (char_length(btrim(city)) between 2 and 120),
    latitude double precision,
    longitude double precision,
    created_at timestamptz not null default now(),
    constraint valid_meeting_location check (
        (latitude is null and longitude is null) or
        (latitude is not null and longitude is not null and
         latitude between -90 and 90 and longitude between -180 and 180)
    )
);

create table public.community_members (
    community_id uuid not null references public.communities(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (community_id, user_id)
);
create index community_members_user on public.community_members(user_id);
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
revoke all on public.communities, public.community_members from public, anon, authenticated;

create function public.create_community(
    community_name text, community_description text, community_city text,
    meeting_lat double precision default null, meeting_lng double precision default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; caller uuid := auth.uid();
begin
    if caller is null then raise exception 'Sign in to create a community.'; end if;
    insert into public.communities(owner_id, name, description, city, latitude, longitude)
    values (caller, btrim(community_name), btrim(community_description), btrim(community_city), meeting_lat, meeting_lng)
    returning id into new_id;
    insert into public.community_members(community_id, user_id) values (new_id, caller);
    return new_id;
end;
$$;

create function public.join_community(community_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Sign in to join a community.'; end if;
    insert into public.community_members(community_id, user_id)
    values (join_community.community_id, auth.uid()) on conflict do nothing;
end;
$$;

create function public.leave_community(community_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
    if auth.uid() is null then raise exception 'Sign in to leave a community.'; end if;
    if exists (select 1 from public.communities c where c.id = leave_community.community_id and c.owner_id = auth.uid()) then
        raise exception 'The community owner must remain a member.';
    end if;
    delete from public.community_members m where m.community_id = leave_community.community_id and m.user_id = auth.uid();
end;
$$;

create function public.search_communities(
    search_text text default '', near_lat double precision default null,
    near_lng double precision default null, radius_km integer default 25,
    joined_only boolean default false
) returns table (
    id uuid, owner_id uuid, name text, description text, city text,
    member_count bigint, is_member boolean, distance_km double precision
) language plpgsql stable security definer set search_path = '' as $$
begin
    if char_length(search_text) > 100 then raise exception 'Search must be 100 characters or fewer.'; end if;
    if radius_km is null or radius_km not between 1 and 100 then raise exception 'Radius must be between 1 and 100 km.'; end if;
    if (near_lat is null) <> (near_lng is null) or
       (near_lat is not null and not (near_lat between -90 and 90 and near_lng between -180 and 180)) then
        raise exception 'Invalid search coordinates.';
    end if;
    return query
    with matches as (
        select c.*,
            (select count(*) from public.community_members m where m.community_id = c.id) as members,
            exists(select 1 from public.community_members m where m.community_id = c.id and m.user_id = auth.uid()) as joined,
            case when near_lat is not null and c.latitude is not null then
                6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
                    power(sin(radians(c.latitude - near_lat) / 2), 2) +
                    cos(radians(near_lat)) * cos(radians(c.latitude)) *
                    power(sin(radians(c.longitude - near_lng) / 2), 2)
                )))) else null end as distance
        from public.communities c
        where coalesce(btrim(search_text), '') = '' or
            strpos(lower(c.name || ' ' || c.description || ' ' || c.city), lower(btrim(search_text))) > 0
    )
    select c.id, c.owner_id, c.name, c.description, c.city, c.members, c.joined, c.distance
    from matches c
    where (not coalesce(joined_only, false) or c.joined)
      and (near_lat is null or c.distance <= radius_km)
    order by c.distance asc nulls last, c.created_at desc, c.id
    limit 50;
end;
$$;

revoke all on function public.create_community(text,text,text,double precision,double precision) from public, anon;
revoke all on function public.join_community(uuid) from public, anon;
revoke all on function public.leave_community(uuid) from public, anon;
revoke all on function public.search_communities(text,double precision,double precision,integer,boolean) from public;
grant execute on function public.create_community(text,text,text,double precision,double precision) to authenticated;
grant execute on function public.join_community(uuid), public.leave_community(uuid) to authenticated;
grant execute on function public.search_communities(text,double precision,double precision,integer,boolean) to anon, authenticated;

commit;
