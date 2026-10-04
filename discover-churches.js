(() => {
    const CF = window.ChurchFinder;
    const preview = document.getElementById("churchPreview");
    if (!preview) return;
    const status = document.getElementById("churchStatus");
    const locateButton = document.getElementById("churchLocate");
    const form = document.getElementById("churchPlaceForm");
    const placeInput = document.getElementById("churchPlace");
    const seeAll = document.getElementById("churchSeeAll");

    async function load(location) {
        CF.saveLocation(location);
        status.textContent = `Looking for Catholic churches near ${location.label}…`;
        preview.innerHTML = "";
        seeAll.hidden = true;
        try {
            const churches = await CF.fetchChurches(location, { catholicOnly: true, radiusMeters: 10000 });
            if (!churches.length) {
                status.textContent = `No Catholic churches found within 10 km of ${location.label}. Try "See all churches" for a wider search.`;
            } else {
                status.textContent = `${churches.length} Catholic church${churches.length === 1 ? "" : "es"} near ${location.label}`;
                preview.innerHTML = churches.slice(0, 3).map(CF.churchCard).join("");
            }
            seeAll.hidden = false;
        } catch (error) {
            status.textContent = error.message || "Something went wrong. Please try again.";
        }
    }

    async function run(task) {
        locateButton.disabled = true;
        status.textContent = "Finding your location…";
        try {
            await load(await task());
        } catch (error) {
            status.textContent = error.message;
        } finally {
            locateButton.disabled = false;
        }
    }

    locateButton.addEventListener("click", () => run(CF.getCurrentPosition));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = placeInput.value.trim();
        if (query) run(() => CF.geocode(query));
    });

    const saved = CF.getSavedLocation();
    if (saved) load(saved);
})();
