import { connectSupabase } from "./supabase-client.js";

const $ = id => document.getElementById(id);
const feedback = $("accountFeedback");
const modeButtons = [...document.querySelectorAll("[data-account-mode]")];
const providerButtons = [...document.querySelectorAll("[data-auth-provider]")];
let subscribed = false;
try {
    subscribed = localStorage.getItem("bstSubscribed") === "1";
} catch (error) {
    console.error("Unable to load account subscription status:", error);
    feedback.textContent = "Saved newsletter status could not be loaded; subscription remains optional.";
}
let client;
let session = null;
let mode = "login";
let recovery = false;
let busy = false;

function render() {
    $("signedInAccount").hidden = !session;
    $("accountForms").hidden = Boolean(session) && !recovery;
    $("accountNewsletterPrompt").hidden = !session || recovery || subscribed;
    $("socialAccountOptions").hidden = recovery || ["reset", "update"].includes(mode);
    providerButtons.forEach(button => { button.disabled = !client || busy || recovery; });
    $("accountEmail").textContent = session?.user.email || "";
    $("accountNameField").hidden = mode !== "register";
    $("accountName").required = mode === "register";
    $("accountEmailField").hidden = mode === "update";
    $("accountEmailInput").required = mode !== "update";
    $("accountPasswordField").hidden = mode === "reset";
    $("accountPassword").required = mode !== "reset";
    $("accountPassword").minLength = ["register", "update"].includes(mode) ? 12 : 1;
    $("accountPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
    $("accountPasswordHelp").hidden = !["register", "update"].includes(mode);
    $("accountConfirmField").hidden = !["register", "update"].includes(mode);
    $("accountConfirmPassword").required = ["register", "update"].includes(mode);
    $("accountConfirmPassword").setCustomValidity("");
    const titles = { login: "Sign in", register: "Create account", reset: "Send password reset email", update: "Set a new password" };
    $("accountFormTitle").textContent = titles[mode];
    $("accountSubmit").textContent = busy ? "Please wait..." : titles[mode];
    $("accountFields").disabled = !client || busy;
    $("signOutAccount").disabled = !client || busy;
    $("cancelPasswordUpdate").hidden = !recovery;
    $("cancelPasswordUpdate").disabled = busy;
    modeButtons.forEach(button => {
        button.disabled = !client || busy || recovery;
        button.setAttribute("aria-pressed", String(button.dataset.accountMode === mode));
    });
}

function changeMode(nextMode) {
    mode = nextMode;
    $("accountPassword").value = "";
    $("accountConfirmPassword").value = "";
    feedback.textContent = "";
    render();
}

async function connect() {
    render();
    try {
        client = await connectSupabase();
        client.auth.onAuthStateChange((event, nextSession) => {
            session = nextSession;
            if (event === "PASSWORD_RECOVERY") {
                recovery = true;
                mode = "update";
                feedback.textContent = "Reset link verified. Choose a new password.";
            } else if (event === "SIGNED_OUT") {
                recovery = false;
                mode = "login";
            }
            render();
        });
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        session = data.session;
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const callbackError = params.get("error_description") || hashParams.get("error_description");
        if (callbackError) {
            feedback.textContent = callbackError;
            window.history.replaceState({}, "", window.location.pathname);
        } else if (!recovery) {
            feedback.textContent = session ? "You are signed in." : "Account services are ready.";
        }
        render();
    } catch (error) {
        client = null;
        feedback.textContent = error.message || "Could not connect to account services.";
        $("retryAccount").hidden = false;
        console.error("Unable to initialize account services:", error.message);
        render();
    }
}

modeButtons.forEach(button => button.addEventListener("click", () => changeMode(button.dataset.accountMode)));
providerButtons.forEach(button => button.addEventListener("click", async () => {
    if (!client || busy || recovery) return;
    busy = true;
    render();
    try {
        const provider = button.dataset.authProvider;
        const { data, error } = await client.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: new URL("account.html", window.location.href).href,
                skipBrowserRedirect: true,
                ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {})
            }
        });
        if (error) throw error;
        if (!data?.url) throw new Error("The provider did not return a sign-in URL. Ask the site owner to check provider settings.");
        feedback.textContent = `Opening ${provider === "google" ? "Google" : "Facebook"} sign-in...`;
        window.location.assign(data.url);
    } catch (error) {
        feedback.textContent = error.message || "Social sign-in could not be started. Please try again.";
        console.error("Unable to start social sign-in:", error);
    } finally {
        busy = false;
        render();
    }
}));
$("retryAccount").addEventListener("click", () => window.location.reload());
$("accountConfirmPassword").addEventListener("input", () => $("accountConfirmPassword").setCustomValidity(""));
$("accountPassword").addEventListener("input", () => $("accountConfirmPassword").setCustomValidity(""));
$("accountForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!client || busy) return;
    if (["register", "update"].includes(mode) && $("accountPassword").value !== $("accountConfirmPassword").value) {
        $("accountConfirmPassword").setCustomValidity("Passwords must match.");
        $("accountConfirmPassword").reportValidity();
        return;
    }
    const email = $("accountEmailInput").value.trim();
    const password = $("accountPassword").value;
    const redirectTo = new URL("account.html", window.location.href).href;
    busy = true;
    render();
    try {
        let result;
        if (mode === "register") {
            result = await client.auth.signUp({
                email, password,
                options: { emailRedirectTo: redirectTo, data: { display_name: $("accountName").value.trim() } }
            });
        } else if (mode === "reset") {
            result = await client.auth.resetPasswordForEmail(email, { redirectTo });
        } else if (mode === "update") {
            result = await client.auth.updateUser({ password });
        } else {
            result = await client.auth.signInWithPassword({ email, password });
        }
        if (result.error) throw result.error;
        if (mode === "reset") {
            feedback.textContent = "If this address has an account, a password reset email will be sent. Check your inbox and spam folder.";
        } else if (mode === "register") {
            session = result.data.session;
            feedback.textContent = session ? "Your account is ready and you are signed in."
                : "Check your email to confirm your account, then sign in. If you already have an account, use Sign in or Forgot password.";
        } else if (mode === "update") {
            recovery = false;
            mode = "login";
            feedback.textContent = "Your password has been updated.";
        } else {
            session = result.data.session;
            feedback.textContent = "Signed in successfully.";
        }
        $("accountPassword").value = "";
        $("accountConfirmPassword").value = "";
    } catch (error) {
        feedback.textContent = error.message || "The account request failed. Please try again.";
    } finally {
        busy = false;
        render();
    }
});
$("cancelPasswordUpdate").addEventListener("click", () => {
    recovery = false;
    changeMode("login");
});
$("signOutAccount").addEventListener("click", async () => {
    if (!client || busy) return;
    busy = true;
    render();
    try {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        session = null;
        recovery = false;
        mode = "login";
        $("accountForm").reset();
        feedback.textContent = "Signed out on this device. Local reading progress and friends are unchanged.";
    } catch (error) {
        feedback.textContent = error.message || "Could not sign out. Please try again.";
    } finally {
        busy = false;
        render();
    }
});
connect();
