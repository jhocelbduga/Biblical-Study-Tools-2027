import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { getPublicAuthConfig } from "./auth-config.js";

test("only public project configuration is returned", () => {
    const config = getPublicAuthConfig({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
        SUPABASE_SERVICE_ROLE_KEY: "must-not-be-exposed"
    });
    assert.deepEqual(config, { url: "https://example.supabase.co", publishableKey: "sb_publishable_test-key" });
});

test("missing, non-HTTPS, malformed, and secret-key configurations are rejected", () => {
    for (const env of [
        {},
        { SUPABASE_URL: "http://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" },
        { SUPABASE_URL: "https://user:pass@example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" },
        { SUPABASE_URL: "https://example.supabase.co/path", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" },
        { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" },
        { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "service-role-jwt" }
    ]) assert.throws(() => getPublicAuthConfig(env));
});

async function harness({ configured = true, failAuth = false, hash = "", subscribed = false } = {}) {
    const elements = new Map();
    const buttons = ["login", "register", "reset"].map(mode => ({
        dataset: { accountMode: mode }, listeners: {},
        addEventListener(type, fn) { this.listeners[type] = fn; }, setAttribute() {}
    }));
    const providers = ["google", "facebook"].map(provider => ({
        dataset: { authProvider: provider }, listeners: {},
        addEventListener(type, callback) { this.listeners[type] = callback; }
    }));
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                value: "", listeners: {}, hidden: false,
                addEventListener(type, fn) { this.listeners[type] = fn; },
                setCustomValidity(value) { this.validation = value; },
                reportValidity() {}, reset() {}
            });
            return elements.get(id);
        },
        querySelectorAll: selector => selector === "[data-auth-provider]" ? providers : buttons
    };
    const calls = [];
    let redirect;
    let callback;
    const auth = {
        onAuthStateChange(fn) { callback = fn; },
        async getSession() { return { data: { session: null }, error: null }; }
    };
    auth.signInWithOAuth = async options => {
        calls.push({ method: "signInWithOAuth", options });
        return failAuth ? { error: new Error("Provider is not enabled") }
            : { data: { url: "https://example.supabase.co/auth/v1/authorize" }, error: null };
    };
    for (const method of ["signUp", "signInWithPassword", "resetPasswordForEmail", "updateUser", "signOut"]) {
        auth[method] = async options => {
            calls.push({ method, options });
            if (failAuth) return { error: new Error("Authentication rejected") };
            const session = { user: { email: "test@example.test" } };
            if (method === "signInWithPassword") callback("SIGNED_IN", session);
            if (method === "signOut") callback("SIGNED_OUT", null);
            return { data: { session: method === "signUp" ? null : session }, error: null };
        };
    }
    const context = vm.createContext({
        document, URL, URLSearchParams,
        window: {
            location: { protocol: "https:", href: "https://app.example/account.html", search: "", hash, pathname: "/account.html", assign(url) { redirect = url; } },
            history: { replaceState() {} }
        },
        console: { error() {} },
        localStorage: { getItem: () => subscribed ? "1" : null },
        fetch: async () => ({
            ok: configured,
            headers: { get: () => "application/json" },
            json: async () => configured
                ? { url: "https://example.supabase.co", publishableKey: "sb_publishable_test" }
                : { error: "Accounts are not configured yet." }
        }),
        loadSdk: async () => ({ createClient: () => ({ auth }) })
    });
    const connector = readFileSync(new URL("./supabase-client.js", import.meta.url), "utf8")
        .replace("export function", "function")
        .replace('import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm")', "loadSdk()");
    const source = readFileSync(new URL("./account.js", import.meta.url), "utf8")
        .replace('import { connectSupabase } from "./supabase-client.js";', "");
    await vm.runInContext(`${connector}\n${source}`, context);
    const field = id => document.getElementById(id);
    return {
        field, calls,
        mode: mode => buttons.find(button => button.dataset.accountMode === mode).listeners.click(),
        submit: () => field("accountForm").listeners.submit({ preventDefault() {} }),
        event: (event, session) => callback(event, session),
        provider: name => providers.find(button => button.dataset.authProvider === name),
        redirect: () => redirect
    };
}

test("missing config disables account operations and reports unavailability", async () => {
    const app = await harness({ configured: false });
    assert.equal(app.field("accountFields").disabled, true);
    assert.match(app.field("accountFeedback").textContent, /not configured/);
    await app.submit();
    assert.equal(app.calls.length, 0);
});

test("registration validates confirmation and requests a confirmation email", async () => {
    const app = await harness();
    app.mode("register");
    app.field("accountName").value = "Test User";
    app.field("accountEmailInput").value = "test@example.test";
    app.field("accountPassword").value = "a-long-test-password";
    app.field("accountConfirmPassword").value = "does-not-match";
    await app.submit();
    assert.equal(app.calls.length, 0);
    assert.equal(app.field("accountConfirmPassword").validation, "Passwords must match.");
    app.field("accountConfirmPassword").value = "a-long-test-password";
    await app.submit();
    assert.equal(app.calls[0].method, "signUp");
    assert.equal(app.calls[0].options.options.emailRedirectTo, "https://app.example/account.html");
    assert.match(app.field("accountFeedback").textContent, /confirm your account/);
    assert.equal(app.field("accountPassword").value, "");
});

test("login and local sign-out update account views", async () => {
    const app = await harness();
    app.field("accountEmailInput").value = "test@example.test";
    app.field("accountPassword").value = "test-password";
    await app.submit();
    assert.equal(app.calls[0].method, "signInWithPassword");
    assert.equal(app.field("signedInAccount").hidden, false);
    await app.field("signOutAccount").listeners.click();
    assert.equal(app.calls[1].method, "signOut");
    assert.equal(app.calls[1].options.scope, "local");
    assert.equal(app.field("signedInAccount").hidden, true);
});

test("password reset and recovery change the password only after verification", async () => {
    const app = await harness();
    app.mode("reset");
    app.field("accountEmailInput").value = "test@example.test";
    await app.submit();
    assert.equal(app.calls[0].method, "resetPasswordForEmail");
    assert.match(app.field("accountFeedback").textContent, /If this address/);
    app.event("PASSWORD_RECOVERY", { user: { email: "test@example.test" } });
    assert.equal(app.field("accountForms").hidden, false);
    assert.equal(app.field("accountEmailField").hidden, true);
    app.field("accountPassword").value = "a-new-long-password";
    app.field("accountConfirmPassword").value = "a-new-long-password";
    await app.submit();
    assert.equal(app.calls[1].method, "updateUser");
    assert.equal(app.field("accountForms").hidden, true);
    assert.match(app.field("accountFeedback").textContent, /password has been updated/);
});

test("authentication failures show errors without a successful login view", async () => {
    const app = await harness({ failAuth: true });
    await app.submit();
    assert.equal(app.field("accountFeedback").textContent, "Authentication rejected");
    assert.equal(app.field("signedInAccount").hidden, true);
    assert.equal(app.field("accountFields").disabled, false);
});

test("expired email links display the provider error rather than a ready message", async () => {
    const app = await harness({ hash: "#error=access_denied&error_description=Email+link+has+expired" });
    assert.equal(app.field("accountFeedback").textContent, "Email link has expired");
    assert.equal(app.field("signedInAccount").hidden, true);
});

test("service worker never intercepts account configuration for offline caching", () => {
    const listeners = {};
    vm.runInNewContext(readFileSync(new URL("./service-worker.js", import.meta.url), "utf8"), {
        URL,
        self: {
            location: { origin: "https://app.example" },
            addEventListener(event, handler) { listeners[event] = handler; }
        }
    });

    let intercepted = false;
    listeners.fetch({
        request: { method: "GET", url: "https://app.example/api/auth/config", mode: "cors" },
        respondWith() { intercepted = true; }
    });
    assert.equal(intercepted, false);
});

test("Google and Facebook request OAuth without automatically subscribing", async () => {
        for (const provider of ["google", "facebook"]) {
            const app = await harness();
            await app.provider(provider).listeners.click();
            assert.equal(app.calls.length, 1);
            assert.equal(app.calls[0].method, "signInWithOAuth");
            assert.equal(app.calls[0].options.provider, provider);
            assert.equal(app.calls[0].options.options.redirectTo, "https://app.example/account.html");
            assert.equal(app.calls[0].options.options.skipBrowserRedirect, true);
            assert.match(app.redirect(), /\/auth\/v1\/authorize$/);
            assert.equal(app.field("accountNewsletterPrompt").hidden, true);
            app.event("SIGNED_IN", { user: { email: "test@example.test" } });
            assert.equal(app.field("accountNewsletterPrompt").hidden, false);
        }
    });

test("provider errors are explicit and already-subscribed users do not see the newsletter prompt", async () => {
        const app = await harness({ failAuth: true });
        await app.provider("google").listeners.click();
        assert.equal(app.redirect(), undefined);
        assert.equal(app.field("accountFeedback").textContent, "Provider is not enabled");
        assert.equal(app.provider("google").disabled, false);
        const subscribedApp = await harness({ subscribed: true });
        subscribedApp.event("SIGNED_IN", { user: { email: "test@example.test" } });
        assert.equal(subscribedApp.field("accountNewsletterPrompt").hidden, true);
    });
