(() => {
    const id = new URLSearchParams(window.location.search).get("video");
    const item = window.VideoLibrary.items.find(video => video.id === id);
    const feedback = document.getElementById("watchFeedback");
    if (!item) {
        feedback.textContent = id
            ? "This video could not be found. Choose a video from the catalog."
            : "No video selected. Choose a video from the catalog.";
        return;
    }
    document.title = `${item.title} | Biblical Study Tools`;
    document.getElementById("watchTitle").textContent = item.title;
    document.getElementById("watchProvider").textContent = `${item.provider} · ${item.type}`;
    document.getElementById("watchDescription").textContent = item.summary;
    const link = document.getElementById("watchOfficialLink");
    link.href = item.url;
    link.setAttribute("aria-label", `${item.type === "Collection" ? "Explore collection" : "Watch video"}: ${item.title} on Bible App (opens in a new tab)`);
    link.hidden = false;
    document.getElementById("watchNotice").hidden = false;
    if (window.SavedStore) {
        const save = document.getElementById("saveWatchVideo");
        save.hidden = false;
        window.SavedStore.attach(save, { type: "video", id: item.id, title: item.title, body: item.summary }, feedback);
    }
})();
