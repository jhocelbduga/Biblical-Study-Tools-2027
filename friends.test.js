import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function store() {
    let saved = JSON.stringify({
        id: "local-user", name: "Local User",
        church: { name: "Community Church" }, friends: [], activity: [], posts: []
    });
    let fail = false;
    const context = vm.createContext({
        window: {},
        document: { querySelectorAll: () => [] },
        localStorage: {
            getItem: () => saved,
            setItem(key, value) {
                if (fail) throw new Error("Storage full");
                saved = value;
            }
        }
    });
    vm.runInContext(readFileSync(new URL("./profile-store.js", import.meta.url), "utf8"), context);
    return { PS: context.window.ProfileStore, saved: () => JSON.parse(saved), fail: () => { fail = true; } };
}

test("local friends persist name, contact, and church affiliation", () => {
    const app = store();
    assert.equal(app.PS.addFriend({ name: " Jane ", contact: " jane@example.test ", church: " Community Church " }).status, "added");
    assert.equal(app.saved().friends[0].church, "Community Church");
    assert.equal(app.saved().friends[0].name, "Jane");
    assert.equal(app.saved().friends[0].contact, "jane@example.test");
});

test("duplicate, self, and invalid requests do not add friends", () => {
    const app = store();
    assert.equal(app.PS.addFriend({ name: "Jane", contact: "jane@example.test" }).status, "added");
    assert.equal(app.PS.addFriend({ name: "jane", contact: "JANE@example.test" }).status, "exists");
    assert.equal(app.PS.addFriend({ id: "local-user", name: "Me" }).status, "self");
    assert.equal(app.PS.addFriend({ name: " " }).status, "invalid");
    assert.equal(app.saved().friends.length, 1);
    assert.equal(app.PS.addFriend({ id: "remote-user", name: "Remote", church: "Community Church" }).status, "added");
    assert.equal(app.PS.addFriend({ id: "remote-user", name: "Remote" }).status, "exists");
});

test("failed friend saves report an error and preserve existing records", () => {
    const app = store();
    const before = app.saved();
    app.fail();
    assert.equal(app.PS.addFriend({ name: "Jane" }).status, "error");
    assert.deepEqual(app.saved(), before);
});

test("friend invitation roundtrips identity and church without contact details", () => {
    const context = vm.createContext({
        window: { location: { hostname: "", protocol: "file:", href: "file:///discover.html" } },
        document: { addEventListener() {} },
        URL, TextEncoder, TextDecoder, btoa, atob
    });
    vm.runInContext(readFileSync(new URL("./qr-share.js", import.meta.url), "utf8"), context);
    const qr = context.window.QrShare;
    const url = new URL(qr.friendLink({
        id: "local-user", name: "Jane", church: { name: "Community Church" }, contact: "private@example.test"
    }));
    assert.equal(url.origin, "https://biblical-study-tools-2027.onrender.com");
    const data = qr.decode(url.searchParams.get("friend"));
    assert.equal(data.n, "Jane");
    assert.equal(data.i, "local-user");
    assert.equal(data.c, "Community Church");
    assert.ok(!url.href.includes("private"));
    assert.equal(qr.decode("invalid-qr"), null);
});
