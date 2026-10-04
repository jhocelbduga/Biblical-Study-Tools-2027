const CACHE_NAME = "biblical-study-tools-shell-v9";
const APP_SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./index.js",
    "./discover.html",
    "./discover.js",
    "./discover-churches.js",
    "./churches.html",
    "./churches.js",
    "./churches-page.js",
    "./profile.html",
    "./profile.js",
    "./profile-store.js",
    "./qr-share.js",
    "./qrcode.js",
    "./install.js",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-192.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon.png"
];
const ALLOWED_ORIGINS = new Set([
    self.location.origin,
    "https://cdn.jsdelivr.net",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com"
]);

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) => name.startsWith("biblical-study-tools-shell-") && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type !== "CACHE_RESOURCES" || !event.ports[0]) return;

    const replyPort = event.ports[0];
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const warnings = [];
        const resourceUrls = [...new Set(event.data.urls || [])];
        await Promise.all(resourceUrls.map(async (resourceUrl) => {
            let url;
            try {
                url = new URL(resourceUrl);
            } catch {
                return;
            }
            if (!ALLOWED_ORIGINS.has(url.origin) || await cache.match(url.href)) return;

            try {
                const request = new Request(url.href, {
                    mode: url.origin === self.location.origin ? "same-origin" : "cors",
                    credentials: "omit"
                });
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                } else {
                    warnings.push(`A resource could not be saved (${url.hostname}).`);
                }
            } catch (error) {
                console.warn("Could not cache an app resource:", url.href, error);
                warnings.push(`A resource could not be saved (${url.hostname}).`);
            }
        }));
        replyPort.postMessage({ warnings });
    })().catch((error) => {
        console.error("Could not save app resources for offline use:", error);
        replyPort.postMessage({ error: "Some app resources could not be saved for offline use." });
    }));
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || !ALLOWED_ORIGINS.has(url.origin)) return;

    if (url.origin === self.location.origin && request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => (await caches.match(request)) || caches.match("./index.html"))
        );
        return;
    }

    if (url.origin === self.location.origin && /\.(js|css|json)$/.test(url.pathname)) {
        event.respondWith(
            fetch(request, { cache: "no-cache" })
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    event.respondWith(caches.match(request).then(async (cached) => {
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    }));
});
