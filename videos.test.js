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
