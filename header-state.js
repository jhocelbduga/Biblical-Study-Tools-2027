import { connectSupabase } from "./supabase-client.js";

const signIn = document.querySelector("[data-header-sign-in]");
const account = document.querySelector("[data-header-account]");
const subscribe = document.getElementById("subscribeButton");
const feedback = document.getElementById("headerStateFeedback");

function renderSubscription(subscribed) {
    if (subscribe) subscribe.hidden = subscribed;
}

function readSubscription() {
    if (!subscribe) return;
    try {
        renderSubscription(localStorage.getItem("bstSubscribed") === "1");
    } catch (error) {
        feedback.textContent = "Saved subscription status could not be loaded.";
        console.error("Unable to load header subscription status:", error);
    }
}

function renderSession(session) {
    signIn.hidden = Boolean(session);
    account.hidden = !session;
}

readSubscription();
window.addEventListener("subscription-status-updated", () => renderSubscription(true));
window.addEventListener("storage", event => {
    if (event.key === "bstSubscribed" || event.key === null) readSubscription();
});
window.addEventListener("pageshow", readSubscription);

async function initialize() {
    try {
        const client = await connectSupabase();
        client.auth.onAuthStateChange((event, session) => renderSession(session));
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        renderSession(data.session);
        if (subscribe && new URLSearchParams(window.location.search).get("subscribe") === "1") {
            if (!subscribe.hidden) {
                const user = data.session?.user;
                if (user?.email) document.getElementById("subscriberEmail").value = user.email;
                const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
                if (name) document.getElementById("subscriberName").value = name;
                bootstrap.Modal.getOrCreateInstance(document.getElementById("subscribeModal")).show();
            }
            const url = new URL(window.location.href);
            url.searchParams.delete("subscribe");
            window.history.replaceState({}, "", url.href);
        }
    } catch (error) {
        renderSession(null);
        feedback.textContent = "Account status unavailable. Open Sign in for details.";
        console.error("Unable to load header account status:", error);
    }
}
initialize();
