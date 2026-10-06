import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function harness(saved = null, failSave = false) {
    const fields = {};
    let events = 0;
    const document = {
        getElementById(id) {
            return fields[id] ||= {
                children: [],
                replaceChildren() { this.children = []; },
                appendChild(item) { this.children.push(item); }
            };
        },
        createElement: () => ({})
    };
    const window = { dispatchEvent() { events++; } };
    vm.runInNewContext(readFileSync(new URL("./plan-milestones.js", import.meta.url), "utf8"), {
        window, document, console: { error() {} }, CustomEvent: class {},
        localStorage: {
            getItem: () => saved,
            setItem(key, value) {
                assert.equal(key, "bstPlanAchievements");
                if (failSave) throw new Error("Storage full");
                saved = value;
            }
        }
    });
    return { update: metrics => window.PlanMilestones.update(metrics), notifications: () => window.PlanMilestones.notifications(), fields, saved: () => saved, events: () => events };
}

test("plan milestone thresholds use exact day, passage and finished-plan totals", () => {
    const app = harness();
    app.update({ days: 0, passages: 0, plans: 0 });
    assert.equal(app.notifications().length, 0);
    app.update({ days: 6, passages: 9, plans: 0 });
    assert.deepEqual(Object.keys(JSON.parse(app.saved())).sort(), ["days-1", "passages-1"]);
    app.update({ days: 7, passages: 10, plans: 1 });
    assert.deepEqual(Object.keys(JSON.parse(app.saved())).sort(), ["days-1", "days-7", "passages-1", "passages-10", "plans-1"]);
    assert.match(app.fields.planMilestoneTotals.textContent, /10 passages.*7 completed days.*1 finished/);
});

test("earned milestones do not repeat and survive undo and reload", () => {
    const app = harness();
    const metrics = { days: 30, passages: 100, plans: 3 };
    app.update(metrics);
    const saved = app.saved();
    const events = app.events();
    app.update(metrics);
    app.update({ days: 0, passages: 0, plans: 0 });
    assert.equal(app.saved(), saved);
    assert.equal(app.events(), events);
    const reloaded = harness(saved);
    reloaded.update(metrics);
    assert.equal(reloaded.events(), 0);
    assert.equal(reloaded.notifications().length, 9);
});

test("failed or corrupt storage never claims a new achievement", () => {
    const failing = harness(null, true);
    failing.update({ days: 1, passages: 1, plans: 0 });
    assert.equal(failing.events(), 0);
    assert.equal(failing.notifications().length, 0);
    assert.match(failing.fields.planAchievementFeedback.textContent, /could not be saved/);
    const corrupt = harness("{");
    corrupt.update({ days: 1, passages: 1, plans: 0 });
    assert.equal(corrupt.saved(), "{");
    assert.equal(corrupt.notifications().length, 0);
    assert.match(corrupt.fields.planAchievementFeedback.textContent, /could not be loaded/);
});

test("achievement events immediately refresh the existing notification inbox and badge", () => {
    const fields = {};
    const makeElement = () => ({
        children: [], listeners: {}, attributes: {},
        replaceChildren() { this.children = []; },
        append(...items) { this.children.push(...items); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(type, callback) { this.listeners[type] = callback; }
    });
    const document = {
        getElementById(id) { return fields[id] ||= makeElement(); },
        createElement: makeElement,
        querySelectorAll: () => []
    };
    const events = {};
    let achievements = [];
    const window = {
        PlanMilestones: { notifications: () => achievements },
        addEventListener(type, callback) { events[type] = callback; }
    };
    const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
    const start = source.indexOf("function initialiseNotifications()");
    const end = source.indexOf("function initialiseTheme()", start);
    vm.runInNewContext(`${source.slice(start, end)}\ninitialiseNotifications();`, {
        window, document, console,
        localStorage: { getItem: () => null, setItem() {} }
    });
    assert.equal(fields.notificationList.children.length, 3);
    assert.equal(typeof events["reading-achievements-updated"], "function");
    achievements = [{ id: "achievement-days-1", icon: "bi-trophy", title: "1 plan day completed", message: "Earned today", category: "Reading achievement" }];
    events["reading-achievements-updated"]();
    assert.equal(fields.notificationList.children.length, 4);
    assert.equal(fields.notificationBadge.textContent, "4");
    fields.markNotificationsReadButton.listeners.click();
    assert.equal(fields.notificationBadge.hidden, true);
});
