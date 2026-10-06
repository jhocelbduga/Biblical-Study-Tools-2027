import { connectSupabase } from "./supabase-client.js";

const $ = id => document.getElementById(id);
let client;
let session;
let location;
let creationLocation;
let busy = false;
let requestId = 0;

function controls() {
    $("communityFields").disabled = !client || !session || busy;
    $("communitySearchFields").disabled = !client || busy;
    $("communityAccountNotice").hidden = Boolean(session);
    $("communityResults").querySelectorAll("button").forEach(button => {
        button.disabled = button.dataset.owner === "true" || !session || busy;
    });
}

function errorMessage(error, prefix) {
    $("communityFeedback").textContent = `${prefix}: ${error.message || "Please try again."}`;
    console.error(prefix, error);
}

function getLocation() {
    if (!navigator.geolocation) return Promise.reject(new Error("Location is unavailable in this browser. Use the directory search instead."));
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        error => reject(new Error(error.code === 1 ? "Location permission was denied. You can still search the directory." : "Could not determine your location. Try again or search the directory.")),
        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }
    ));
}

async function search() {
    if (!client) return;
    const id = ++requestId;
    $("communityFeedback").textContent = "Searching communities...";
    const { data, error } = await client.rpc("search_communities", {
        search_text: $("communityQuery").value.trim(),
        near_lat: location?.lat ?? null,
        near_lng: location?.lng ?? null,
        radius_km: Number($("communityRadius").value),
        joined_only: $("communityJoinedOnly").checked
    });
    if (id !== requestId) return;
    const results = $("communityResults");
    results.replaceChildren();
    if (error) {
        errorMessage(error, "Could not load communities. Ask the site owner to check the database setup");
        return;
    }
    $("communityFeedback").textContent = `${data.length} communit${data.length === 1 ? "y" : "ies"} found${location ? " near your location" : ""}. Showing up to 50 matches.${data.length === 0 ? " Try another search or create a community." : ""}`;
    data.forEach(community => {
        const item = document.createElement("article");
        item.className = "card p-3 mb-3";
        const title = document.createElement("h3");
        title.className = "h5";
        title.textContent = community.name;
        const description = document.createElement("p");
        description.textContent = community.description;
        const meta = document.createElement("p");
        meta.className = "small text-body-secondary";
        meta.textContent = `${community.city} | ${community.member_count} member${Number(community.member_count) === 1 ? "" : "s"}${community.distance_km === null ? "" : ` | ${Number(community.distance_km).toFixed(1)} km away`}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-outline-primary align-self-start";
        const owner = session?.user.id === community.owner_id;
        button.textContent = owner ? "Owner - joined" : community.is_member ? "Leave community" : "Join community";
        button.disabled = owner || !session || busy;
        button.dataset.owner = String(owner);
        button.addEventListener("click", async () => {
            if (owner || busy || !session) return;
            busy = true;
            controls();
            try {
                const { error } = await client.rpc(community.is_member ? "leave_community" : "join_community", { community_id: community.id });
                if (error) throw error;
                await search();
            } catch (error) {
                errorMessage(error, "Membership could not be updated");
            } finally {
                busy = false;
                controls();
            }
        });
        item.append(title, description, meta, button);
        results.appendChild(item);
    });
    controls();
}

$("communitySearch").addEventListener("submit", event => {
    event.preventDefault();
    search().catch(error => errorMessage(error, "Community search failed"));
});
$("communityNearMe").addEventListener("click", async () => {
    busy = true;
    controls();
    try {
        location = await getLocation();
        $("communityLocationStatus").textContent = "Nearby filter active. Your location is sent only to search, not stored as your profile.";
        await search();
    } catch (error) {
        errorMessage(error, "Nearby search failed");
    } finally {
        busy = false;
        controls();
    }
});
$("communityClearLocation").addEventListener("click", () => {
    location = undefined;
    $("communityLocationStatus").textContent = "Searching all registered communities. Nearby search excludes communities without a meeting location.";
    search().catch(error => errorMessage(error, "Community search failed"));
});
$("communityUseMeetingLocation").addEventListener("click", async () => {
    busy = true;
    controls();
    try {
        creationLocation = await getLocation();
        $("communityMeetingStatus").textContent = "Public meeting location selected. Submit only if this is a safe public venue.";
    } catch (error) {
        errorMessage(error, "Meeting location could not be selected");
    } finally {
        busy = false;
        controls();
    }
});
$("communityRemoveMeetingLocation").addEventListener("click", () => {
    creationLocation = undefined;
    $("communityMeetingStatus").textContent = "No meeting location selected. Your community will appear in directory search, but not nearby search.";
});
$("communityCreate").addEventListener("submit", async event => {
    event.preventDefault();
    if (!client || !session || busy || !$("communityCreate").reportValidity()) return;
    busy = true;
    controls();
    $("communityCreateFeedback").textContent = "";
    try {
        const { error } = await client.rpc("create_community", {
            community_name: $("communityName").value.trim(),
            community_description: $("communityDescription").value.trim(),
            community_city: $("communityCity").value.trim(),
            meeting_lat: creationLocation?.lat ?? null,
            meeting_lng: creationLocation?.lng ?? null
        });
        if (error) throw error;
        $("communityCreate").reset();
        creationLocation = undefined;
        $("communityMeetingStatus").textContent = "No meeting location selected.";
        location = undefined;
        $("communityQuery").value = "";
        $("communityJoinedOnly").checked = true;
        $("communityLocationStatus").textContent = "Showing your joined communities without a nearby filter.";
        await search();
        $("communityCreateFeedback").textContent = "Community created. You are its owner and first member.";
    } catch (error) {
        errorMessage(error, "Could not create community");
    } finally {
        busy = false;
        controls();
    }
});

async function initialize() {
    controls();
    try {
        client = await connectSupabase();
        const result = await client.auth.getSession();
        if (result.error) throw result.error;
        session = result.data.session;
        client.auth.onAuthStateChange((event, nextSession) => {
            session = nextSession;
            controls();
            setTimeout(() => search().catch(error => errorMessage(error, "Community search failed")), 0);
        });
        controls();
        await search();
    } catch (error) {
        client = undefined;
        controls();
        errorMessage(error, "Shared communities are unavailable");
    }
}
initialize();
