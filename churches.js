(() => {
    const OVERPASS_URLS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter"
    ];
    const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";
    const STORAGE_KEY = "churchLocation";

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Location is not supported on this device. Search a city instead."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, label: "your location" }),
                () => reject(new Error("We couldn't get your location. Allow location access or search a city instead.")),
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        });
    }

    async function geocode(query) {
        const url = `${GEOCODE_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Place search is unavailable right now. Try again soon.");
        const results = await response.json();
        if (!results.length) throw new Error(`We couldn't find "${query}". Try a nearby city or town.`);
        return { lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name.split(",").slice(0, 2).join(",").trim() };
    }

    async function fetchChurches(location, { catholicOnly, radiusMeters }) {
        const denomination = catholicOnly ? '["denomination"="roman_catholic"]' : "";
        const query = `[out:json][timeout:25];nwr["amenity"="place_of_worship"]["religion"="christian"]${denomination}(around:${radiusMeters},${location.lat},${location.lon});out center 300;`;
        let data = null;
        for (const endpoint of OVERPASS_URLS) {
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: AbortSignal.timeout(30000)
                });
                if (response.ok) {
                    data = await response.json();
                    break;
                }
            } catch {
                // try the next mirror
            }
        }
        if (!data) throw new Error("The church directory is busy. Please try again in a moment.");
        return data.elements
            .map((element) => {
                const lat = element.lat ?? element.center?.lat;
                const lon = element.lon ?? element.center?.lon;
                const tags = element.tags || {};
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                const address = [
                    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
                    tags["addr:city"] || tags["addr:suburb"]
                ].filter(Boolean).join(", ");
                return {
                    id: `${element.type}-${element.id}`,
                    name: tags.name || (tags.denomination === "roman_catholic" ? "Catholic church" : "Christian church"),
                    catholic: tags.denomination === "roman_catholic",
                    address,
                    phone: tags.phone || tags["contact:phone"] || "",
                    website: /^https?:\/\//i.test(tags.website || "") ? tags.website : "",
                    lat,
                    lon,
                    distance: distanceKm(location.lat, location.lon, lat, lon)
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance);
    }

    function churchCard(church) {
        const directions = `https://www.openstreetmap.org/directions?to=${church.lat}%2C${church.lon}`;
        return `
            <div class="col-12 col-md-6 col-lg-4">
                <article class="card h-100 discover-card">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                            <h3 class="h6 mb-0"><i class="bi bi-building me-1" aria-hidden="true"></i>${escapeHtml(church.name)}</h3>
                            <span class="badge rounded-pill discover-tag text-nowrap">${formatDistance(church.distance)}</span>
                        </div>
                        ${church.catholic ? '<p class="mb-1"><span class="badge text-bg-light border">Catholic</span></p>' : ""}
                        <p class="text-body-secondary small mb-3 flex-grow-1">${escapeHtml(church.address || "Address not listed")}${church.phone ? `<br><i class="bi bi-telephone me-1" aria-hidden="true"></i>${escapeHtml(church.phone)}` : ""}</p>
                        <div class="d-flex gap-2 flex-wrap">
                            <a class="btn btn-sm btn-outline-primary" href="${directions}" target="_blank" rel="noopener"><i class="bi bi-signpost-split me-1" aria-hidden="true"></i>Directions</a>
                            ${church.website ? `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(church.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ""}
                        </div>
                    </div>
                </article>
            </div>`;
    }

    window.ChurchFinder = { fetchChurches, geocode, getCurrentPosition, getSavedLocation, saveLocation, churchCard, escapeHtml };
})();
