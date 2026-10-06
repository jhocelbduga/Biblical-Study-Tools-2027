(() => {
    const CF = window.ChurchFinder;
    const PAGE_SIZE = 10;
    const list = document.getElementById("churchList");
    const status = document.getElementById("churchStatus");
    const locateButton = document.getElementById("churchLocate");
    const form = document.getElementById("churchPlaceForm");
    const placeInput = document.getElementById("churchPlace");
    const radius = document.getElementById("radiusSelect");
    const filterCatholic = document.getElementById("filterCatholic");
    const filterAll = document.getElementById("filterAll");
    const showMore = document.getElementById("showMore");
    let catholicOnly = false;
    let location = CF.getSavedLocation();
    let churches = [];
    let shown = 0;
    let requestId = 0;

    function setFilter(value) {
        catholicOnly = value;
        filterCatholic.className = `btn ${value ? "btn-primary" : "btn-outline-primary"}`;
        filterAll.className = `btn ${value ? "btn-outline-primary" : "btn-primary"}`;
        filterCatholic.setAttribute("aria-pressed", String(value));
        filterAll.setAttribute("aria-pressed", String(!value));
    }

    function clearResults() {
        churches = [];
        shown = 0;
        list.innerHTML = "";
        showMore.hidden = true;
    }

    function renderMore() {
        list.insertAdjacentHTML("beforeend", churches.slice(shown, shown + PAGE_SIZE).map(CF.churchCard).join(""));
        shown = Math.min(churches.length, shown + PAGE_SIZE);
        showMore.hidden = shown >= churches.length;
        showMore.textContent = `Show more (${churches.length - shown} left)`;
        CF.fillMissingAddresses(list);
    }

    async function load() {
        if (!location) return;
        const current = ++requestId;
        const kind = catholicOnly ? "Catholic churches" : "churches";
        status.textContent = `Looking for ${kind} near ${location.label}…`;
        clearResults();
        try {
            const result = await CF.fetchChurches(location, { catholicOnly, radiusMeters: Number(radius.value) });
            if (current !== requestId) return;
            churches = result;
            const km = Number(radius.value) / 1000;
            status.textContent = churches.length
                ? `${CF.plural(churches.length, catholicOnly ? "Catholic church" : "church", kind)} within ${km} km of ${location.label}. Showing the nearest ${Math.min(PAGE_SIZE, churches.length)}.`
                : `No ${kind} found within ${km} km of ${location.label}. Try a wider radius.`;
            renderMore();
        } catch (error) {
            if (current === requestId) status.textContent = error.message || "Something went wrong. Please try again.";
        }
    }

    async function setLocation(task) {
        locateButton.disabled = true;
        requestId += 1;
        clearResults();
        status.textContent = "Finding location…";
        try {
            location = await task();
            CF.saveLocation(location);
            await load();
        } catch (error) {
            status.textContent = error.message;
        } finally {
            locateButton.disabled = false;
        }
    }

    filterCatholic.addEventListener("click", () => { setFilter(true); load(); });
    filterAll.addEventListener("click", () => { setFilter(false); load(); });
    radius.addEventListener("change", load);
    showMore.addEventListener("click", renderMore);
    locateButton.addEventListener("click", () => setLocation(CF.getCurrentPosition));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = placeInput.value.trim();
        if (query) setLocation(() => CF.geocode(query));
    });

    CF.attachPlaceSuggest(placeInput, (place) => setLocation(async () => place));
    const params = new URLSearchParams(window.location.search);
    setFilter(params.get("type") === "catholic");
    load();
})();
