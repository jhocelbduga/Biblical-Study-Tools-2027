(() => {
    const key = "bstVerseDesign";
    const themes = ["sage", "ocean", "parchment", "night"];
    const layouts = ["classic", "centered", "minimal"];
    const defaults = { theme: "sage", layout: "classic" };
    const card = document.getElementById("dailyVerseCard");
    const preview = document.getElementById("verse-generator");
    const theme = document.getElementById("verseTheme");
    const layout = document.getElementById("verseLayout");
    const feedback = document.getElementById("verseDesignFeedback");
    let settings = { ...defaults };

    function render() {
        for (const element of [card, preview]) {
            element.dataset.verseTheme = settings.theme;
            element.dataset.verseLayout = settings.layout;
        }
        theme.value = settings.theme;
        layout.value = settings.layout;
    }

    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed || !themes.includes(parsed.theme) || !layouts.includes(parsed.layout)) {
                throw new Error("Invalid saved verse design.");
            }
            settings = { theme: parsed.theme, layout: parsed.layout };
        }
    } catch (error) {
        feedback.textContent = "Could not load your saved design. The default is shown; choose a design to save it again.";
        console.error("Unable to load verse design:", error);
    }
    render();

    function save(next) {
        try {
            localStorage.setItem(key, JSON.stringify(next));
            settings = next;
            feedback.textContent = "Design saved on this device. Shared links and existing verse images keep their original design.";
        } catch (error) {
            feedback.textContent = "Could not save your design. Your previous design is unchanged.";
            console.error("Unable to save verse design:", error);
        }
        render();
    }

    theme.addEventListener("change", () => save({ ...settings, theme: theme.value }));
    layout.addEventListener("change", () => save({ ...settings, layout: layout.value }));
    document.getElementById("resetVerseDesign").addEventListener("click", () => save({ ...defaults }));
})();
