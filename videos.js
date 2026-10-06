(() => {
    const library = window.VideoLibrary;
    const catalog = document.getElementById("videoCatalog");
    const preview = document.getElementById("videoPreview");
    const providerStyles = {
        BibleProject: "video-art-bibleproject",
        "Spoken Gospel": "video-art-spoken",
        Streetlights: "video-art-streetlights",
        "Bible App collections": "video-art-collection"
    };

    function card(item) {
        const column = document.createElement("div");
        column.className = "col-12 col-md-6 col-xl-4";
        const article = document.createElement("article");
        article.className = "card video-card h-100";
        const artwork = document.createElement("div");
        artwork.className = `video-art ${providerStyles[item.provider]}`;
        artwork.setAttribute("aria-hidden", "true");
        const icon = document.createElement("i");
        icon.className = `bi ${item.type === "Collection" ? "bi-collection-play" : "bi-play-circle"}`;
        const topic = document.createElement("span");
        topic.textContent = item.category;
        artwork.append(icon, topic);
        const body = document.createElement("div");
        body.className = "card-body d-flex flex-column";
        const meta = document.createElement("p");
        meta.className = "small text-body-secondary mb-2";
        meta.textContent = `${item.provider} · ${item.type}`;
        const title = document.createElement("h3");
        title.className = "h5 fw-bold";
        title.textContent = item.title;
        const summary = document.createElement("p");
        summary.className = "text-body-secondary";
        summary.textContent = item.summary;
        const link = document.createElement("a");
        link.className = "btn btn-outline-primary mt-auto align-self-start";
        link.href = `watch.html?video=${encodeURIComponent(item.id)}`;
        link.textContent = item.type === "Collection" ? "Explore collection" : "Watch video";
        link.setAttribute("aria-label", `${link.textContent}: ${item.title}`);
        body.append(meta, title, summary, link);
        article.append(artwork, body);
        column.appendChild(article);
        return column;
    }

    if (preview) {
        preview.replaceChildren(...library.items.filter(item =>
            ["what-is-the-bible", "jonah", "i-am"].includes(item.id)
        ).map(card));
    }
    if (!catalog) return;

    const search = document.getElementById("videoSearch");
    const category = document.getElementById("videoCategory");
    const provider = document.getElementById("videoProvider");
    const type = document.getElementById("videoType");
    const resultCount = document.getElementById("videoResultCount");
    const empty = document.getElementById("videoEmpty");
    const featured = document.getElementById("videoFeatured");

    [category, provider].forEach((select, index) => {
        const field = index === 0 ? "category" : "provider";
        [...new Set(library.items.map(item => item[field]))].sort().forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
    });

    function render() {
        const matches = library.filter({
            query: search.value, category: category.value, provider: provider.value, type: type.value
        });
        resultCount.textContent = `${matches.length} ${matches.length === 1 ? "result" : "results"}`;
        empty.hidden = matches.length !== 0;
        featured.hidden = search.value.trim() !== "" || [category, provider, type].some(select => select.value !== "all");
        catalog.replaceChildren();
        [...new Set(matches.map(item => item.provider))].forEach(name => {
            const section = document.createElement("section");
            section.className = "mb-5";
            const heading = document.createElement("h2");
            heading.className = "h3 mb-3";
            heading.textContent = name;
            const row = document.createElement("div");
            row.className = "row g-3";
            row.append(...matches.filter(item => item.provider === name).map(card));
            section.append(heading, row);
            catalog.appendChild(section);
        });
    }

    search.addEventListener("input", render);
    [category, provider, type].forEach(select => select.addEventListener("change", render));
    document.getElementById("videoSearchForm").addEventListener("submit", event => event.preventDefault());
    document.getElementById("resetVideoFilters").addEventListener("click", () => {
        search.value = "";
        [category, provider, type].forEach(select => { select.value = "all"; });
        render();
        search.focus();
    });
    render();
})();
