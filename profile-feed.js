import { connectSupabase } from "./supabase-client.js";
import { publishActivity } from "./feed-publisher.js";

const status = document.getElementById("profileFeedStatus");
const retries = document.getElementById("profileFeedRetries");
let client;
let owner;
const pending = new Map();
function report(error) {
    console.error("Profile feed operation failed:", error);
    status.textContent = error.message;
}
function renderRetries() {
    retries.replaceChildren();
    pending.forEach((activity, key) => {
        const row = document.createElement("div");
        row.className = "alert alert-warning";
        row.textContent = `Post saved locally but not published: ${activity.body} `;
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "btn btn-outline-primary btn-sm";
        retry.textContent = "Retry";
        retry.addEventListener("click", () => publish(activity).catch(report));
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.className = "btn btn-outline-secondary btn-sm ms-2";
        dismiss.textContent = "Dismiss";
        dismiss.addEventListener("click", () => { pending.delete(key); renderRetries(); });
        row.append(retry, dismiss);
        retries.append(row);
    });
}
async function publish(activity) {
    const account = owner;
    if (!client || !account) {
        status.textContent = "Saved on this device only. Sign in and connect the feed before posting future updates.";
        return;
    }
    try {
        await publishActivity(client, activity, account);
        if (owner !== account) return;
        pending.delete(activity.eventKey);
        renderRetries();
        status.textContent = "Published to Home Feed with your selected audience. Deleting the local copy does not delete the shared activity.";
    } catch (error) {
        if (owner === account) { pending.set(activity.eventKey, activity); renderRetries(); }
        throw error;
    }
}
window.addEventListener("bst-activity", event => {
    publish(event.detail).catch(report);
});
async function sessionChanged(session) {
    owner = null;
    pending.clear();
    renderRetries();
    if (!session?.user) {
        status.textContent = "Sign in to publish new profile posts to Home Feed. Existing local posts are not uploaded.";
        return;
    }
    const account = session.user.id;
    const result = await client.rpc("feed_settings");
    if (result.error) throw new Error(result.error.message);
    const current = await client.auth.getSession();
    if (current.error) throw new Error(current.error.message);
    if (current.data.session?.user.id !== account) return;
    owner = account;
    status.textContent = "New posts will also appear in Home Feed with the selected audience.";
}
try {
    client = await connectSupabase();
    client.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || session?.user.id === owner) return;
        owner = null;
        pending.clear();
        renderRetries();
        setTimeout(() => sessionChanged(session).catch(report), 0);
    });
    const result = await client.auth.getSession();
    if (result.error) throw new Error(result.error.message);
    await sessionChanged(result.data.session);
} catch (error) { report(error); }
