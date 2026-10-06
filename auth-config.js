export function getPublicAuthConfig(env) {
    const urlValue = env.SUPABASE_URL?.trim();
    const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!urlValue || !key) throw new Error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to enable accounts.");
    const url = new URL(urlValue);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        throw new Error("SUPABASE_URL must be an HTTPS project origin.");
    }
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
        throw new Error("Use a Supabase public publishable key, never a secret or service-role key.");
    }
    return { url: url.origin, publishableKey: key };
}
