(() => {
    const types = new Set(["achievement", "completion", "verse_shared", "reflection", "post"]);
    window.ActivityEvents = {
        register(type) {
            if (!/^[a-z][a-z_]{0,39}$/.test(type)) throw new Error("Invalid activity type.");
            types.add(type);
        },
        emit(type, content) {
            if (!types.has(type)) throw new Error(`Unsupported activity type: ${type}`);
            const detail = { ...content, type, eventKey: content.eventKey || crypto.randomUUID() };
            window.dispatchEvent(new CustomEvent("bst-activity", { detail }));
            return detail.eventKey;
        }
    };
})();
