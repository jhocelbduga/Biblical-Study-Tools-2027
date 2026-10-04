import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY_SIZE = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimits = new Map();

const MIME_TYPES = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".ico", "image/x-icon"],
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
    [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(JSON.stringify(payload));
}

function getClientAddress(request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        const addresses = forwardedFor.split(",");
        return addresses[addresses.length - 1].trim() || request.socket.remoteAddress || "unknown";
    }
    return request.socket.remoteAddress || "unknown";
}

function isRateLimited(address) {
    const now = Date.now();
    const attempts = (rateLimits.get(address) || []).filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (attempts.length >= RATE_LIMIT_MAX_REQUESTS) {
        rateLimits.set(address, attempts);
        return true;
    }

    if (rateLimits.size >= 10000 && !rateLimits.has(address)) {
        for (const [knownAddress, timestamps] of rateLimits) {
            if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
                rateLimits.delete(knownAddress);
            }
        }
        if (rateLimits.size >= 10000) return true;
    }

    attempts.push(now);
    rateLimits.set(address, attempts);
    return false;
}

async function readJsonBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
            const error = new Error("Request body is too large.");
            error.statusCode = 413;
            throw error;
        }
        chunks.push(chunk);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        const error = new Error("Submit the form using valid JSON.");
        error.statusCode = 400;
        throw error;
    }
}

function validateSubscription(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return "Enter your name, email address, and contact details.";
    }

    const { name, email, contact } = payload;
    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof contact !== "string"
    ) {
        return "Enter your name, email address, and contact details.";
    }

    if (
        !name.trim() ||
        name.trim().length > 100 ||
        /[\u0000-\u001f\u007f]/.test(name) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 254 ||
        !/^[0-9+().\-\s]{7,30}$/.test(contact.trim())
    ) {
        return "Check your name, email address, and phone number, then try again.";
    }

    return null;
}

async function subscribe(request, response) {
    if (request.method !== "POST") {
        sendJson(response, 405, { error: "Use POST to submit a subscription." });
        return;
    }

    const requestOrigin = request.headers.origin;
    if (requestOrigin) {
        try {
            if (new URL(requestOrigin).host !== request.headers.host) {
                sendJson(response, 403, { error: "Subscription requests must come from this site." });
                return;
            }
        } catch {
            sendJson(response, 403, { error: "Subscription requests must come from this site." });
            return;
        }
    }

    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Submit the subscription form using JSON." });
        return;
    }

    if (isRateLimited(getClientAddress(request))) {
        sendJson(response, 429, { error: "Too many attempts. Please wait and try again." });
        return;
    }

    let payload;
    try {
        payload = await readJsonBody(request);
    } catch (error) {
        sendJson(response, error.statusCode || 400, { error: error.message });
        return;
    }

    const validationError = validateSubscription(payload);
    if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
    const dataCenter = apiKey?.match(/-([a-z0-9]+)$/i)?.[1];
    if (!apiKey || !audienceId || !dataCenter) {
        sendJson(response, 503, { error: "Subscriptions are temporarily unavailable. Please try again later." });
        console.error("Mailchimp subscription is not configured; set MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID.");
        return;
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const endpoint = new URL(
        `https://${dataCenter}.api.mailchimp.com/3.0/lists/${encodeURIComponent(audienceId)}/members`
    );

    let mailchimpResponse;
    try {
        mailchimpResponse = await fetch(endpoint, {
            method: "POST",
            signal: AbortSignal.timeout(10000),
            headers: {
                Authorization: `Basic ${Buffer.from(`study-tools:${apiKey}`).toString("base64")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email_address: normalizedEmail,
                status: "pending",
                merge_fields: {
                    FNAME: payload.name.trim(),
                    PHONE: payload.contact.trim()
                }
            })
        });
    } catch (error) {
        console.error("Mailchimp subscription request failed:", error.name || "network error");
        sendJson(response, 502, { error: "The mailing list could not be reached. Please try again later." });
        return;
    }

    if (!mailchimpResponse.ok) {
        const result = await mailchimpResponse.json().catch(() => ({}));
        const title = typeof result.title === "string" ? result.title : "";
        console.error("Mailchimp rejected a subscription:", mailchimpResponse.status, title);
        if (title === "Member Exists") {
            sendJson(response, 409, { error: "This email address is already subscribed." });
            return;
        }
        sendJson(response, 502, { error: "The mailing list could not process your subscription. Please try again later." });
        return;
    }

    sendJson(response, 200, {
        message: "Thanks for subscribing. Check your email to confirm your subscription."
    });
}

function serveStatic(request, response, pathname) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "This method is not supported." });
        return;
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        sendJson(response, 400, { error: "The requested path is invalid." });
        return;
    }
    if (decodedPath.includes("\0")) {
        sendJson(response, 400, { error: "The requested path is invalid." });
        return;
    }

    const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
    const filePath = path.resolve(PUBLIC_DIRECTORY, relativePath);
    if (
        !filePath.startsWith(`${PUBLIC_DIRECTORY}${path.sep}`) ||
        relativePath.split(/[\\/]/).some((part) => part.startsWith("."))
    ) {
        sendJson(response, 404, { error: "Not found." });
        return;
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        sendJson(response, 404, { error: "Not found." });
        return;
    }

    response.writeHead(200, {
        "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=300",
        "Content-Type": MIME_TYPES.get(path.extname(filePath)) || "application/octet-stream",
        "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") {
        response.end();
    } else {
        createReadStream(filePath).pipe(response);
    }
}

const server = createServer((request, response) => {
    let requestUrl;
    try {
        requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    } catch {
        sendJson(response, 400, { error: "The requested URL is invalid." });
        return;
    }

    if (requestUrl.pathname === "/api/subscribe") {
        subscribe(request, response).catch((error) => {
            console.error("Unexpected subscription endpoint error:", error);
            if (!response.headersSent) {
                sendJson(response, 500, { error: "The subscription could not be completed. Please try again." });
            }
        });
        return;
    }

    serveStatic(request, response, requestUrl.pathname);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => {
    console.log(`Biblical Study Tools listening on port ${port}.`);
});
