import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Run against a disposable PostgreSQL-compatible database, never production.
export async function checkFeedDatabase(db) {
    await db.exec(`
        create role anon; create role authenticated;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to anon,authenticated;
        grant execute on function auth.uid() to anon,authenticated;
        create publication supabase_realtime;
    `);
    await db.exec(readFileSync(new URL("./feed.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("./feed-events.sql", import.meta.url), "utf8"));
    const owner = "00000000-0000-4000-8000-000000000001";
    const friend = "00000000-0000-4000-8000-000000000002";
    const stranger = "00000000-0000-4000-8000-000000000003";
    await db.query("insert into auth.users values($1),($2),($3)", [owner, friend, stranger]);
    async function as(id) {
        await db.exec(`reset role; set role ${id ? "authenticated" : "anon"};`);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
    }
    async function scalar(sql, args = []) {
        const result = await db.query(sql, args);
        return Object.values(result.rows[0])[0];
    }
    async function visible(id) {
        return scalar("select count(*)::int from public.feed_posts where id=$1", [id]);
    }
    async function publish(type, audience, source = null, key = crypto.randomUUID()) {
        return scalar(`select public.feed_publish($1,$2,'Test content',$3,true,'Psalm 23:1','The LORD is my shepherd',$4)`,
            [type, key, audience, source]);
    }
    async function action(post, kind, body = null) {
        return db.query("select public.feed_interact($1,$2,$3)", [post, kind, body]);
    }
    for (const id of [owner, friend, stranger]) {
        await as(id);
        const profile = await scalar("select public.feed_settings()");
        assert.equal(profile.default_audience, "private");
    }
    await as(owner);
    const privatePost = await publish("achievement", null);
    const friendsPost = await publish("completion", "friends");
    const publicPost = await publish("verse_shared", "public");
    const eventKey = crypto.randomUUID();
    const once = await publish("post", "private", null, eventKey);
    assert.equal(await publish("post", "public", null, eventKey), once);
    assert.equal(await scalar("select count(*)::int from public.feed_events where post_id=$1", [once]), 1);
    assert.equal(await visible(privatePost), 1);
    await assert.rejects(() => db.exec("insert into public.feed_posts(owner_id) values(auth.uid())"), /permission denied/);
    await assert.rejects(() => db.exec("select default_audience from public.feed_profiles"), /permission denied/);
    await as(null);
    assert.equal(await visible(publicPost), 1);
    assert.equal(await visible(privatePost), 0);
    assert.equal(await visible(friendsPost), 0);
    await assert.rejects(() => publish("post", "public"), /permission denied/);
    await as(stranger);
    await assert.rejects(() => db.query(
        "select public.feed_publish('post',$1,'Wrong account','private',true,'','',null,$2)",
        [crypto.randomUUID(),owner]
    ), /Account changed/);
    assert.equal(await visible(privatePost), 0);
    assert.equal(await visible(friendsPost), 0);
    await assert.rejects(() => action(publicPost, "disable_comments"), /Only the content owner/);
    await assert.rejects(() => action(privatePost, "comment", "Not allowed"), /no longer visible/);
    await action(publicPost, "like");
    await action(publicPost, "like");
    assert.equal(await scalar("select count(*)::int from public.feed_likes where post_id=$1", [publicPost]), 1);
    await action(publicPost, "unlike");
    assert.equal(await scalar("select count(*)::int from public.feed_likes where post_id=$1", [publicPost]), 0);
    await action(publicPost, "comment", "<script>literal comment</script>");
    await as(owner);
    await action(publicPost, "disable_comments");
    await as(stranger);
    assert.equal(await scalar("select count(*)::int from public.feed_comments where post_id=$1", [publicPost]), 1);
    await assert.rejects(() => action(publicPost, "comment", "Blocked"), /disabled new comments/);
    await as(owner);
    await action(publicPost, "enable_comments");
    await db.query("select public.feed_friend_action($1,'request')", [friend]);
    await as(friend);
    assert.equal(await visible(friendsPost), 0);
    await db.query("select public.feed_friend_action($1,'accept')", [owner]);
    assert.equal(await visible(friendsPost), 1);
    assert.equal(await visible(privatePost), 0);
    const reflection = await publish("reflection", "friends", publicPost);
    const friendsVerse = await publish("verse_shared", "friends");
    await assert.rejects(() => publish("reflection", "public", friendsVerse), /wider audience/);
    await assert.rejects(() => publish("reflection", "private", reflection), /accessible shared verse/);
    await action(reflection, "audience", "private");
    await as(owner);
    const timeline = await scalar("select public.feed_timeline()");
    assert.ok(timeline.some(event => event.kind === "comments_disabled"));
    assert.ok(timeline.some(event => event.kind === "comments_enabled"));
    assert.ok(timeline.some(event => event.kind === "comment" && event.comment.includes("<script>")));
    assert.ok(timeline.every((event, i) => !i || event.id < timeline[i - 1].id));
    assert.ok(timeline.every((event, i) => !i || Date.parse(event.created_at) <= Date.parse(timeline[i - 1].created_at)));
    await action(publicPost, "audience", "private");
    await as(friend);
    assert.equal(await visible(reflection), 0, "Source privacy changes also hide derived reflections");
    assert.equal(await scalar("select count(*)::int from public.feed_comments where post_id=$1", [publicPost]), 0);
    assert.equal(await scalar("select count(*)::int from public.feed_events where post_id=$1", [publicPost]), 0);
    await db.query("select public.feed_friend_action($1,'remove')", [owner]);
    assert.equal(await visible(friendsPost), 0);
    await as(owner);
    for (let i = 0; i < 25; i++) await publish("post", "private");
    const page1 = await scalar("select public.feed_timeline()");
    const page2 = await scalar("select public.feed_timeline($1)", [page1.at(-1).id]);
    assert.equal(page1.length, 20);
    assert.ok(page2.length > 0);
    assert.ok(page2.every(event => event.id < page1.at(-1).id));
    const eventKey2 = crypto.randomUUID();
    const future = new Date(Date.now() + 86400000).toISOString();
    const event = await scalar("select public.feed_publish_event($1,'Upcoming event',$2,'friends',true,$3)", [eventKey2,future,owner]);
    assert.equal(await scalar("select public.feed_publish_event($1,'Retry',$2,'public',true,$3)", [eventKey2,future,owner]), event);
    const upcoming = await scalar("select public.feed_upcoming()");
    assert.equal(upcoming.length, 1);
    assert.equal(upcoming[0].body, "Upcoming event");
    await assert.rejects(() => scalar("select public.feed_publish_event($1,'Past event',now()-interval '1 day')", [crypto.randomUUID()]), /future/);
    await assert.rejects(() => publish("event", "public"), /feed_event_date/);
    await as(stranger);
    assert.equal((await scalar("select public.feed_upcoming()")).length, 0);
    await as(null);
    assert.equal((await scalar("select public.feed_upcoming()")).length, 0);
    await as(owner);
    await action(event, "audience", "public");
    await as(null);
    assert.equal((await scalar("select public.feed_upcoming()")).length, 1);
    console.log("PASS: database audiences, friendships, grants, idempotency, engagements, event processing, source privacy and pagination");
}

if (process.argv[2]) {
    const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
    const db = new PGlite();
    try { await checkFeedDatabase(db); }
    finally { await db.close(); }
}
