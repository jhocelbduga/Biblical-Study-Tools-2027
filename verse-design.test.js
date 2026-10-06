import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./verse-design.js", import.meta.url), "utf8");
function harness(saved = null, failSave = false) {
    const elements = new Map();
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, {
                dataset: {}, listeners: {},
                addEventListener(type, listener) { this.listeners[type] = listener; }
            });
            return elements.get(id);
        }
    };
    vm.runInNewContext(source, {
        document, console: { error() {} },
        localStorage: {
            getItem: () => saved,
            setItem(key, value) {
                assert.equal(key, "bstVerseDesign");
                if (failSave) throw new Error("Storage full");
                saved = value;
            }
        }
    });
    return { field: id => document.getElementById(id), saved: () => JSON.parse(saved) };
}

test("all theme and layout choices update both cards and persist", () => {
    const app = harness();
    for (const theme of ["sage", "ocean", "parchment", "night"]) {
        for (const layout of ["classic", "centered", "minimal"]) {
            app.field("verseTheme").value = theme;
            app.field("verseTheme").listeners.change();
            app.field("verseLayout").value = layout;
            app.field("verseLayout").listeners.change();
            assert.deepEqual(app.saved(), { theme, layout });
            for (const id of ["dailyVerseCard", "verse-generator"]) {
                assert.equal(app.field(id).dataset.verseTheme, theme);
                assert.equal(app.field(id).dataset.verseLayout, layout);
            }
        }
    }
});

test("saved designs reload and reset restores the defaults", () => {
    const app = harness('{"theme":"night","layout":"centered"}');
    assert.equal(app.field("verseTheme").value, "night");
    assert.equal(app.field("verseLayout").value, "centered");
    app.field("resetVerseDesign").listeners.click();
    assert.deepEqual(app.saved(), { theme: "sage", layout: "classic" });
});

test("save failure restores previous design and shows an error", () => {
    const app = harness('{"theme":"night","layout":"centered"}', true);
    app.field("verseTheme").value = "ocean";
    app.field("verseTheme").listeners.change();
    assert.equal(app.field("verseTheme").value, "night");
    assert.equal(app.field("dailyVerseCard").dataset.verseTheme, "night");
    assert.match(app.field("verseDesignFeedback").textContent, /Could not save/);
});

test("invalid saved preferences report the error and display defaults", () => {
    for (const saved of ["null", "{", '{"theme":"invalid","layout":"classic"}']) {
        const app = harness(saved);
        assert.equal(app.field("verseTheme").value, "sage");
        assert.match(app.field("verseDesignFeedback").textContent, /Could not load/);
    }
});
