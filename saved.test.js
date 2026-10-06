import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { publishActivity } from "./feed-publisher.js";

function harness(initial = null, fail = false) {
    let saved = initial;
    const events = [];
    const window = { dispatchEvent: event => events.push(event) };
    vm.runInNewContext(readFileSync(new URL("./saved-store.js", import.meta.url), "utf8"), {
        window, Date, console: { error() {} },
        CustomEvent: class { constructor(type) { this.type = type; } },
        localStorage: { getItem: () => saved, setItem: (_key, value) => {
            if (fail) throw new Error("Storage unavailable");
            saved = value;
        } }
    });
    return { store: window.SavedStore, saved: () => saved, events };
}
test("all eight Saved types persist, deduplicate and remove without affecting other items", () => {
    const app = harness();
    for (const type of ["note", "highlight", "verse", "image", "plan", "video", "event", "prayer"]) {
        const item = {
            type, id: type === "event" ? "00000000-0000-4000-8000-000000000001" : "item",
            title: "Title", body: "Content"
        };
        if (type === "image") item.image = "images/verses/psalm-23-1.png";
        app.store.add(item);
        app.store.add(item);
    }
    assert.equal(app.store.list().length, 8);
    assert.equal(harness(app.saved()).store.list().length, 8);
    app.store.remove("plan", "item");
    assert.equal(app.store.has("plan", "item"), false);
    assert.equal(app.store.has("verse", "item"), true);
    assert.equal(app.store.list().length, 7);
    assert.equal(app.events.at(-1).type, "saved-items-updated");
});
test("saved events retain bookmark IDs but never restricted feed content", () => {
    const app = harness();
    app.store.add({
        type: "event", id: "00000000-0000-4000-8000-000000000001",
        title: "Secret event", body: "Private details", reference: "Sensitive", eventAt: new Date().toISOString(),
        details: "Restricted extra fields"
    });
    assert.doesNotMatch(app.saved(), /Secret event|Private details|Sensitive|eventAt|Restricted extra fields/);
    assert.equal(app.store.list()[0].title, "Saved event");
});
test("corrupt and failed saves are explicit and preserve previous state", () => {
    assert.throws(() => harness("{").store.list(), { name: "SyntaxError" });
    const valid = harness();
    valid.store.add({ type: "verse", id: "v", title: "Verse" });
    const failed = harness(valid.saved(), true);
    assert.throws(() => failed.store.add({ type: "note", id: "n", title: "Note" }), /Storage unavailable/);
    assert.equal(failed.saved(), valid.saved());
    assert.equal(failed.events.length, 0);
    assert.throws(() => valid.store.add({ type: "image", id: "x", title: "Image", image: "https://example.com/x.png" }), /posted verse images/);
});
test("save button reflects durable state and never claims success on storage failure", () => {
    const createButton = () => ({
        attributes: {}, setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(_type, fn) { this.click = fn; }
    });
    const feedback = {};
    const app = harness();
    const button = createButton();
    app.store.attach(button, { type: "video", id: "vid", title: "Video" }, feedback);
    assert.equal(button.textContent, "Save video");
    button.click();
    assert.equal(button.textContent, "Remove from saved");
    assert.equal(button.attributes["aria-pressed"], "true");
    button.click();
    assert.equal(app.store.has("video", "vid"), false);
    const failure = harness(null, true);
    failure.store.attach(button, { type: "video", id: "vid", title: "Video" }, feedback);
    button.click();
    assert.match(feedback.textContent, /Could not update/);
    assert.equal(button.textContent, "Save video");
});
test("Saved tab follows Activity, all producer surfaces load the store and plan links use real catalog", () => {
    const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
    const html = read("./profile.html");
    assert.match(html, /id="tab-activity"[\s\S]*?id="tab-saved"[\s\S]*?id="tab-posts"/);
    for (const page of ["index.html", "profile.html", "videos.html", "discover.html", "watch.html"]) {
        assert.match(read(`./${page}`), /src="saved-store.js"/);
    }
    const saved = read("./profile-saved.js");
    for (const title of ["Notes", "Highlights", "Verses", "Images", "Plans", "Video", "Events", "Prayer"]) {
        assert.ok(saved.includes(`["${title}"`));
    }
    assert.doesNotMatch(saved, /innerHTML/);
    assert.match(saved, /Start a plan/);
    assert.match(saved, /Remove from saved/);
    assert.match(read("./index.js"), /params\.get\("plan"\)/);
});

test("dated event publishing uses the event RPC with explicit ownership, audience and comments", async () => {
    let call;
    const client = { rpc: async (name, args) => {
        call = { name, args };
        return { data: "event-id" };
    } };
    assert.equal(await publishActivity(client, {
        type: "event", eventKey: "key", body: "Bible study",
        eventAt: "2027-01-02T10:30:00.000Z", audience: "friends", commentsEnabled: false
    }, "owner"), "event-id");
    assert.deepEqual(call, { name: "feed_publish_event", args: {
        event_key: "key", body: "Bible study", event_at: "2027-01-02T10:30:00.000Z",
        audience: "friends", comments_enabled: false, expected_owner: "owner"
    } });
    await assert.rejects(() => publishActivity({
        rpc: async () => ({ error: { message: "Choose a future event date and time." } })
    }, { type: "event" }, "owner"), /future event date/);
});
