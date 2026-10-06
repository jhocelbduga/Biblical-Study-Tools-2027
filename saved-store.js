(() => {
    const key = "bstSavedItems";
    const types = new Set(["note", "highlight", "verse", "image", "plan", "video", "event", "prayer"]);
    function validate(item) {
        if (!item || !types.has(item.type) || typeof item.id !== "string" || !item.id ||
            typeof item.title !== "string" || !item.title.trim() || item.title.length > 160 ||
            typeof item.body !== "string" || item.body.length > 4000 ||
            typeof item.reference !== "string" || item.reference.length > 160 ||
            !Number.isFinite(Date.parse(item.savedAt))) throw new Error("Invalid saved item.");
        if (item.type === "image" && !/^images\/verses\/[a-z0-9-]+\.png$/.test(item.image || "")) {
            throw new Error("Only the app's posted verse images can be saved.");
        }
        if (item.type === "event" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) throw new Error("Invalid event ID.");
    }
    function load() {
        const raw = localStorage.getItem(key);
        if (raw === null) return [];
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) throw new Error("Saved library is invalid.");
        items.forEach(validate);
        if (new Set(items.map(item => `${item.type}:${item.id}`)).size !== items.length) throw new Error("Duplicate saved records.");
        return items;
    }
    function save(items) {
        localStorage.setItem(key, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent("saved-items-updated"));
    }
    window.SavedStore = {
        list: load,
        add(input) {
            let item = { body: "", reference: "", ...input, savedAt: new Date().toISOString() };
            // Event bookmarks retain only IDs; restricted feed text is fetched under current authorization.
            if (item.type === "event") {
                item = { type: "event", id: input.id, title: "Saved event", body: "", reference: "", savedAt: item.savedAt };
            }
            validate(item);
            const items = load().filter(old => old.type !== item.type || old.id !== item.id);
            save([item, ...items]);
            return item;
        },
        remove(type, id) { save(load().filter(item => item.type !== type || item.id !== id)); },
        has(type, id) { return load().some(item => item.type === type && item.id === id); }
    };
    window.SavedStore.attach = (button, item, feedback) => {
        const render = () => {
            try {
                const saved = window.SavedStore.has(item.type, item.id);
                button.textContent = saved ? "Remove from saved" : `Save ${item.type}`;
                button.setAttribute("aria-pressed", String(saved));
            } catch (error) {
                feedback.textContent = "Saved items could not be loaded. Check browser storage.";
                console.error("Unable to load saved items:", error);
                button.disabled = true;
            }
        };
        button.addEventListener("click", () => {
            try {
                if (window.SavedStore.has(item.type, item.id)) window.SavedStore.remove(item.type, item.id);
                else window.SavedStore.add(item);
                render();
                feedback.textContent = "Saved library updated on this device.";
            } catch (error) {
                feedback.textContent = "Could not update Saved. Your previous saved items are unchanged.";
                console.error("Unable to save item:", error);
            }
        });
        render();
    };
})();
