import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL("./videos-data.js", import.meta.url), "utf8"), context);
const library = context.window.VideoLibrary;

test("catalog entries have unique IDs, official URLs, and complete metadata", () => {
    assert.equal(library.items.length, 12);
    assert.equal(new Set(library.items.map(item => item.id)).size, library.items.length);
    for (const item of library.items) {
        const url = new URL(item.url);
        assert.equal(url.origin, "https://www.bible.com");
        assert.ok(url.pathname.startsWith("/videos/"));
        assert.ok(item.title && item.provider && item.category && item.summary);
        assert.ok(["Video", "Collection"].includes(item.type));
        assert.equal(url.pathname.includes("/collections/"), item.type === "Collection");
    }
});

test("search matches title, provider, and topic regardless of case or whitespace", () => {
    assert.equal(library.filter({ query: "  JONAH  " }).length, 2);
    assert.equal(library.filter({ query: "bibleproject" }).length, 5);
    assert.equal(library.filter({ query: "old testament" }).length, 3);
    assert.equal(library.filter({ query: "bible literary" }).length, 1);
});

test("category, provider, and format filters combine with search", () => {
    assert.equal(library.filter({
        query: "Jesus", category: "Life of Jesus", provider: "BibleProject", type: "Video"
    }).length, 2);
    assert.equal(library.filter({ type: "Collection" }).length, 4);
    assert.equal(library.filter({ provider: "Streetlights" }).length, 2);
    assert.equal(library.filter({ category: "New Testament", type: "Video" }).length, 0);
});

test("empty results and resetting filters do not mutate the catalog", () => {
    assert.equal(library.filter({ query: "no-such-video" }).length, 0);
    assert.equal(library.filter().length, 12);
    assert.equal(library.items.length, 12);
    assert.ok(Object.isFrozen(library.items));
});

function watchPage(search) {
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                hidden: true,
                setAttribute(name, value) { this[name] = value; }
            });
            return elements.get(id);
        }
    };
    const context = vm.createContext({
        window: { location: { search }, VideoLibrary: library },
        document, URLSearchParams
    });
    vm.runInContext(readFileSync(new URL("./watch.js", import.meta.url), "utf8"), context);
    return document;
}

test("watch landing resolves every catalog video to its official provider", () => {
    for (const item of library.items) {
        const document = watchPage(`?video=${encodeURIComponent(item.id)}`);
        assert.equal(document.getElementById("watchTitle").textContent, item.title);
        assert.equal(document.getElementById("watchOfficialLink").href, item.url);
        assert.equal(document.getElementById("watchOfficialLink").hidden, false);
        assert.equal(document.getElementById("watchNotice").hidden, false);
    }
});

test("missing and unrecognized video IDs show an error without a playback link", () => {
    for (const search of ["", "?video=unknown", "?video=https://example.com"]) {
        const document = watchPage(search);
        assert.ok(document.getElementById("watchFeedback").textContent);
        assert.equal(document.getElementById("watchOfficialLink").hidden, true);
        assert.equal(document.getElementById("watchOfficialLink").href, undefined);
    }
});
