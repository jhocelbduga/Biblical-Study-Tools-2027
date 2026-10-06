import { connectSupabase } from "./supabase-client.js";
import { publishActivity } from "./feed-publisher.js";

const labels = {
    achievement: "Earned a milestone", completion: "Completed an activity",
    verse_shared: "Shared a verse", reflection: "Created a reflection", post: "Posted an update",
    comment: "Added a comment", comments_enabled: "Enabled comments", comments_disabled: "Disabled new comments"
};
const audiences = { public: "Public", friends: "Friends Only", private: "Private" };
const $ = id => document.getElementById(id);
let client;
let user;
let sessionVersion = 0;
let requestVersion = 0;
let channel;
let entries = [];
let sourceId = null;
let verse = { reference: "", text: "" };
let composerType = "post";
let composerKey = crypto.randomUUID();
let ready = false;
let refreshTimer;
let authSubscription;
const failures = new Map();

function element(tag, text = "", className = "") {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}
function button(text, callback) {
    const node = element("button", text, "btn btn-outline-secondary btn-sm");
    node.type = "button";
    node.addEventListener("click", () => run(callback));
    return node;
}
function unwrap(result) {
    if (result.error) throw new Error(result.error.message);
    return result.data;
}
function status(message, error = false) {
    $("feedStatus").textContent = message;
    $("feedStatus").classList.toggle("text-danger", error);
}
async function run(callback) {
    try { await callback(); }
    catch (error) {
        console.error("Home Feed operation failed:", error);
        status(error.message, true);
    }
}
function signedIn() {
    if (!ready || !user) throw new Error("Sign in and wait for your Home Feed account to load.");
}
function audienceSelect(value) {
    const select = element("select", "", "form-select form-select-sm");
    Object.entries(audiences).forEach(([key, label]) => {
        const option = element("option", label);
        option.value = key;
        select.append(option);
    });
    select.value = value;
    return select;
}
function draft(type, content = {}) {
    if (!ready || !user) {
        status("Sign in and connect the Home Feed before creating a post or reflection.", true);
        return;
    }
    sourceId = content.sourceId || null;
    composerKey = crypto.randomUUID();
    composerType = type;
    verse = { reference: content.reference || "", text: content.text || "" };
    $("feedBody").value = content.body || "";
    $("feedDraftVerse").textContent = verse.reference ? `${verse.reference}: ${verse.text}` : "";
    $("feedComposeTitle").textContent = type === "reflection" ? "Write a personal reflection" :
        type === "verse_shared" ? "Post this verse" : "Create a post";
    if (content.audience) $("feedAudience").value = content.audience;
    $("homeFeed").scrollIntoView({ behavior: "smooth" });
    $("feedBody").focus();
}
function renderFailures() {
    $("feedRetries").replaceChildren();
    failures.forEach((activity, key) => {
        const row = element("div", `Activity not published: ${activity.body} `, "alert alert-warning");
        row.append(button("Retry", () => publish(activity)), button("Dismiss", () => {
            failures.delete(key);
            renderFailures();
        }));
        $("feedRetries").append(row);
    });
}
async function publish(activity) {
    signedIn();
    const owner = user.id;
    const version = sessionVersion;
    try {
        await publishActivity(client, activity, owner);
        if (version !== sessionVersion || user?.id !== owner) return;
        failures.delete(activity.eventKey);
        renderFailures();
        if (activity.eventKey === composerKey) draft("post");
        status("Activity published. Its selected audience is enforced by the database.");
        await refresh();
    } catch (error) {
        if (version === sessionVersion && user?.id === owner) {
            failures.set(activity.eventKey, activity);
            renderFailures();
        }
        throw error;
    }
}
window.addEventListener("bst-activity", event => {
    if (!ready || !user) {
        status("Activity remains device-local: sign in to publish future activities. Past activities are not uploaded automatically.");
        return;
    }
    run(() => publish(event.detail));
});
window.addEventListener("bst-feed-compose", event => draft(event.detail.type, event.detail));

async function interact(post, action, body = null, onSaved = () => {}) {
    signedIn();
    unwrap(await client.rpc("feed_interact", { post_id: post.id, action, body }));
    onSaved();
    await refresh();
}
async function loadComments(post, container, before = null) {
    const version = sessionVersion;
    let query = client.from("feed_comments").select("id,body,created_at,feed_profiles(display_name)")
        .eq("post_id", post.id).order("id", { ascending: false }).limit(50);
    if (before !== null) query = query.lt("id", before);
    const comments = unwrap(await query);
    if (version !== sessionVersion || !container.isConnected) return;
    container.querySelector("[data-more-comments]")?.remove();
    if (!before) container.replaceChildren();
    container.dataset.expanded = "true";
    comments.forEach(comment => {
        const row = element("div", "", "feed-comment");
        row.append(element("strong", comment.feed_profiles.display_name),
            element("time", new Date(comment.created_at).toLocaleString(), "small text-body-secondary"),
            element("p", comment.body, "mb-1"));
        container.append(row);
    });
    if (!before && !comments.length) container.append(element("p", "No comments yet."));
    if (comments.length === 50) {
        const more = button("Older comments", () => loadComments(post, container, comments.at(-1).id));
        more.dataset.moreComments = "true";
        container.append(more);
    }
}
function renderEntry(entry) {
    const post = entry.post;
    const card = element("article", "", "card feed-card p-3 p-md-4 mb-3");
    card.dataset.entryId = String(entry.id || "linked");
    const heading = element("div", "", "d-flex align-items-start gap-3");
    const avatar = element("span", entry.display_name.slice(0, 1).toUpperCase(), "feed-avatar");
    avatar.setAttribute("aria-hidden", "true");
    const details = element("div");
    details.append(element("strong", entry.display_name),
        element("p", labels[entry.kind] || entry.kind, "mb-1"),
        element("time", new Date(entry.created_at).toLocaleString(), "small text-body-secondary"),
        element("span", ` | ${audiences[post.audience]}`, "small text-body-secondary"));
    heading.append(avatar, details);
    card.append(heading);
    if (entry.comment) card.append(element("p", entry.comment, "feed-content mt-3"));
    card.append(element("p", post.body, "feed-content mt-3"));
    if (post.verse_reference) {
        card.append(element("blockquote", post.verse_text, "feed-content"),
            element("p", `${post.verse_reference} (KJV)`, "fw-semibold"));
    }
    const actions = element("div", "", "d-flex flex-wrap gap-2 border-top pt-3");
    const like = button(`${entry.liked ? "Unlike" : "Like"} (${entry.likes})`, async () => {
        like.disabled = true;
        try { await interact(post, entry.liked ? "unlike" : "like"); }
        finally { if (like.isConnected) like.disabled = !user; }
    });
    like.disabled = !user;
    const comments = element("div", "", "feed-comments mt-3");
    actions.append(like, button("View comments", () => loadComments(post, comments)));
    if (post.audience === "public") actions.append(button("Share link", async () => {
        const url = new URL(window.location.href);
        url.search = "";
        url.hash = `activity=${post.id}`;
        await navigator.clipboard.writeText(url.toString());
        if (post.activity_type === "verse_shared") {
            window.ActivityEvents.emit("verse_shared", {
                body: `Copied a sharing link for ${post.verse_reference}`,
                reference: post.verse_reference, text: post.verse_text
            });
        }
        status("Public activity link copied. Recipients must still pass the current audience check.");
    }));
    if (post.activity_type === "verse_shared" && user) {
        actions.append(button("Reflect on this verse", () => draft("reflection", {
            sourceId: post.id, reference: post.verse_reference, text: post.verse_text, audience: post.audience
        })));
    }
    if (user?.id === post.owner_id) {
        const select = audienceSelect(post.audience);
        select.setAttribute("aria-label", "Activity audience");
        actions.append(select, button("Save audience", () => interact(post, "audience", select.value)),
            button(post.comments_enabled ? "Disable new comments" : "Enable comments",
                () => interact(post, post.comments_enabled ? "disable_comments" : "enable_comments")));
    }
    card.append(actions, comments);
    if (post.comments_enabled && user) {
        const form = element("form", "", "d-flex gap-2 mt-3");
        const input = element("input", "", "form-control feed-comment-input");
        input.required = true;
        input.maxLength = 2000;
        input.placeholder = "Add a comment";
        input.setAttribute("aria-label", "Comment");
        const submit = element("button", "Comment", "btn btn-primary");
        submit.type = "submit";
        form.append(input, submit);
        form.addEventListener("submit", event => {
            event.preventDefault();
            run(async () => {
                submit.disabled = true;
                try { await interact(post, "comment", input.value, () => { input.value = ""; }); }
                finally { if (submit.isConnected) submit.disabled = false; }
            });
        });
        card.append(form);
    } else if (!post.comments_enabled) {
        card.append(element("p", "New comments disabled. Existing comments remain available.", "small mt-2 mb-0"));
    }
    return card;
}
function render() {
    const drafts = new Map([...$("feedTimeline").querySelectorAll("[data-entry-id]")].map(card => [
        card.dataset.entryId, { comment: card.querySelector(".feed-comment-input")?.value,
            expanded: card.querySelector(".feed-comments")?.dataset.expanded === "true" }
    ]));
    $("feedTimeline").replaceChildren(...entries.map(renderEntry));
    $("feedTimeline").querySelectorAll("[data-entry-id]").forEach(card => {
        const saved = drafts.get(card.dataset.entryId);
        if (saved?.comment && card.querySelector(".feed-comment-input")) card.querySelector(".feed-comment-input").value = saved.comment;
        if (saved?.expanded) {
            const entry = entries.find(item => String(item.id) === card.dataset.entryId);
            run(() => loadComments(entry.post, card.querySelector(".feed-comments")));
        }
    });
    if (!entries.length) $("feedTimeline").append(element("p", "No visible activities yet."));
    $("feedMore").hidden = entries.length === 0 || entries.length % 20 !== 0;
}
async function refresh(older = false) {
    if (!client) return;
    const version = sessionVersion;
    const request = ++requestVersion;
    let next = [];
    let page;
    let cursor = older ? entries.at(-1)?.id : null;
    const target = older ? 20 : Math.max(entries.length, 20);
    try {
        do {
            page = unwrap(await client.rpc("feed_timeline", { before_id: cursor }));
            next.push(...page);
            cursor = page.at(-1)?.id;
        } while (!older && page.length === 20 && next.length < target);
    } catch (error) {
        if (version === sessionVersion && request === requestVersion) {
            entries = [];
            $("feedTimeline").replaceChildren();
            $("feedLinkedActivity").replaceChildren();
        }
        throw error;
    }
    if (version !== sessionVersion || request !== requestVersion) return;
    const combined = older ? [...entries, ...next.filter(item => !entries.some(old => old.id === item.id))] : next;
    if (JSON.stringify(combined) !== JSON.stringify(entries) || !$("feedTimeline").children.length) {
        entries = combined;
        render();
    }
    $("feedMore").hidden = page.length < 20;
    try {
        await refreshLinked(version, request);
    } catch (error) {
        if (version === sessionVersion && request === requestVersion) $("feedLinkedActivity").replaceChildren();
        throw error;
    }
}
async function refreshLinked(version, request) {
    const activityId = new URLSearchParams(window.location.hash.slice(1)).get("activity");
    if (!activityId) { $("feedLinkedActivity").replaceChildren(); return; }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId)) {
        throw new Error("The activity link contains an invalid ID.");
    }
    const post = unwrap(await client.from("feed_posts").select("*").eq("id", activityId).maybeSingle());
    if (version !== sessionVersion || request !== requestVersion) return;
    if (!post) {
        $("feedLinkedActivity").replaceChildren();
        status("The linked activity is unavailable for your audience.", true);
    } else {
        const profile = unwrap(await client.from("feed_profiles").select("display_name").eq("user_id", post.owner_id).single());
        const count = await client.from("feed_likes").select("user_id", { head: true, count: "exact" }).eq("post_id", post.id);
        unwrap(count);
        const liked = user ? unwrap(await client.from("feed_likes").select("user_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()) : null;
        if (version !== sessionVersion || request !== requestVersion) return;
        const entry = {
            post, actor_id: post.owner_id, display_name: profile.display_name, created_at: post.created_at,
            kind: post.activity_type, likes: count.count, liked: !!liked
        };
        const signature = JSON.stringify(entry);
        const target = $("feedLinkedActivity");
        if (target.dataset.signature !== signature || !target.children.length) {
            const comment = target.querySelector(".feed-comment-input")?.value || "";
            const expanded = target.querySelector(".feed-comments")?.dataset.expanded === "true";
            const samePost = target.dataset.postId === post.id;
            const card = renderEntry(entry);
            target.replaceChildren(card);
            target.dataset.signature = signature;
            target.dataset.postId = post.id;
            if (samePost && card.querySelector(".feed-comment-input")) card.querySelector(".feed-comment-input").value = comment;
            if (samePost && expanded) await loadComments(post, card.querySelector(".feed-comments"));
        }
    }
}
async function loadFriends() {
    if (!user || !ready) return;
    const version = sessionVersion;
    const links = unwrap(await client.from("feed_friendships").select("*").order("created_at", { ascending: false }));
    const ids = links.map(link => link.requester === user.id ? link.recipient : link.requester);
    const names = ids.length ? unwrap(await client.from("feed_profiles").select("user_id,display_name").in("user_id", ids)) : [];
    if (version !== sessionVersion) return;
    $("feedFriends").replaceChildren();
    links.forEach(link => {
        const other = link.requester === user.id ? link.recipient : link.requester;
        const incoming = link.recipient === user.id;
        const row = element("div", "", "d-flex flex-wrap gap-2 align-items-center mb-2");
        row.append(element("span", `${names.find(name => name.user_id === other)?.display_name || other} - ${
            link.accepted ? "Friend" : incoming ? "Incoming request" : "Request sent"}`));
        const action = async kind => {
            unwrap(await client.rpc("feed_friend_action", { account_id: other, action: kind }));
            await loadFriends();
            await refresh();
        };
        if (!link.accepted && incoming) row.append(button("Accept", () => action("accept")));
        row.append(button(link.accepted ? "Remove friend" : incoming ? "Decline" : "Cancel request", () => action("remove")));
        $("feedFriends").append(row);
    });
    if (!links.length) $("feedFriends").append(element("p", "No account friends or requests yet."));
}
async function applySession(session) {
    const version = ++sessionVersion;
    user = session?.user || null;
    ready = false;
    entries = [];
    failures.clear();
    renderFailures();
    $("feedTimeline").replaceChildren();
    $("feedLinkedActivity").replaceChildren();
    $("feedFriends").replaceChildren();
    $("feedBody").value = "";
    $("feedDraftVerse").textContent = "";
    sourceId = null;
    verse = { reference: "", text: "" };
    composerType = "post";
    composerKey = crypto.randomUUID();
    $("feedComposeTitle").textContent = "Create a post";
    $("feedAccountCode").textContent = "";
    $("feedSignedIn").hidden = true;
    $("feedSignIn").hidden = !!user;
    if (channel) { await client.removeChannel(channel); channel = null; }
    if (version !== sessionVersion) return;
    if (user) {
        const profile = unwrap(await client.rpc("feed_settings"));
        if (version !== sessionVersion) return;
        $("feedName").value = profile.display_name;
        $("feedDefaultAudience").value = profile.default_audience;
        $("feedAudience").value = profile.default_audience;
        $("feedAccountCode").textContent = user.id;
        $("feedSignedIn").hidden = false;
    }
    ready = true;
    await refresh();
    await loadFriends();
    if (version !== sessionVersion) return;
    channel = client.channel(`home-feed-${version}`);
    for (const table of ["feed_posts", "feed_events", "feed_comments", "feed_likes", "feed_friendships"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => run(async () => { await refresh(); await loadFriends(); }), 150);
        });
    }
    channel.subscribe(state => {
        if (version !== sessionVersion) return;
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(state)) {
            status("Live updates disconnected. The feed still refreshes every 10 seconds.", true);
        } else if (state === "SUBSCRIBED") {
            status(user ? "Live feed connected. Automatic activities use your saved default audience." :
                "Public activities only. Sign in to post and interact.");
        }
    });
}

$("feedComposer").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
        signedIn();
        $("feedPublish").disabled = true;
        const activity = {
            type: composerType, eventKey: composerKey, body: $("feedBody").value,
            audience: $("feedAudience").value, commentsEnabled: $("feedCommentsEnabled").checked,
            reference: verse.reference, text: verse.text, sourceId
        };
        try {
            await publish(activity);
        } finally { $("feedPublish").disabled = false; }
    });
});
["feedBody", "feedAudience", "feedCommentsEnabled"].forEach(id => {
    $(id).addEventListener("input", () => { composerKey = crypto.randomUUID(); });
});
$("feedCancelDraft").addEventListener("click", () => draft("post"));
$("feedSettings").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
        signedIn();
        unwrap(await client.rpc("feed_settings", {
            display_name: $("feedName").value, audience: $("feedDefaultAudience").value
        }));
        $("feedAudience").value = $("feedDefaultAudience").value;
        status("Profile and default audience saved. Existing activities keep their own audience.");
        await refresh();
    });
});
$("feedFriendRequest").addEventListener("submit", event => {
    event.preventDefault();
    run(async () => {
        signedIn();
        unwrap(await client.rpc("feed_friend_action", { account_id: $("feedFriendCode").value.trim(), action: "request" }));
        $("feedFriendCode").value = "";
        await loadFriends();
        status("Friend request processed. Friends Only requires an accepted request.");
    });
});
$("feedRefresh").addEventListener("click", () => run(() => refresh()));
$("feedMore").addEventListener("click", () => run(() => refresh(true)));
$("feedReconnect").addEventListener("click", () => run(connect));
window.addEventListener("hashchange", () => run(() => refresh()));
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && client) run(async () => { await refresh(); await loadFriends(); });
});
setInterval(() => {
    if (!document.hidden && client && ready) run(async () => { await refresh(); await loadFriends(); });
}, 10000);
async function connect() {
    client = await connectSupabase();
    authSubscription?.unsubscribe();
    authSubscription = client.auth.onAuthStateChange((_event, next) => {
        if (_event === "INITIAL_SESSION") return;
        if (ready && next?.user?.id === user?.id) return;
        // Do not call SDK operations inside its auth callback lock.
        setTimeout(() => run(() => applySession(next)), 0);
    }).data.subscription;
    const session = unwrap(await client.auth.getSession()).session;
    await applySession(session);
}
run(connect);
