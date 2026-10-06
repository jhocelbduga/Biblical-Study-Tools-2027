import { connectSupabase } from "./supabase-client.js";

let client;
let version = 0;
const feedback = document.getElementById("savedFeedback");
function clear() {
    for (const target of document.querySelectorAll("[data-saved-event-id]")) {
        target.replaceChildren();
    }
}
async function refresh() {
    const request = ++version;
    clear();
    const ids = [...new Set([...document.querySelectorAll("[data-saved-event-id]")].map(node => node.dataset.savedEventId))];
    if (!ids.length) return;
    try {
        if (!client) {
            client = await connectSupabase();
            client.auth.onAuthStateChange(event => {
                if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
                ++version;
                clear();
                setTimeout(refresh, 0);
            });
        }
        const events = [];
        for (let offset = 0; offset < ids.length; offset += 50) {
            const result = await client.from("feed_posts").select("id,body,event_at,audience")
                .eq("activity_type", "event").in("id", ids.slice(offset, offset + 50));
            if (result.error) throw new Error(result.error.message);
            events.push(...result.data);
        }
        if (request !== version) return;
        for (const target of document.querySelectorAll("[data-saved-event-id]")) {
            const event = events.find(item => item.id === target.dataset.savedEventId);
            const text = document.createElement("p");
            text.className = "small feed-content";
            text.textContent = event ? `${event.body}\n${new Date(event.event_at).toLocaleString()} | ${
                { public: "Public", friends: "Friends Only", private: "Private" }[event.audience]}` :
                "Event unavailable for your current audience, or removed.";
            target.append(text);
        }
    } catch (error) {
        if (request !== version) return;
        clear();
        feedback.textContent = `Saved event details unavailable: ${error.message}`;
        console.error("Unable to load saved events:", error);
    }
}
window.addEventListener("saved-library-rendered", refresh);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 10000);
refresh();
