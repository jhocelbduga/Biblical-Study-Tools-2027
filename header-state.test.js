import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

async function harness({ session = null, subscribed = false, failAuth = false, failStorage = false, subscriptionPrompt = false } = {}) {
    const signIn = { hidden: false };
    const account = { hidden: true };
    const subscribe = { hidden: false };
    const feedback = {};
    const events = {};
    const fields = {};
    let modalShown = false;
    let authEvent;
    const context = {
        document: {
            querySelector: selector => selector === "[data-header-sign-in]" ? signIn : account,
            getElementById: id => id === "subscribeButton" ? subscribe : id === "headerStateFeedback" ? feedback : fields[id] ||= {}
        },
        window: { location: { search: subscriptionPrompt ? "?subscribe=1" : "", href: "https://app.example/index.html?subscribe=1" }, history: { replaceState() {} }, addEventListener: (type, callback) => { events[type] = callback; } },
        URLSearchParams, URL,
        bootstrap: { Modal: { getOrCreateInstance: () => ({ show() { modalShown = true; } }) } },
        console: { error() {} },
        localStorage: {
            getItem() {
                if (failStorage) throw new Error("Storage blocked");
                return subscribed ? "1" : null;
            }
        },
        connectSupabase: async () => {
            if (failAuth) throw new Error("Backend unavailable");
            return { auth: {
                onAuthStateChange(callback) { authEvent = callback; },
                getSession: async () => ({ data: { session }, error: null })
            } };
        }
    };
    const source = readFileSync(new URL("./header-state.js", import.meta.url), "utf8")
        .replace('import { connectSupabase } from "./supabase-client.js";', "");
    await vm.runInNewContext(source, context);
    return { signIn, account, subscribe, feedback, events, fields, modalShown: () => modalShown, auth: next => authEvent("SIGNED_IN", next), setSubscribed: next => { subscribed = next; } };
}

test("login hides Sign in without hiding Subscribe; logout restores Sign in", async () => {
    const app = await harness({ session: { user: { id: "one" } } });
    assert.equal(app.signIn.hidden, true);
    assert.equal(app.account.hidden, false);
    assert.equal(app.subscribe.hidden, false);
    app.auth(null);
    assert.equal(app.signIn.hidden, false);
    assert.equal(app.account.hidden, true);
});

test("subscription hides Subscribe independently of login and persists on initialization", async () => {
    const app = await harness({ subscribed: true });
    assert.equal(app.subscribe.hidden, true);
    assert.equal(app.signIn.hidden, false);
    const fresh = await harness();
    fresh.events["subscription-status-updated"]();
    assert.equal(fresh.subscribe.hidden, true);
    fresh.setSubscribed(true);
    fresh.events.storage({ key: "bstSubscribed" });
    assert.equal(fresh.subscribe.hidden, true);
    fresh.setSubscribed(false);
    fresh.events.storage({ key: null });
    assert.equal(fresh.subscribe.hidden, false);
});

test("unavailable account or storage status leaves action buttons available and shows errors", async () => {
    const app = await harness({ failAuth: true });
    assert.equal(app.signIn.hidden, false);
    assert.equal(app.subscribe.hidden, false);
    assert.match(app.feedback.textContent, /Account status unavailable/);
    const storage = await harness({ failStorage: true });
    assert.equal(storage.subscribe.hidden, false);
    assert.match(storage.feedback.textContent, /subscription status could not be loaded/);
});

test("only successful subscription requests publish the hide-button event, even if local persistence fails", async () => {
    const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
    const functionSource = source.slice(source.indexOf("function initialiseSubscription()"), source.indexOf("function initialiseNotifications()"));
    for (const [ok, failSave, expectedEvents] of [[true, false, 1], [true, true, 1], [false, false, 0]]) {
        let submit;
        let events = 0;
        const feedback = {};
        const button = {};
        const form = {
            reportValidity: () => true, reset() {},
            elements: { name: { value: "Test" }, email: { value: "test@example.test" }, contact: { value: "123" } },
            addEventListener(type, callback) { submit = callback; }
        };
        vm.runInNewContext(`${functionSource}\ninitialiseSubscription();`, {
            SUBSCRIBED_KEY: "bstSubscribed",
            document: { getElementById: id => id === "subscribeForm" ? form : id === "subscribeFeedback" ? feedback : button },
            window: { dispatchEvent() { events++; } },
            CustomEvent: class {}, console: { error() {} },
            fetch: async () => ({ ok, json: async () => ({ message: "Check your email", error: "Request failed" }) }),
            localStorage: { setItem() { if (failSave) throw new Error("Storage full"); } }
        });

        await submit({ preventDefault() {} });
        assert.equal(events, expectedEvents);
        if (failSave) assert.match(feedback.textContent, /request succeeded.*could not be saved/);
        assert.equal(button.disabled, false);
    }
});

test("optional subscription link opens the form with account details but makes no subscription request", async () => {
    const app = await harness({
        subscriptionPrompt: true,
        session: { user: { email: "test@example.test", user_metadata: { full_name: "Test Person" } } }
    });
    assert.equal(app.modalShown(), true);
    assert.equal(app.fields.subscriberEmail.value, "test@example.test");
    assert.equal(app.fields.subscriberName.value, "Test Person");
    assert.equal(app.subscribe.hidden, false);
    const subscribedApp = await harness({ subscriptionPrompt: true, subscribed: true });
    assert.equal(subscribedApp.modalShown(), false);
});
