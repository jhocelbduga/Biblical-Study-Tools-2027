import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { publishActivity } from "./feed-publisher.js";

const read = file => readFileSync(new URL(file, import.meta.url), "utf8");

test("activity bus validates types, preserves retry keys and supports extensions", () => {
    const events = [];
    const window = { dispatchEvent: event => events.push(event) };
    vm.runInNewContext(read("./activity-events.js"), {
        window, crypto: { randomUUID: () => "event-key" },
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
    });
    for (const type of ["achievement", "completion", "verse_shared", "reflection", "post"]) {
        assert.equal(window.ActivityEvents.emit(type, { body: "Content" }), "event-key");
    }
    assert.equal(events[0].type, "bst-activity");
    assert.equal(events[0].detail.type, "achievement");
    assert.equal(window.ActivityEvents.emit("post", { body: "Retry", eventKey: "same-key" }), "same-key");
    assert.throws(() => window.ActivityEvents.emit("unknown", {}), /Unsupported/);
    assert.throws(() => window.ActivityEvents.register("not valid"), /Invalid/);
    window.ActivityEvents.register("community_joined");
    window.ActivityEvents.emit("community_joined", { body: "Joined" });
    assert.equal(events.at(-1).detail.type, "community_joined");
});

test("achievements emit only after durable save and do not backfill unannounced records", () => {
    const posted = [];
    const fields = {};
    let fail = false;
    const window = {
        ActivityEvents: { emit: (type, body) => posted.push({ type, ...body }) },
        dispatchEvent() {}
    };
    vm.runInNewContext(read("./plan-milestones.js"), {
        window, console: { error() {} }, CustomEvent: class {},
        document: {
            getElementById: id => fields[id] ||= { textContent: "", replaceChildren() {}, appendChild() {} },
            createElement: () => ({})
        },
        localStorage: { getItem: () => null, setItem() { if (fail) throw new Error("Storage full"); } }
    });
    fail = true;
    window.PlanMilestones.update({ days: 1, passages: 1, plans: 0 });
    assert.equal(posted.length, 0);
    fail = false;
    window.PlanMilestones.update({ days: 1, passages: 1, plans: 0 });
    assert.equal(posted.length, 2);
    assert.ok(posted.every(item => item.type === "achievement"));
    window.PlanMilestones.update({ days: 1, passages: 1, plans: 0 });
    assert.equal(posted.length, 2);
    window.PlanMilestones.update({ days: 7, passages: 10, plans: 0 }, false);
    assert.equal(posted.length, 2);
});

function completionHarness({ savedIndices = [], fail = false, confirm = true } = {}) {
    const source = read("./index.js");
    const start = source.indexOf("    function confirmCompletionChange(");
    const end = source.indexOf('\n    document.getElementById("readingPassages")', start);
    const posts = [];
    const plan = { title: "Test plan", days: [{ readings: ["Genesis 1", "Genesis 2"] }] };
    const progress = { currentDay: 1, completedDays: [], completedReadings: { 1: savedIndices } };
    const context = {
        state: { activePlanId: "test", plans: { test: progress } }, READING_PLANS: { test: plan },
        selectedPlanId: null, storageWarning: "", feedback: {}, READING_PLAN_STORAGE_KEY: "test",
        updatedReadingProgress: (_plan, old, _day, indices) => ({ ...old, completedReadings: { 1: indices } }),
        completedReadingIndices: (_plan, old) => old.completedReadings[1],
        getLocalDateKey: () => "2026-10-06", renderPlan() {}, renderCatalog() {},
        window: { confirm: () => confirm, dispatchEvent() {}, ActivityEvents: { emit: (type, body) => posts.push({ type, ...body }) } },
        localStorage: { setItem() { if (fail) throw new Error("Full"); } },
        console: { error() {} }, CustomEvent: class {}
    };
    vm.createContext(context);
    vm.runInContext(`${source.slice(start, end)};this.complete = confirmCompletionChange;`, context);
    return { complete: context.complete, posts };
}
test("only newly completed passages emit activities, after successful save", () => {
    const normal = completionHarness({ savedIndices: [0] });
    normal.complete([0, 1]);
    assert.equal(normal.posts.length, 1);
    assert.equal(normal.posts[0].type, "completion");
    assert.match(normal.posts[0].body, /Genesis 2/);
    assert.doesNotMatch(normal.posts[0].body, /Genesis 1/);
    for (const options of [{ savedIndices: [0, 1] }, { fail: true }, { confirm: false }]) {
        const app = completionHarness(options);
        app.complete([0, 1]);
        assert.equal(app.posts.length, 0);
    }
    const undo = completionHarness({ savedIndices: [0, 1] });
    undo.complete([]);
    assert.equal(undo.posts.length, 0);
});
test("feed rendering uses text nodes and never caches shared service responses", () => {
    const feed = read("./feed.js");
    assert.doesNotMatch(feed, /innerHTML|insertAdjacentHTML/);
    assert.match(feed, /node\.textContent = text/);
    assert.match(feed, /sessionVersion/);
    assert.match(feed, /failures\.clear\(\)/);
    assert.match(feed, /comments_enabled/);
    assert.match(read("./service-worker.js"), /"\.\/feed.js"/);
    assert.match(read("./index.html"), /activity-events\.js[\s\S]*plan-milestones\.js[\s\S]*index\.js/);
    assert.match(read("./index.js"), /bst-feed-compose/);
});

async function clientHarness() {
    function node(tag = "div") {
        return {
            tag, textContent: "", value: "", children: [], dataset: {}, listeners: {}, isConnected: true,
            classList: { toggle() {} },
            setAttribute() {}, scrollIntoView() {}, focus() {},
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; },
            querySelectorAll: () => [], querySelector: () => null,
            addEventListener(type, fn) { this.listeners[type] = fn; }
        };
    }
    const fields = {};
    const listeners = {};
    const calls = [];
    const state = { failPublish: false, failTimeline: false, audience: "private", session: { user: { id: "owner" } } };
    const client = {
        auth: {
            getSession: async () => ({ data: { session: state.session } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
        },
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === "feed_settings") return { data: { display_name: "Reader", default_audience: state.audience } };
            if (name === "feed_timeline") return state.failTimeline ? { error: { message: "Feed disconnected" } } : { data: [] };
            if (name === "feed_publish" && state.failPublish) return { error: { message: "Network unavailable" } };
            return { data: "post-id" };
        },
        from: () => ({ select: () => ({ order: async () => ({ data: [] }) }) }),
        channel: () => ({ on() { return this; }, subscribe(fn) { fn("SUBSCRIBED"); } }),
        removeChannel: async () => {}
    };
    const window = {
        location: { hash: "", href: "http://localhost/" },
        addEventListener: (type, fn) => { listeners[type] = fn; },
        dispatchEvent: event => listeners[event.type]?.(event)
    };
    const context = {
        window, client, console: { error() {} }, URLSearchParams, URL, crypto,
        setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout() {}, setInterval() {},
        document: {
            hidden: false, addEventListener() {}, createElement: node,
            getElementById: id => fields[id] ||= node()
        },
        connectSupabase: async () => client, publishActivity,
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
    };
    vm.createContext(context);
    vm.runInContext(read("./activity-events.js"), context);
    vm.runInContext(read("./feed.js").replace(/^import .*;\r?\n/gm, "") +
        "\nthis.api = { publish, applySession, renderEntry, draft, refresh, get pending() { return failures.size; } };", context);
    const settle = async () => {
        await new Promise(resolve => setImmediate(resolve));
        await new Promise(resolve => setImmediate(resolve));
    };
    await settle();
    return { fields, calls, api: context.api, state, window, settle };
}
test("signed-in producer events publish with database default audience and retry the same key", async () => {
    const app = await clientHarness();
    app.state.failPublish = true;
    const key = app.window.ActivityEvents.emit("achievement", { body: "Milestone" });
    await app.settle();
    const failed = app.calls.find(call => call.name === "feed_publish");
    assert.equal(failed.args.event_key, key);
    assert.equal(failed.args.audience, null);
    assert.equal(app.api.pending, 1);
    assert.match(app.fields.feedStatus.textContent, /Network unavailable/);
    app.state.failPublish = false;
    await app.api.publish({ type: "achievement", body: "Milestone", eventKey: key });
    assert.equal(app.api.pending, 0);
    assert.equal(app.calls.filter(call => call.name === "feed_publish").at(-1).args.event_key, key);
});
test("sign-out and account switching clear private feed content, failed items and drafts", async () => {
    const app = await clientHarness();
    app.state.failPublish = true;
    app.window.ActivityEvents.emit("completion", { body: "Private progress" });
    await app.settle();
    app.fields.feedLinkedActivity.append({ textContent: "Private linked post" });
    app.fields.feedBody.value = "Private draft";
    await app.api.applySession(null);
    assert.equal(app.api.pending, 0);
    assert.equal(app.fields.feedBody.value, "");
    assert.equal(app.fields.feedLinkedActivity.children.length, 0);
    assert.equal(app.fields.feedSignedIn.hidden, true);
    const count = app.calls.filter(call => call.name === "feed_publish").length;
    app.window.ActivityEvents.emit("post", { body: "Signed out" });
    await app.settle();
    assert.equal(app.calls.filter(call => call.name === "feed_publish").length, count);
    assert.match(app.fields.feedStatus.textContent, /device-local/);
    await app.api.applySession({ user: { id: "different-owner" } });
    assert.equal(app.fields.feedAccountCode.textContent, "different-owner");
});
test("disabled-comment entries retain view controls and no new comment form", async () => {
    const app = await clientHarness();
    const entry = {
        id: 1, display_name: "<script>Reader</script>", kind: "post", created_at: new Date().toISOString(),
        likes: 0, liked: false, post: {
            id: "post", owner_id: "owner", audience: "private", body: "<b>Literal content</b>",
            comments_enabled: false, activity_type: "post"
        }
    };
    const card = app.api.renderEntry(entry);
    function descendants(node) { return [node, ...node.children.flatMap(child => typeof child === "object" ? descendants(child) : [])]; }
    const all = descendants(card);
    assert.ok(all.some(node => node.textContent === "View comments"));
    assert.ok(all.some(node => node.textContent === "Enable comments"));
    assert.ok(all.some(node => node.textContent.includes("Existing comments remain available")));
    assert.ok(!all.some(node => node.tag === "form"));
    assert.ok(!all.some(node => node.textContent === "Share link"), "Private activity cannot be externally shared");
    assert.ok(all.some(node => node.textContent === "<b>Literal content</b>"));
    entry.post.comments_enabled = true;
    assert.ok(descendants(app.api.renderEntry(entry)).some(node => node.tag === "form"));
});

test("shared publisher preserves audience, comment setting, source and intended account", async () => {
    let supplied;
    const client = { rpc: async (name, args) => {
        assert.equal(name, "feed_publish");
        supplied = args;
        return { data: "post-id" };
    } };
    const result = await publishActivity(client, {
        type: "reflection", eventKey: "retry-key", body: "Reflection",
        audience: "friends", commentsEnabled: false, reference: "Psalm 23:1",
        text: "The LORD is my shepherd", sourceId: "source"
    }, "original-owner");
    assert.equal(result, "post-id");
    assert.deepEqual(supplied, {
        activity_type: "reflection", event_key: "retry-key", body: "Reflection",
        audience: "friends", comments_enabled: false, verse_reference: "Psalm 23:1",
        verse_text: "The LORD is my shepherd", source_id: "source", expected_owner: "original-owner"
    });
    await assert.rejects(() => publishActivity({
        rpc: async () => ({ error: { message: "Account changed" } })
    }, { type: "post", body: "Post" }, "original-owner"), /Account changed/);
});
test("failed authorization refresh clears both timeline and directly linked content", async () => {
    const app = await clientHarness();
    app.fields.feedTimeline.append({ textContent: "Previously authorized private activity" });
    app.fields.feedLinkedActivity.append({ textContent: "Previously authorized linked activity" });
    app.state.failTimeline = true;
    await assert.rejects(() => app.api.refresh(), /Feed disconnected/);
    assert.equal(app.fields.feedTimeline.children.length, 0);
    assert.equal(app.fields.feedLinkedActivity.children.length, 0);
});
test("composer submissions reuse the event key after failure, but new successful posts get new keys", async () => {
    const app = await clientHarness();
    app.fields.feedBody.value = "Draft";
    app.fields.feedAudience.value = "private";
    app.fields.feedCommentsEnabled.checked = false;
    app.state.failPublish = true;
    app.fields.feedComposer.listeners.submit({ preventDefault() {} });
    await app.settle();
    const first = app.calls.filter(call => call.name === "feed_publish").at(-1).args.event_key;
    app.state.failPublish = false;
    app.fields.feedComposer.listeners.submit({ preventDefault() {} });
    await app.settle();
    assert.equal(app.calls.filter(call => call.name === "feed_publish").at(-1).args.event_key, first);
    assert.equal(app.fields.feedBody.value, "");
    app.fields.feedBody.value = "Next post";
    app.fields.feedComposer.listeners.submit({ preventDefault() {} });
    await app.settle();
    assert.notEqual(app.calls.filter(call => call.name === "feed_publish").at(-1).args.event_key, first);
});
test("profile posts emit only after successful local save, with per-item privacy", () => {
    const source = read("./profile.js");
    const start = source.indexOf('    $("postForm").addEventListener("submit"');
    const end = source.indexOf('\n    $("postList")', start);
    const fields = {
        postForm: { addEventListener: (_type, fn) => { fields.submit = fn; } },
        postText: { value: "Profile update" }, profilePostAudience: { value: "friends" },
        profilePostComments: { checked: false }, profileFeedStatus: {}
    };
    const events = [];
    let success = false;
    vm.runInNewContext(source.slice(start, end), {
        $: id => fields[id], profile: {}, renderAll() {}, console: { error() {} },
        PS: { addPost: () => success, addActivity() {}, load: () => ({}) },
        window: { ActivityEvents: { emit: (type, content) => events.push({ type, ...content }) } }
    });
    fields.submit({ preventDefault() {} });
    assert.equal(events.length, 0);
    assert.match(fields.profileFeedStatus.textContent, /could not be saved/);
    success = true;
    fields.submit({ preventDefault() {} });
    assert.deepEqual(events[0], { type: "post", body: "Profile update", audience: "friends", commentsEnabled: false });
    assert.match(read("./profile.html"), /profile-feed\.js/);
});
