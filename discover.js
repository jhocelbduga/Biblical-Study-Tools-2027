(() => {
    const VERSES = [
        { id: "psalm-23-1", ref: "Psalm 23:1", topics: ["Peace", "Trust"], text: "The LORD is my shepherd; I shall not want." },
        { id: "psalm-46-1", ref: "Psalm 46:1", topics: ["Strength", "Peace"], text: "God is our refuge and strength, a very present help in trouble." },
        { id: "proverbs-3-5", ref: "Proverbs 3:5", topics: ["Trust", "Wisdom"], text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
        { id: "jeremiah-29-11", ref: "Jeremiah 29:11", topics: ["Hope"], text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
        { id: "philippians-4-13", ref: "Philippians 4:13", topics: ["Strength"], text: "I can do all things through Christ which strengtheneth me." },
        { id: "john-3-16", ref: "John 3:16", topics: ["Love", "Hope"], text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
        { id: "romans-8-28", ref: "Romans 8:28", topics: ["Hope", "Trust"], text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
        { id: "isaiah-41-10", ref: "Isaiah 41:10", topics: ["Courage", "Strength", "Peace"], text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
        { id: "joshua-1-9", ref: "Joshua 1:9", topics: ["Courage"], text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest." }
    ];

    const topics = ["All", ...new Set(VERSES.flatMap((verse) => verse.topics))].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)));
    const chips = document.getElementById("discoverChips");
    const results = document.getElementById("discoverResults");
    const count = document.getElementById("discoverCount");
    const empty = document.getElementById("discoverEmpty");
    const input = document.getElementById("discoverSearch");
    let activeTopic = "All";

    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function renderChips() {
        chips.innerHTML = topics.map((topic) =>
            `<button type="button" class="btn btn-sm ${topic === activeTopic ? "btn-primary" : "btn-outline-secondary"} rounded-pill" data-topic="${escapeHtml(topic)}" aria-pressed="${topic === activeTopic}">${escapeHtml(topic)}</button>`
        ).join("");
    }

    function render() {
        const query = input.value.trim().toLowerCase();
        const matches = VERSES.filter((verse) =>
            (activeTopic === "All" || verse.topics.includes(activeTopic)) &&
            (!query || `${verse.ref} ${verse.text} ${verse.topics.join(" ")}`.toLowerCase().includes(query))
        );
        results.innerHTML = matches.map((verse) => `
            <div class="col-12 col-md-6 col-lg-4">
                <article class="card h-100 discover-card">
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">${verse.topics.map((t) => `<span class="badge rounded-pill discover-tag me-1">${escapeHtml(t)}</span>`).join("")}</div>
                        <blockquote class="mb-3 flex-grow-1">“${escapeHtml(verse.text)}”</blockquote>
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${escapeHtml(verse.ref)}</strong>
                            <a class="btn btn-sm btn-outline-primary" href="index.html?verse=${encodeURIComponent(verse.id)}">Open <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                        </div>
                    </div>
                </article>
            </div>`).join("");
        empty.hidden = matches.length > 0;
        count.textContent = `${matches.length} verse${matches.length === 1 ? "" : "s"}${activeTopic === "All" ? "" : ` about ${activeTopic.toLowerCase()}`}`;
    }

    chips.addEventListener("click", (event) => {
        const button = event.target.closest("[data-topic]");
        if (!button) return;
        activeTopic = button.dataset.topic;
        renderChips();
        render();
    });
    input.addEventListener("input", render);
    document.getElementById("discoverSearchForm").addEventListener("submit", (event) => event.preventDefault());

    renderChips();
    render();
})();
