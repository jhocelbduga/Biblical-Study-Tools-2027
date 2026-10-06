begin;

create table public.feed_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
    default_audience text not null default 'private' check (default_audience in ('public','friends','private'))
);
create table public.feed_friendships (
    requester uuid not null references auth.users(id) on delete cascade,
    recipient uuid not null references auth.users(id) on delete cascade,
    accepted boolean not null default false,
    created_at timestamptz not null default now(),
    primary key (requester, recipient),
    check (requester <> recipient)
);
create unique index feed_friend_pair on public.feed_friendships
    (least(requester,recipient), greatest(requester,recipient));
create table public.feed_activity_types (
    name text primary key
);
insert into public.feed_activity_types values ('achievement'),('completion'),('verse_shared'),('reflection'),('post');
create table public.feed_posts (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.feed_profiles(user_id) on delete cascade,
    activity_type text not null references public.feed_activity_types(name),
    event_key uuid not null,
    body text not null check (char_length(btrim(body)) between 1 and 4000),
    verse_reference text not null default '' check (char_length(verse_reference) <= 160),
    verse_text text not null default '' check (char_length(verse_text) <= 2000),
    source_id uuid references public.feed_posts(id),
    audience text not null default 'private' check (audience in ('public','friends','private')),
    comments_enabled boolean not null default true,
    created_at timestamptz not null default now(),
    unique(owner_id,event_key)
);
create table public.feed_comments (
    id bigint generated always as identity primary key,
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    user_id uuid not null references public.feed_profiles(user_id) on delete cascade,
    body text not null check (char_length(btrim(body)) between 1 and 2000),
    created_at timestamptz not null default now()
);
create table public.feed_likes (
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    user_id uuid not null references public.feed_profiles(user_id) on delete cascade,
    primary key(post_id,user_id)
);
create table public.feed_events (
    id bigint generated always as identity primary key,
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    actor_id uuid not null references public.feed_profiles(user_id) on delete cascade,
    kind text not null,
    comment_id bigint references public.feed_comments(id) on delete cascade,
    created_at timestamptz not null default clock_timestamp()
);
create index feed_events_post on public.feed_events(post_id);
create index feed_comments_post on public.feed_comments(post_id,id);
create index feed_posts_owner on public.feed_posts(owner_id);

alter table public.feed_profiles enable row level security;
alter table public.feed_friendships enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_events enable row level security;
alter table public.feed_activity_types enable row level security;
revoke all on public.feed_profiles, public.feed_friendships, public.feed_posts,
    public.feed_comments, public.feed_likes, public.feed_events, public.feed_activity_types
    from public, anon, authenticated;

create function public.feed_are_friends(a uuid,b uuid)
returns boolean language sql stable security definer set search_path='' as $$
    select exists(select 1 from public.feed_friendships f where f.accepted and
        ((f.requester=a and f.recipient=b) or (f.requester=b and f.recipient=a)));
$$;
create function public.feed_audience_visible(owner uuid, audience text)
returns boolean language sql stable security definer set search_path='' as $$
    select owner=auth.uid() or audience='public' or
        (audience='friends' and public.feed_are_friends(owner,auth.uid()));
$$;
create function public.feed_can_view(post uuid)
returns boolean language sql stable security definer set search_path='' as $$
    select exists(
        select 1 from public.feed_posts p left join public.feed_posts source on source.id=p.source_id
        where p.id=post and public.feed_audience_visible(p.owner_id,p.audience)
        and (p.source_id is null or public.feed_audience_visible(source.owner_id,source.audience))
    );
$$;

create policy feed_profile_read on public.feed_profiles for select to anon,authenticated using (true);
create policy feed_friend_read on public.feed_friendships for select to authenticated
    using (auth.uid() in (requester,recipient));
create policy feed_post_read on public.feed_posts for select to anon,authenticated using (public.feed_can_view(id));
create policy feed_comment_read on public.feed_comments for select to anon,authenticated using (public.feed_can_view(post_id));
create policy feed_like_read on public.feed_likes for select to anon,authenticated using (public.feed_can_view(post_id));
create policy feed_event_read on public.feed_events for select to anon,authenticated using (public.feed_can_view(post_id));
grant select(user_id,display_name) on public.feed_profiles to anon,authenticated;
grant select on public.feed_friendships to authenticated;
grant select on public.feed_posts,public.feed_comments,public.feed_likes,public.feed_events to anon,authenticated;

create function public.feed_settings(display_name text default null, audience text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); result jsonb;
begin
    if caller is null then raise exception 'Sign in to configure your feed.'; end if;
    insert into public.feed_profiles(user_id,display_name) values(caller,'Reader') on conflict do nothing;
    update public.feed_profiles p set
        display_name=coalesce(btrim(feed_settings.display_name),p.display_name),
        default_audience=coalesce(feed_settings.audience,p.default_audience) where p.user_id=caller;
    select to_jsonb(p) into result from public.feed_profiles p where p.user_id=caller;
    return result;
end;
$$;

create function public.feed_friend_action(account_id uuid, action text)
returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid();
begin
    if caller is null or caller=account_id then raise exception 'Choose another account and sign in.'; end if;
    if action='request' then
        if not exists(select 1 from public.feed_profiles where user_id=account_id) then
            raise exception 'Account code not found. Ask your friend to open their Home Feed first.';
        end if;
        insert into public.feed_friendships(requester,recipient) values(caller,account_id) on conflict do nothing;
    elsif action='accept' then
        update public.feed_friendships set accepted=true where requester=account_id and recipient=caller and not accepted;
        if not found then raise exception 'Incoming request not found.'; end if;
    elsif action='remove' then
        delete from public.feed_friendships where
            (requester=caller and recipient=account_id) or (requester=account_id and recipient=caller);
    else raise exception 'Unknown friendship action.';
    end if;
end;
$$;

create function public.feed_publish(
    activity_type text, event_key uuid, body text, audience text default null,
    comments_enabled boolean default true, verse_reference text default '', verse_text text default '',
    source_id uuid default null, expected_owner uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); selected_audience text; source public.feed_posts; result uuid;
begin
    if caller is null then raise exception 'Sign in to publish activity.'; end if;
    if expected_owner is not null and expected_owner<>caller then
        raise exception 'Account changed. Retry using the original account.';
    end if;
    select p.default_audience into selected_audience from public.feed_profiles p where p.user_id=caller;
    if selected_audience is null then raise exception 'Open your Home Feed to set up your account.'; end if;
    selected_audience:=coalesce(audience,selected_audience);
    if source_id is not null then
        select * into source from public.feed_posts p where p.id=feed_publish.source_id for update;
        if not found or not public.feed_can_view(source_id) or source.activity_type<>'verse_shared'
            or activity_type<>'reflection' then raise exception 'Select an accessible shared verse to reflect on.'; end if;
        if (source.audience='private' and selected_audience<>'private') or
            (source.audience='friends' and selected_audience='public') then
            raise exception 'A reflection cannot have a wider audience than its source verse.';
        end if;
        verse_reference:=source.verse_reference;
        verse_text:=source.verse_text;
    end if;
    insert into public.feed_posts(owner_id,activity_type,event_key,body,audience,comments_enabled,
        verse_reference,verse_text,source_id)
    values(caller,activity_type,event_key,btrim(body),selected_audience,comments_enabled,
        verse_reference,verse_text,source_id)
    on conflict on constraint feed_posts_owner_id_event_key_key do nothing returning id into result;
    if result is null then
        select p.id into result from public.feed_posts p where p.owner_id=caller and p.event_key=feed_publish.event_key;
    end if;
    return result;
end;
$$;

create function public.feed_interact(post_id uuid, action text, body text default null)
returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); post public.feed_posts;
begin
    if caller is null then raise exception 'Sign in to interact with activity.'; end if;
    select * into post from public.feed_posts p where p.id=post_id for update;
    if not found or not public.feed_can_view(post_id) then raise exception 'This activity is no longer visible.'; end if;
    if action='comment' then
        if not post.comments_enabled then raise exception 'The owner disabled new comments.'; end if;
        insert into public.feed_comments(post_id,user_id,body) values(post_id,caller,btrim(body));
    elsif action='like' then
        insert into public.feed_likes(post_id,user_id) values(post_id,caller) on conflict do nothing;
    elsif action='unlike' then
        delete from public.feed_likes l where l.post_id=feed_interact.post_id and l.user_id=caller;
    elsif action in ('enable_comments','disable_comments','audience') then
        if post.owner_id<>caller then raise exception 'Only the content owner can change these settings.'; end if;
        if action='audience' then
            if post.source_id is not null and exists(
                select 1 from public.feed_posts s where s.id=post.source_id and
                ((s.audience='private' and feed_interact.body<>'private') or (s.audience='friends' and feed_interact.body='public'))
            ) then raise exception 'A reflection cannot have a wider audience than its source verse.'; end if;
            update public.feed_posts p set audience=feed_interact.body where p.id=post_id;
        else
            update public.feed_posts p set comments_enabled=(action='enable_comments') where p.id=post_id;
        end if;
    else raise exception 'Unknown engagement action.';
    end if;
end;
$$;

create function public.feed_record_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
    if tg_table_name='feed_comments' then
        insert into public.feed_events(post_id,actor_id,kind,comment_id) values(new.post_id,new.user_id,'comment',new.id);
    elsif tg_op='INSERT' then
        insert into public.feed_events(post_id,actor_id,kind) values(new.id,new.owner_id,new.activity_type);
    elsif new.comments_enabled is distinct from old.comments_enabled then
        insert into public.feed_events(post_id,actor_id,kind)
        values(new.id,new.owner_id,case when new.comments_enabled then 'comments_enabled' else 'comments_disabled' end);
    end if;
    return new;
end;
$$;
create trigger feed_post_event after insert or update on public.feed_posts for each row execute function public.feed_record_event();
create trigger feed_comment_event after insert on public.feed_comments for each row execute function public.feed_record_event();

create function public.feed_timeline(before_id bigint default null)
returns jsonb language sql stable security invoker set search_path='' as $$
    select coalesce(jsonb_agg(entry order by created_at desc,id desc),'[]'::jsonb) from (
        select e.id,e.created_at, jsonb_build_object(
            'id',e.id,'kind',e.kind,'created_at',e.created_at,
            'actor_id',e.actor_id,'display_name',profile.display_name,
            'post',to_jsonb(p),'comment',c.body,
            'likes',(select count(*) from public.feed_likes l where l.post_id=p.id),
            'liked',exists(select 1 from public.feed_likes l where l.post_id=p.id and l.user_id=auth.uid())
        ) entry
        from public.feed_events e join public.feed_posts p on p.id=e.post_id
        join public.feed_profiles profile on profile.user_id=e.actor_id
        left join public.feed_comments c on c.id=e.comment_id
        where before_id is null or (e.created_at,e.id) < (
            select cursor.created_at,cursor.id from public.feed_events cursor where cursor.id=before_id
        )
        order by e.created_at desc,e.id desc limit 20
    ) entries;
$$;

revoke all on function public.feed_are_friends(uuid,uuid),public.feed_audience_visible(uuid,text),
    public.feed_can_view(uuid),public.feed_settings(text,text),public.feed_friend_action(uuid,text),
    public.feed_publish(text,uuid,text,text,boolean,text,text,uuid,uuid),public.feed_interact(uuid,text,text),
    public.feed_record_event(),public.feed_timeline(bigint) from public,anon,authenticated;
grant execute on function public.feed_can_view(uuid),public.feed_timeline(bigint) to anon,authenticated;
grant execute on function public.feed_settings(text,text),public.feed_friend_action(uuid,text),
    public.feed_publish(text,uuid,text,text,boolean,text,text,uuid,uuid),public.feed_interact(uuid,text,text) to authenticated;

alter publication supabase_realtime add table public.feed_posts,public.feed_events,public.feed_comments,public.feed_likes,public.feed_friendships;
commit;
