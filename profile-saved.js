(() => {
    const store = window.SavedStore;
    const feedback = document.getElementById("savedFeedback");
    const categories = [
        ["Notes", "journal-text", ["note"]], ["Highlights", "highlighter", ["highlight"]],
        ["Verses", "book", ["verse", "video", "plan"]], ["Images", "image", ["image"]],
        ["Plans", "calendar-check", ["plan"]], ["Video", "play-btn", ["video"]],
        ["Events", "calendar-event", ["event"]], ["Prayer", "heart", ["prayer", "plan"]]
    ];
    function node(tag, text = "", className = "") {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    function icon(name) {
        const element = node("i", "", `bi bi-${name} me-2`);
        element.setAttribute("aria-hidden", "true");
        return element;
    }
    function run(callback) {
        try { callback(); } catch (error) {
            feedback.textContent = error.message;
            console.error("Saved library operation failed:", error);
        }
    }
    function action(label, name, callback) {
        const button = node("button", "", "dropdown-item");
        button.type = "button";
        button.append(icon(name), label);
        button.addEventListener("click", () => run(callback));
        return button;
    }
    function share(item) {
        const url = new URL(item.type === "video" ? "watch.html" : "index.html", "https://biblical-study-tools-2027.onrender.com/");
        if (item.type === "video") url.searchParams.set("video", item.id);
        else url.searchParams.set("plan", item.id);
        navigator.clipboard.writeText(url.href).then(() => {
            feedback.textContent = `${item.type === "video" ? "Video" : "Plan"} link copied.`;
        }).catch(error => {
            feedback.textContent = "Could not copy the link. Check clipboard permission and try again.";
            console.error("Unable to share saved item:", error);
        });
    }
    function card(item) {
        const row = node("article", "", "profile-card d-flex gap-3 align-items-start mb-2");
        if (item.type === "video") {
            const thumb = node("a", "", "saved-video-thumbnail");
            thumb.href = `watch.html?video=${encodeURIComponent(item.id)}`;
            thumb.setAttribute("aria-label", `Watch ${item.title}`);
            const image = node("img");
            image.src = "icons/video-thumbnail.svg";
            image.alt = `Video preview: ${item.title}`;
            thumb.append(image);
            row.append(thumb);
        }
        const content = node("div", "", "flex-grow-1 saved-item-content");
        content.append(node("h4", item.title, "h6 fw-semibold"));
        if (item.type === "image") {
            const img = node("img", "", "img-fluid rounded");
            img.src = item.image;
            img.alt = item.title;
            img.loading = "lazy";
            content.append(img);
        }
        if (item.body) content.append(node("p", item.body, `feed-content mb-1${item.type === "highlight" ? " saved-highlight" : ""}`));
        if (item.reference) content.append(node("p", item.reference, "small fw-semibold mb-1"));
        if (item.type === "event") {
            const remote = node("div");
            remote.dataset.savedEventId = item.id;
            const open = node("a", "Open saved event", "btn btn-outline-primary btn-sm");
            open.href = `index.html#activity=${encodeURIComponent(item.id)}`;
            content.append(remote, open, node("p", "Content is checked against current feed permissions.", "small mt-2"));
        }
        if (item.type === "verse" && !item.id.startsWith("feed-")) {
            const open = node("a", "Open verse", "btn btn-outline-primary btn-sm");
            open.href = `index.html?verse=${encodeURIComponent(item.id)}`;
            content.append(open);
        }
        const dropdown = node("div", "", "dropdown flex-shrink-0");
        const toggle = node("button", "", "btn btn-outline-secondary btn-sm");
        toggle.type = "button";
        toggle.setAttribute("data-bs-toggle", "dropdown");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `Options for ${item.title}`);
        toggle.append(icon("three-dots"));
        const menu = node("div", "", "dropdown-menu dropdown-menu-end");
        if (item.type === "plan") menu.append(action("Start a plan", "play-circle", () => {
            window.location.assign(`index.html?plan=${encodeURIComponent(item.id)}&startPlan=1`);
        }));
        menu.append(action("Remove from saved", "bookmark-dash", () => {
            store.remove(item.type, item.id);
            feedback.textContent = "Removed from Saved. Reading progress and shared posts are unchanged.";
        }));
        if (["plan", "video"].includes(item.type)) {
            menu.append(action(`Share ${item.type}`, "share", () => share(item)));
            const info = node("details", "", "mt-2");
            info.hidden = true;
            info.append(node("summary", `${item.type === "plan" ? "Plan" : "Video"} info`),
                node("p", item.body || "Open the original content for more information.", "small feed-content"));
            if (item.type === "video") {
                const original = window.VideoLibrary.items.find(video => video.id === item.id);
                if (original) info.append(node("p", `${original.provider} | ${original.category} | ${original.type}`, "small"));
            }
            content.append(info);
            menu.append(action(`${item.type === "plan" ? "Plan" : "Video"} info`, "info-circle", () => {
                info.hidden = false;
                info.open = true;
            }));
        }
        dropdown.append(toggle, menu);
        row.append(content, dropdown);
        return row;
    }
    const lists = [];
    categories.forEach(([title, symbol, types]) => {
        const details = node("details", "", "profile-card mb-2");
        const summary = node("summary", "", "saved-category d-flex align-items-center");
        summary.append(icon(symbol), node("span", title, "flex-grow-1"), icon("chevron-right"));
        const list = node("div", "", "mt-3");
        if (title === "Events") {
            const buttons = node("div", "", "d-flex gap-2 mb-3");
            const upcoming = node("a", "Events", "btn btn-outline-primary btn-sm");
            upcoming.href = "index.html#upcomingEvents";
            const saved = node("button", "Saved events", "btn btn-outline-primary btn-sm");
            saved.type = "button";
            saved.addEventListener("click", () => { render(); details.open = true; });
            buttons.append(upcoming, saved);
            details.append(summary, buttons, list);
        } else details.append(summary, list);
        lists.push({ list, types });
        document.getElementById("savedCategories").append(details);
    });
    function render() {
        lists.forEach(({ list }) => list.replaceChildren());
        run(() => {
            const items = store.list();
            lists.forEach(({ list, types }) => {
                const matches = items.filter(item => types.includes(item.type));
                list.replaceChildren(...matches.map(card));
                if (!matches.length) list.append(node("p", "No saved items in this category yet.", "text-body-secondary mb-0"));
            });
            window.dispatchEvent(new CustomEvent("saved-library-rendered"));
        });
    }
    document.getElementById("savedEntryForm").addEventListener("submit", event => {
        event.preventDefault();
        run(() => {
            const type = document.getElementById("savedEntryType").value;
            if (!["note", "prayer"].includes(type)) throw new Error("Choose Note or Prayer.");
            store.add({
                type, id: crypto.randomUUID(), title: document.getElementById("savedEntryTitle").value.trim(),
                body: document.getElementById("savedEntryBody").value.trim(),
                reference: document.getElementById("savedEntryReference").value.trim()
            });
            event.target.reset();
            feedback.textContent = `${type === "note" ? "Note" : "Prayer"} saved on this device.`;
        });
    });
    window.addEventListener("saved-items-updated", render);
    window.addEventListener("storage", event => { if (event.key === "bstSavedItems" || event.key === null) render(); });
    render();
})();
