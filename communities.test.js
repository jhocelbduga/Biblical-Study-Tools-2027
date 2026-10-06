import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

async function harness({ signedIn = true, configured = true, rpcError = false, failMutation = false, denyLocation = false } = {}) {
    const fields = new Map();
    const element = () => ({
        value: "", checked: false, dataset: {}, children: [], listeners: {},
        addEventListener(type, callback) { this.listeners[type] = callback; },
        append(...items) { this.children.push(...items); },
        appendChild(item) { this.children.push(item); },
        replaceChildren() { this.children = []; },
        querySelectorAll() { return this.children.flatMap(item => item.children.filter(child => child.type === "button")); },
        reportValidity: () => true,
        reset() {}
    });
    const document = {
        getElementById(id) {
            if (!fields.has(id)) fields.set(id, element());
            return fields.get(id);
        },
        createElement: element
    };
    document.getElementById("communityRadius").value = "25";
    let currentSession = signedIn ? { user: { id: "account-a" } } : null;
    let authListener;
    const calls = [];
    const rows = [
        { id: "one", owner_id: "account-a", name: "<script>Not HTML</script>", description: "Public Bible study group", city: "Town", member_count: 1, is_member: true, distance_km: null },
        { id: "two", owner_id: "account-b", name: "Another community", description: "Study Scripture together", city: "Town", member_count: 2, is_member: false, distance_km: 3.5 }
    ];
    const client = {
        auth: {
            getSession: async () => ({ data: { session: currentSession }, error: null }),
            onAuthStateChange(callback) { authListener = callback; }
        },
        async rpc(name, args) {
            calls.push({ name, args });
            if (rpcError || (failMutation && name !== "search_communities")) return { error: new Error("Database unavailable") };
            if (name === "join_community") rows[1].is_member = true;
            if (name === "leave_community") rows[1].is_member = false;
            return { data: name === "search_communities" ? rows : "new-id", error: null };
        }
    };
    const source = readFileSync(new URL("./communities.js", import.meta.url), "utf8")
        .replace('import { connectSupabase } from "./supabase-client.js";', "");
    await vm.runInNewContext(source, {
        document,
        connectSupabase: async () => {
            if (!configured) throw new Error("Accounts are not configured yet");
            return client;
        },
        navigator: {
            geolocation: {
                getCurrentPosition(success, failure) {
                    if (denyLocation) failure({ code: 1 });
                    else success({ coords: { latitude: 14.6, longitude: 121 } });
                }
            }
        },
        console: { error() {} },
        setTimeout: callback => callback()
    });
    return {
        field: id => document.getElementById(id), calls,
        signOut() { currentSession = null; authListener("SIGNED_OUT", null); },
        submit: () => document.getElementById("communitySearch").listeners.submit({ preventDefault() {} })
    };
}

test("unconfigured communities explicitly fail and disable backend-dependent controls", async () => {
    const app = await harness({ configured: false });
    assert.equal(app.field("communityFields").disabled, true);
    assert.equal(app.field("communitySearchFields").disabled, true);
    assert.match(app.field("communityFeedback").textContent, /not configured/);
    assert.equal(app.calls.length, 0);
});

test("public browsing renders text safely and requires sign-in for mutations", async () => {
    const app = await harness({ signedIn: false });
    assert.equal(app.field("communitySearchFields").disabled, false);
    assert.equal(app.field("communityFields").disabled, true);
    const card = app.field("communityResults").children[0];
    assert.equal(card.children[0].textContent, "<script>Not HTML</script>");
    assert.equal(card.children[3].disabled, true);
    assert.equal(app.calls[0].args.near_lat, null);
    assert.equal(app.calls[0].args.radius_km, 25);
});

test("signed-in users join and leave; owners cannot leave through the UI", async () => {
    const app = await harness();
    assert.equal(app.field("communityResults").children[0].children[3].disabled, true);
    await app.field("communityResults").children[1].children[3].listeners.click();
    assert.ok(app.calls.some(call => call.name === "join_community" && call.args.community_id === "two"));
    assert.equal(app.field("communityResults").children[1].children[3].textContent, "Leave community");
    await app.field("communityResults").children[1].children[3].listeners.click();
    assert.ok(app.calls.some(call => call.name === "leave_community"));
    app.signOut();
    assert.equal(app.field("communityFields").disabled, true);
});

test("nearby search passes coordinates and radius; clear removes only the nearby filter", async () => {
    const app = await harness();
    app.field("communityQuery").value = "Bible";
    app.field("communityRadius").value = "50";
    await app.field("communityNearMe").listeners.click();
    const near = app.calls.at(-1).args;
    assert.equal(near.near_lat, 14.6);
    assert.equal(near.near_lng, 121);
    assert.equal(near.radius_km, 50);
    assert.equal(near.search_text, "Bible");
    app.field("communityClearLocation").listeners.click();
    assert.equal(app.calls.at(-1).args.near_lat, null);
    assert.equal(app.calls.at(-1).args.search_text, "Bible");
});

test("denied location permission and database errors do not produce fake results", async () => {
    const denied = await harness({ denyLocation: true });
    await denied.field("communityNearMe").listeners.click();
    assert.match(denied.field("communityFeedback").textContent, /permission was denied/);
    const broken = await harness({ rpcError: true });
    assert.match(broken.field("communityFeedback").textContent, /Database unavailable/);
    assert.equal(broken.field("communityResults").children.length, 0);
});

test("creation uses account authorization from RPC and optional public venue only", async () => {
    const app = await harness();
    app.field("communityName").value = " Scripture friends ";
    app.field("communityDescription").value = "Weekly Bible study";
    app.field("communityCity").value = "Town";
    await app.field("communityCreate").listeners.submit({ preventDefault() {} });
    const create = app.calls.find(call => call.name === "create_community");
    assert.equal(create.args.community_name, "Scripture friends");
    assert.equal(create.args.meeting_lat, null);
    assert.equal(Object.hasOwn(create.args, "owner_id"), false);
    assert.match(app.field("communityCreateFeedback").textContent, /Community created/);
    assert.equal(app.field("communityJoinedOnly").checked, true);
});

test("membership and creation failures preserve state and never report successful creation", async () => {
    const app = await harness({ failMutation: true });
    await app.field("communityResults").children[1].children[3].listeners.click();
    assert.equal(app.field("communityResults").children[1].children[3].textContent, "Join community");
    assert.match(app.field("communityFeedback").textContent, /Membership could not be updated/);
    app.field("communityName").value = "Test community";
    await app.field("communityCreate").listeners.submit({ preventDefault() {} });
    assert.equal(app.field("communityName").value, "Test community");
    assert.equal(app.field("communityCreateFeedback").textContent, "");
    assert.match(app.field("communityFeedback").textContent, /Could not create/);
    assert.equal(app.field("communityFields").disabled, false);
});

test("meeting location is opt-in, passed only on creation, and removable", async () => {
    const app = await harness();
    await app.field("communityUseMeetingLocation").listeners.click();
    assert.match(app.field("communityMeetingStatus").textContent, /safe public venue/);
    await app.field("communityCreate").listeners.submit({ preventDefault() {} });
    const create = app.calls.find(call => call.name === "create_community");
    assert.equal(create.args.meeting_lat, 14.6);
    assert.equal(create.args.meeting_lng, 121);
    await app.field("communityUseMeetingLocation").listeners.click();
    app.field("communityRemoveMeetingLocation").listeners.click();
    await app.field("communityCreate").listeners.submit({ preventDefault() {} });
    assert.equal(app.calls.filter(call => call.name === "create_community").at(-1).args.meeting_lat, null);
});
