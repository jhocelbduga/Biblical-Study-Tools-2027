let connection;

export function connectSupabase() {
    if (!connection) {
        connection = createConnection().catch(error => {
            connection = undefined;
            throw error;
        });
    }
    return connection;
}

async function createConnection() {
    if (window.location.protocol === "file:") {
        throw new Error("Open the Render site or Node server to use shared accounts and communities.");
    }
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) {
        let message = "Shared services require the configured Node server. GitHub Pages cannot provide them.";
        if (response.headers.get("content-type")?.includes("application/json")) {
            const result = await response.json();
            if (result.error) message = result.error;
        }
        throw new Error(message);
    }
    const config = await response.json();
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm");
    return createClient(config.url, config.publishableKey, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
}
