(() => {
    const OVERPASS_URLS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
    ];
    const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
    const REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
    const STORAGE_KEY = "churchLocation";
    const CACHE_PREFIX = "churchResults:";
    const CATHOLIC_NAME = "Catholic|Katoliko|Parish|Parokya|Cathedral|Katedral|Basilica|Shrine|Santuario|Santo|Santa|San |Saint|St\\.? |Our Lady|Nuestra|Immaculate|Sacred Heart|Mary|Diocesan|Archdiocese";

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function plural(count, singular, pluralForm) {
        return `${count} ${count === 1 ? singular : pluralForm}`;
    }

    function distanceKm(lat1, lon1, lat2, lon2) {
        const rad = Math.PI / 180;
        const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
        return 12742 * Math.asin(Math.sqrt(a));
    }

    function formatDistance(km) {
        return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    }

    function getSavedLocation() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
            return saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon) ? saved : null;
        } catch {
            return null;
        }
    }

    function saveLocation(location) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    }

    // Keeps listening briefly so a coarse first reading (Wi-Fi/cell) can sharpen into a real GPS fix.
    function browserPosition({ goodEnough = 100, maxWait = 12000 } = {}) {
        return new Promise((resolve, reject) => {
            let best = null;
            let watchId;
            const finish = () => {
                navigator.geolocation.clearWatch(watchId);
                clearTimeout(timer);
                if (best) resolve(best); else reject(lastError || new Error("timeout"));
            };
            let lastError = null;
            const timer = setTimeout(finish, maxWait);
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
                    if (position.coords.accuracy <= goodEnough) finish();
                },
                (error) => {
                    lastError = error;
                    if (error.code === 1 || !best) finish();
                },
                { enableHighAccuracy: true, timeout: maxWait, maximumAge: 0 }
            );
        });
    }
    async function ipPosition() {
        const providers = [
            async (signal) => {
                const data = await (await fetch("https://ipwho.is/", { signal })).json();
                if (!data.success) throw new Error("lookup failed");
                return { lat: data.latitude, lon: data.longitude, city: data.city };
            },
            async (signal) => {
                const data = await (await fetch("https://ipapi.co/json/", { signal })).json();
                if (!Number.isFinite(data.latitude)) throw new Error("lookup failed");
                return { lat: data.latitude, lon: data.longitude, city: data.city };
            }
        ];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
            const found = await Promise.any(providers.map((p) => p(controller.signal)));
            return { lat: found.lat, lon: found.lon, label: `${found.city || "your area"} (approximate, from your network)` };
        } finally {
            clearTimeout(timer);
            controller.abort();
        }
    }

    async function getCurrentPosition() {
        if (!navigator.geolocation) {
            try { return await ipPosition(); } catch { throw new Error("Location is not supported on this device. Search a city instead."); }
        }
        let denied = false;
        try {
            const position = await browserPosition();
            const meters = Math.round(position.coords.accuracy);
            return { lat: position.coords.latitude, lon: position.coords.longitude, label: meters > 1000 ? "your location (low accuracy)" : "your location", accuracy: meters };
        } catch (error) {
            denied = error && error.code === 1;
        }
        if (denied) {
            throw new Error("Location access is blocked. Allow it in your browser's site settings for an accurate result, or search a city instead.");
        }
        try {
            return await ipPosition();
        } catch {
            throw new Error("We couldn't determine your location. Turn on GPS/location services or search a city instead.");
        }
    }
    async function suggestPlaces(query) {
        const response = await fetch(`${GEOCODE_URL}?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
        if (!response.ok) return [];
        return (await response.json()).map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), full: r.display_name, label: r.display_name.split(",").slice(0, 2).join(",").trim() }));
    }

    function attachPlaceSuggest(input, onPick) {
        const box = document.createElement("div");
        box.className = "place-suggest list-group shadow";
        box.setAttribute("role", "listbox");
        box.hidden = true;
        input.parentElement.style.position = "relative";
        input.parentElement.appendChild(box);
        input.setAttribute("autocomplete", "off");
        let timer;
        let token = 0;
        let items = [];
        let active = -1;

        const close = () => { box.hidden = true; active = -1; };
        const highlight = () => [...box.children].forEach((el, i) => el.classList.toggle("active", i === active));
        const pick = (item) => { input.value = item.label; close(); onPick(item); };

        input.addEventListener("input", () => {
            clearTimeout(timer);
            const query = input.value.trim();
            if (query.length < 2) { close(); return; }
            timer = setTimeout(async () => {
                const mine = ++token;
                try { items = await suggestPlaces(query); } catch { items = []; }
                if (mine !== token) return;
                box.innerHTML = items.map((item, i) => `<button type="button" class="list-group-item list-group-item-action" role="option" data-i="${i}"><i class="bi bi-geo-alt me-2" aria-hidden="true"></i>${escapeHtml(item.full)}</button>`).join("");
                box.hidden = !items.length;
                active = -1;
            }, 350);
        });
        input.addEventListener("keydown", (event) => {
            if (box.hidden) return;
            if (event.key === "ArrowDown") { active = (active + 1) % items.length; highlight(); event.preventDefault(); }
            else if (event.key === "ArrowUp") { active = (active - 1 + items.length) % items.length; highlight(); event.preventDefault(); }
            else if (event.key === "Enter" && active >= 0) { event.preventDefault(); pick(items[active]); }
            else if (event.key === "Escape") close();
        });
        box.addEventListener("mousedown", (event) => {
            const button = event.target.closest("button[data-i]");
            if (button) { event.preventDefault(); pick(items[Number(button.dataset.i)]); }
        });
        input.addEventListener("blur", () => setTimeout(close, 150));
    }
    async function geocode(query) {
        const url = `${GEOCODE_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
        let response;
        try {
            response = await fetch(url, { headers: { Accept: "application/json" } });
        } catch {
            throw new Error("Place search is unavailable right now. Check your connection and try again.");
        }
        if (!response.ok) throw new Error("Place search is unavailable right now. Try again soon.");
        const results = await response.json();
        if (!results.length) throw new Error(`We couldn't find "${query}". Try a nearby city or town.`);
        return { lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name.split(",").slice(0, 2).join(",").trim() };
    }

    function buildQuery(location, catholicOnly, radiusMeters) {
        const around = `(around:${radiusMeters},${location.lat},${location.lon})`;
        const base = '["amenity"="place_of_worship"]["religion"="christian"]';
        const body = catholicOnly
            ? `nwr${base}["denomination"~"catholic",i]${around};nwr${base}["denomination"!~"."]["name"~"${CATHOLIC_NAME}",i]${around};`
            : `nwr${base}${around};`;
        return `[out:json][timeout:30];(${body});out center tags 600;`;
    }

    async function runOverpass(query) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const attempts = OVERPASS_URLS.map(async (endpoint) => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Overpass ${response.status}`);
            return response.json();
        });
        try {
            return await Promise.any(attempts);
        } catch {
            throw new Error("The church directory is busy. Please try again in a moment.");
        } finally {
            clearTimeout(timer);
            controller.abort();
        }
    }
    function cleanUrl(value) {
        if (!value) return "";
        const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        try {
            return new URL(url).href;
        } catch {
            return "";
        }
    }

    function facebookUrl(value) {
        if (!value) return "";
        return /^https?:\/\//i.test(value) ? cleanUrl(value) : cleanUrl(`facebook.com/${value.replace(/^\//, "")}`);
    }

    function parseChurch(element, location) {
        const tags = element.tags || {};
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const denomination = (tags.denomination || "").toLowerCase();
        const name = tags.name || tags["name:en"] || tags.official_name || tags.alt_name || "";
        const catholic = denomination.includes("catholic") ? "confirmed" : (!denomination && new RegExp(CATHOLIC_NAME, "i").test(name) ? "likely" : "");
        const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
        const address = [
            tags["addr:full"] || street,
            tags["addr:suburb"] || tags["addr:neighbourhood"],
            tags["addr:city"] || tags["addr:town"] || tags["addr:municipality"],
            tags["addr:province"] || tags["addr:state"],
            tags["addr:postcode"]
        ].filter(Boolean).join(", ");
        const wikipedia = tags.wikipedia && tags.wikipedia.includes(":")
            ? `https://${tags.wikipedia.split(":")[0]}.wikipedia.org/wiki/${encodeURIComponent(tags.wikipedia.split(":").slice(1).join(":").replace(/ /g, "_"))}`
            : "";
        return {
            id: `${element.type}-${element.id}`,
            name: name || (catholic ? "Catholic church (unnamed)" : "Church (unnamed)"),
            hasName: Boolean(name),
            catholic,
            denominationLabel: tags.denomination ? tags.denomination.replace(/_/g, " ") : "",
            address,
            hours: tags.opening_hours || "",
            serviceTimes: tags.service_times || tags["opening_hours:mass"] || "",
            phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "",
            email: tags.email || tags["contact:email"] || "",
            website: cleanUrl(tags.website || tags["contact:website"] || tags.url),
            facebook: facebookUrl(tags["contact:facebook"] || tags.facebook),
            operator: tags.operator || "",
            diocese: tags.diocese || tags["operator:diocese"] || "",
            wheelchair: tags.wheelchair || "",
            wikipedia,
            lat,
            lon,
            distance: distanceKm(location.lat, location.lon, lat, lon)
        };
    }

    function detailScore(church) {
        return ["address", "hours", "serviceTimes", "phone", "email", "website", "facebook"].filter((key) => church[key]).length;
    }

    // Buildings are often mapped as both a node and a way; keep the richer record.
    function dedupe(churches) {
        const kept = [];
        for (const church of churches) {
            const twin = kept.findIndex((other) =>
                other.name === church.name && distanceKm(other.lat, other.lon, church.lat, church.lon) < 0.08);
            if (twin === -1) {
                kept.push(church);
            } else if (detailScore(church) > detailScore(kept[twin])) {
                kept[twin] = church;
            }
        }
        return kept;
    }

    // Nominatim answers quickly when every Overpass mirror is overloaded; it returns fewer results.
    async function nominatimChurches(location, catholicOnly, radiusMeters) {
        const dLat = radiusMeters / 111000;
        const dLon = dLat / Math.max(0.2, Math.cos(location.lat * Math.PI / 180));
        const box = [location.lon - dLon, location.lat + dLat, location.lon + dLon, location.lat - dLat].map((n) => n.toFixed(5)).join(",");
        const terms = catholicOnly ? ["catholic church", "parish church", "cathedral", "shrine"] : ["church", "chapel", "cathedral"];
        const seen = new Map();
        await Promise.all(terms.map(async (term) => {
            try {
                const response = await fetch(`${GEOCODE_URL}?format=jsonv2&limit=40&bounded=1&addressdetails=0&extratags=1&namedetails=1&viewbox=${box}&q=${encodeURIComponent(term)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
                if (!response.ok) return;
                for (const r of await response.json()) {
                    if (seen.has(r.place_id)) continue;
                    const name = r.name || (r.namedetails && r.namedetails.name) || "";
                    const extra = r.extratags || {};
                    const rest = r.display_name.split(",").slice(name ? 1 : 0, 5).map((s) => s.trim()).filter(Boolean).join(", ");
                    seen.set(r.place_id, {
                        type: r.osm_type || "node",
                        id: r.osm_id,
                        lat: Number(r.lat),
                        lon: Number(r.lon),
                        tags: {
                            name,
                            denomination: extra.denomination || "",
                            "addr:full": rest,
                            opening_hours: extra.opening_hours,
                            service_times: extra.service_times,
                            phone: extra.phone || extra["contact:phone"],
                            website: extra.website || extra["contact:website"],
                            email: extra.email || extra["contact:email"],
                            wikipedia: extra.wikipedia
                        }
                    });
                }
            } catch {
                // ignore a single failed term
            }
        }));
        return [...seen.values()];
    }
    async function fetchChurches(location, { catholicOnly, radiusMeters }) {
        const cacheKey = `${CACHE_PREFIX}${location.lat.toFixed(3)},${location.lon.toFixed(3)},${catholicOnly},${radiusMeters}`;
        let elements = null;
        try {
            elements = JSON.parse(sessionStorage.getItem(cacheKey));
        } catch {
            elements = null;
        }
        if (!elements) {
            let fromOverpass = true;
            try {
                elements = (await runOverpass(buildQuery(location, catholicOnly, radiusMeters))).elements;
            } catch (error) {
                elements = await nominatimChurches(location, catholicOnly, radiusMeters);
                fromOverpass = false;
                if (!elements.length) throw error;
            }
            if (fromOverpass && elements.length) try {
                sessionStorage.setItem(cacheKey, JSON.stringify(elements));
            } catch {
                // storage full; caching is optional
            }
        }
        return dedupe(elements.map((element) => parseChurch(element, location)).filter(Boolean))
            .sort((a, b) => a.distance - b.distance);
    }

    function formatHours(value) {
        return value.split(";").map((part) => part.trim()).filter(Boolean).map(escapeHtml).join("<br>");
    }

    function row(icon, content) {
        return content ? `<li class="church-detail"><i class="bi ${icon}" aria-hidden="true"></i><span>${content}</span></li>` : "";
    }

    function wheelchairLabel(value) {
        return { yes: "Wheelchair accessible", limited: "Limited wheelchair access", no: "Not wheelchair accessible" }[value] || "";
    }

    function churchCard(church) {
        const label = church.hasName ? church.name : "church";
        const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${church.lat},${church.lon}`;
        const mapsOpen = `https://www.google.com/maps/search/?api=1&query=${church.hasName ? encodeURIComponent([label, church.address].filter(Boolean).join(" ")) : `${church.lat},${church.lon}`}`;
        const webSearch = `https://www.google.com/search?q=${encodeURIComponent(`${label} ${church.address || ""} Mass schedule contact`.trim())}`;
        const phoneLink = church.phone ? `tel:${church.phone.split(";")[0].replace(/[^+\d]/g, "")}` : "";
        const badges = [
            church.catholic === "confirmed" ? '<span class="badge text-bg-success">Catholic</span>' : "",
            church.catholic === "likely" ? '<span class="badge text-bg-light border" title="Inferred from the name">Likely Catholic</span>' : "",
            church.denominationLabel && !church.catholic ? `<span class="badge text-bg-light border text-capitalize">${escapeHtml(church.denominationLabel)}</span>` : ""
        ].filter(Boolean).join(" ");

        const details = [
            row("bi-geo-alt", church.address ? escapeHtml(church.address) : `<span class="text-body-secondary church-address-slot" data-lat="${church.lat}" data-lon="${church.lon}">Looking up address…</span>`),
            row("bi-clock", church.hours ? `<strong>Hours:</strong><br>${formatHours(church.hours)}` : ""),
            row("bi-calendar-event", church.serviceTimes ? `<strong>Mass / services:</strong><br>${formatHours(church.serviceTimes)}` : ""),
            row("bi-telephone", church.phone ? `<a href="${escapeHtml(phoneLink)}">${escapeHtml(church.phone)}</a>` : ""),
            row("bi-envelope", church.email ? `<a href="mailto:${escapeHtml(church.email)}">${escapeHtml(church.email)}</a>` : ""),
            row("bi-building", church.diocese || church.operator ? escapeHtml([church.diocese, church.operator].filter(Boolean).join(" · ")) : ""),
            row("bi-universal-access", wheelchairLabel(church.wheelchair))
        ].join("");

        const actions = [
            `<a class="btn btn-sm btn-primary" href="${mapsDirections}" target="_blank" rel="noopener"><i class="bi bi-signpost-split me-1" aria-hidden="true"></i>Directions</a>`,
            phoneLink ? `<a class="btn btn-sm btn-outline-primary" href="${escapeHtml(phoneLink)}"><i class="bi bi-telephone me-1" aria-hidden="true"></i>Call</a>` : "",
            church.website ? `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(church.website)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-globe2 me-1" aria-hidden="true"></i>Website</a>` : "",
            church.facebook ? `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(church.facebook)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-facebook me-1" aria-hidden="true"></i>Facebook</a>` : "",
            church.wikipedia ? `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(church.wikipedia)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-wikipedia me-1" aria-hidden="true"></i>Wikipedia</a>` : "",
            `<button type="button" class="btn btn-sm btn-outline-success" data-church-qr data-name="${escapeHtml(church.hasName ? church.name : "")}" data-address="${escapeHtml(church.address || "")}" data-denomination="${escapeHtml(church.denominationLabel || (church.catholic ? "Catholic" : ""))}" data-lat="${church.lat}" data-lon="${church.lon}" aria-label="Show QR code to join ${escapeHtml(label)} as a parishioner"><i class="bi bi-qr-code me-1" aria-hidden="true"></i>QR</button>`,
            `<a class="btn btn-sm btn-outline-secondary" href="${mapsOpen}" target="_blank" rel="noopener"><i class="bi bi-map me-1" aria-hidden="true"></i>Maps</a>`,
            `<a class="btn btn-sm btn-outline-secondary" href="${webSearch}" target="_blank" rel="noopener"><i class="bi bi-search me-1" aria-hidden="true"></i>Search the web</a>`
        ].filter(Boolean).join("");

        return `
            <div class="col-12 col-md-6 col-lg-4">
                <article class="card h-100 discover-card church-card">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <h3 class="h6 mb-0">${escapeHtml(church.name)}</h3>
                            <span class="badge rounded-pill discover-tag text-nowrap">${formatDistance(church.distance)}</span>
                        </div>
                        ${badges ? `<p class="mb-2">${badges}</p>` : ""}
                        <ul class="list-unstyled small mb-3 flex-grow-1 church-details">${details}</ul>
                        <div class="d-flex gap-2 flex-wrap">${actions}</div>
                    </div>
                </article>
            </div>`;
    }

    // Fills in missing addresses one at a time, within Nominatim's 1 request/second policy.
    const addressQueue = [];
    let addressWorking = false;

    async function processAddressQueue() {
        if (addressWorking) return;
        addressWorking = true;
        while (addressQueue.length) {
            const slot = addressQueue.shift();
            if (!slot.isConnected) continue;
            try {
                const response = await fetch(`${REVERSE_URL}?format=jsonv2&zoom=18&addressdetails=1&lat=${slot.dataset.lat}&lon=${slot.dataset.lon}`, { headers: { Accept: "application/json" } });
                const data = response.ok ? await response.json() : null;
                const a = data?.address || {};
                const text = [
                    [a.house_number, a.road].filter(Boolean).join(" "),
                    a.suburb || a.neighbourhood || a.quarter,
                    a.city || a.town || a.municipality || a.village,
                    a.state || a.province,
                    a.postcode
                ].filter(Boolean).join(", ");
                slot.textContent = text || "Address not listed";
                slot.classList.remove("text-body-secondary");
            } catch {
                slot.textContent = "Address not listed";
            }
            await new Promise((resolve) => setTimeout(resolve, 1100));
        }
        addressWorking = false;
    }

    function fillMissingAddresses(container) {
        const slots = container.querySelectorAll(".church-address-slot:not([data-queued])");
        const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                addressQueue.push(entry.target);
            });
            processAddressQueue();
        }, { rootMargin: "200px" }) : null;
        slots.forEach((slot) => {
            slot.dataset.queued = "1";
            if (observer) {
                observer.observe(slot);
            } else {
                addressQueue.push(slot);
            }
        });
        if (!observer) processAddressQueue();
    }

    window.ChurchFinder = { fetchChurches, geocode, getCurrentPosition, attachPlaceSuggest, getSavedLocation, saveLocation, churchCard, fillMissingAddresses, plural, escapeHtml };
})();
