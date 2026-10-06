import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");

function createHarness({ confirm = true, failStorage = false, savedState } = {}) {
    class Element {
        constructor() {
            this.children = [];
            this.listeners = {};
            this.dataset = {};
            this.style = {};
            this.value = "all";
        }
        addEventListener(type, callback) { this.listeners[type] = callback; }
        append(...children) { this.children.push(...children); }
        appendChild(child) { this.append(child); }
        replaceChildren(...children) { this.children = children; }
        setAttribute() {}
        querySelectorAll() { return []; }
        matches() { return true; }
    }
    const elements = new Map();
    const document = {
        addEventListener() {},
        querySelectorAll: () => [],
        createElement: () => new Element(),
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, new Element());
            return elements.get(id);
        }
    };
    document.getElementById("readingPlanSearch").value = "";
    const original = {
        activePlanId: "topical",
        plans: { topical: { currentDay: 1, completedDays: [], completedAt: {} } }
    };
    let stored = JSON.stringify(savedState || original);
    const events = [];
    const windowListeners = {};
    const errors = [];
    let prompts = 0;
    const context = vm.createContext({
        document,
        URLSearchParams,
        HTMLInputElement: Element,
        localStorage: {
            getItem: () => stored,
            setItem(key, value) {
                if (failStorage) throw new Error("Storage unavailable");
                stored = value;
            }
        },
        window: {
            location: { search: "" },
            confirm() { prompts++; return confirm; },
            addEventListener(type, callback) { windowListeners[type] = callback; },
            dispatchEvent(event) {
                events.push(event);
                windowListeners[event.type]?.(event);
            }
        },
        CustomEvent: class {
            constructor(type, options) { this.type = type; this.detail = options.detail; }
        },
        console: { error: (...args) => errors.push(args) }
    });
    vm.runInContext(source, context);
    vm.runInContext("initialiseReadingPlans()", context);
    function change(index, checked) {
        const checkbox = new Element();
        checkbox.dataset.readingIndex = String(index);
        checkbox.checked = checked;
        document.getElementById("readingPassages").listeners.change({ target: checkbox });
    }
    return {
        context, document, change, events, errors,
        stored: () => JSON.parse(stored),
        prompts: () => prompts,
        completedRows: () => document.getElementById("readingPassages").children
            .filter(row => row.className.includes("is-completed")).length
    };
}

test("confirmed passage changes persist, highlight, and notify analytics", () => {
    const app = createHarness();
    app.change(0, true);
    assert.equal(app.prompts(), 1);
    assert.deepEqual(app.stored().plans.topical.completedReadings[1], [0]);
    assert.deepEqual(app.stored().plans.topical.completedDays, []);
    assert.equal(app.completedRows(), 1);
    assert.equal(app.events.length, 1);
    assert.equal(app.events[0].type, "reading-plan-progress-updated");
    app.change(1, true);
    assert.deepEqual(app.stored().plans.topical.completedDays, [1]);
    assert.match(app.stored().plans.topical.completedAt[1], /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(app.completedRows(), 2);
    app.change(0, false);
    assert.deepEqual(app.stored().plans.topical.completedDays, []);
    assert.equal(app.stored().plans.topical.completedAt[1], undefined);
    assert.equal(app.completedRows(), 1);
});

test("canceling changes leaves storage, highlighting, and analytics unchanged", () => {
    const app = createHarness({ confirm: false });
    const before = app.stored();
    app.change(0, true);
    assert.deepEqual(app.stored(), before);
    assert.equal(app.completedRows(), 0);
    assert.equal(app.events.length, 0);
    assert.match(app.document.getElementById("readingPlanFeedback").textContent, /canceled/);
});

test("storage failures roll back changes without notifying analytics", () => {
    const app = createHarness({ failStorage: true });
    const before = app.stored();
    app.change(0, true);
    assert.deepEqual(app.stored(), before);
    assert.equal(app.completedRows(), 0);
    assert.equal(app.events.length, 0);
    assert.equal(app.errors.length, 1);
    assert.match(app.document.getElementById("readingPlanFeedback").textContent, /Could not save/);
});

test("whole-day button confirms and marks all passages, preserving auto-advance", () => {
    const app = createHarness();
    app.document.getElementById("completeReadingDay").listeners.click();
    const progress = app.stored().plans.topical;
    assert.equal(app.prompts(), 1);
    assert.deepEqual(progress.completedReadings[1], [0, 1]);
    assert.deepEqual(progress.completedDays, [1]);
    assert.equal(progress.currentDay, 2);
    assert.equal(app.events.length, 1);
});

test("legacy completed days highlight all passages and partial records are deduplicated", () => {
    const app = createHarness();
    const result = vm.runInContext(`JSON.stringify([
        completedReadingIndices(READING_PLANS.topical, { completedDays: [1] }, 1),
        completedReadingIndices(READING_PLANS.topical, {
            completedDays: [], completedReadings: { 1: [0, 0, -1, 99, "1"] }
        }, 1)
    ])`, app.context);
    assert.deepEqual(JSON.parse(result), [[0, 1], [0]]);
});

test("saved partial passage highlighting survives reinitialization", () => {
    const app = createHarness();
    app.change(0, true);
    const reloaded = createHarness({ savedState: app.stored() });
    assert.equal(reloaded.completedRows(), 1);
    assert.deepEqual(reloaded.stored().plans.topical.completedDays, []);
});

test("analytics refreshes passage totals, complete days, and history after saving and undoing", () => {
    const app = createHarness();
    vm.runInContext("initialiseBibleAnalytics()", app.context);
    const text = id => app.document.getElementById(id).textContent;
    app.change(0, true);
    assert.equal(text("statCompletedPassages"), "1");
    assert.equal(text("statCompletedDays"), "0");
    app.change(1, true);
    assert.equal(text("statCompletedPassages"), "2");
    assert.equal(text("statCompletedDays"), "1");
    assert.equal(text("historySummary"), "1 day in the last 7 days");
    app.change(1, false);
    assert.equal(text("statCompletedPassages"), "1");
    assert.equal(text("statCompletedDays"), "0");
    assert.equal(text("historySummary"), "0 days in the last 7 days");
});
