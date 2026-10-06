import { connectSupabase } from "./supabase-client.js";

const list = document.getElementById("upcomingEventList");
const feedback = document.getElementById("upcomingEventStatus");
const more = document.getElementById("upcomingEventsMore");
const refresh = document.getElementById("upcomingEventsRefresh");
let client;
let channel;
let version = 0;
let entries = [];
let active = false;
function node(tag, text = "", className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
}
function report(error) {
    feedback.textContent = error.message;
    console.error("Upcoming events unavailable:", error);
}
function unwrap(result) {
    if (result.error) throw new Error(result.error.message);
    return result.data;
}
function render() {
    list.replaceChildren();
    entries.forEach(event => {
        const card = node("article", "", "card p-3 mb-2");
        card.append(node("h3", event.body, "h6 feed-content"),
            node("p", `${event.display_name} | ${new Date(event.event_at).toLocaleString()} | ${
                { public: "Public", friends: "Friends Only", private: "Private" }[event.audience]}`, "small"));
        const open = node("a", "View event", "btn btn-outline-primary btn-sm");
        open.href = `index.html#activity=${event.id}`;
        const save = node("button", "", "btn btn-outline-secondary btn-sm mt-2");
        save.type = "button";
        window.SavedStore.attach(save, { type: "event", id: event.id, title: "Saved event" }, feedback);
        card.append(open, save);
        list.append(card);
    });
    if (!entries.length) list.append(node("p", "No upcoming events visible to your current audience."));
}
async function load(older = false) {
    const request = ++version;
    try {
        if (!client) client = await connectSupabase();
        let last = older ? entries.at(-1) : null;
        const next = [];
        let page;
        const target = older ? 50 : Math.max(entries.length, 50);
        do {
            page = unwrap(await client.rpc("feed_upcoming", {
                after_time: last?.event_at || null, after_id: last?.id || null
            }));
            next.push(...page);
            last = page.at(-1);
        } while (!older && page.length === 50 && next.length < target);
        if (request !== version) return;
        entries = older ? [...entries, ...next.filter(event => !entries.some(old => old.id === event.id))] : next;
        render();
        more.hidden = page.length < 50;
        feedback.textContent = "Upcoming Home Feed events. Saved event bookmarks retain IDs only.";
    } catch (error) {
        if (request === version) { entries = []; list.replaceChildren(); more.hidden = true; }
        throw error;
    }
}
async function start() {
    await load();
    if (active) return;
    active = true;
    client.auth.onAuthStateChange(event => {
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
        ++version;
        entries = [];
        list.replaceChildren();
        setTimeout(() => load().catch(report), 0);
    });
    channel = client.channel("upcoming-saved-events").on("postgres_changes",
        { event: "*", schema: "public", table: "feed_posts" }, () => load().catch(report));
    channel.subscribe(state => {
        if (["CHANNEL_ERROR", "TIMED_OUT"].includes(state)) feedback.textContent = "Live events disconnected. Refresh checks permissions every 10 seconds.";
    });
}
refresh.addEventListener("click", () => start().catch(report));
more.addEventListener("click", () => load(true).catch(report));
setInterval(() => {
    if (active && !document.hidden) load().catch(report);
}, 10000);
document.addEventListener("visibilitychange", () => {
    if (active && !document.hidden) load().catch(report);
});
start().catch(report);
