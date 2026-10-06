import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function harness({ preferences = {}, plans = [], fail = false } = {}) {
    const nodes = [];
    const createElement = tag => {
        const element = {
            tag, children: [], listeners: {}, value: "", textContent: "",
            append(...children) { this.children.push(...children); },
            replaceChildren() { this.children = []; },
            setAttribute() {}, addEventListener(type, callback) { this.listeners[type] = callback; }
        };
        nodes.push(element);
        return element;
    };
    const window = {};
    vm.runInNewContext(readFileSync(new URL("./push-preferences.js", import.meta.url), "utf8"), {
        window, document: { createElement }, console: { error() {} }
    });
    const container = createElement("div");
    const feedback = {};
    let saved;
    const render = nextPlans => window.PushPreferences.render({
        container, feedback, preferences, plans: nextPlans || plans,
        save(next) { if (fail) { feedback.textContent = "Could not save"; return false; } saved = JSON.parse(JSON.stringify(next)); return true; }
    });
    render();
    return { nodes, feedback, preferences, saved: () => saved, render,
        get: id => nodes.findLast(node => node.id === id), groups: window.PushPreferences.groups };
}
test("push screen contains every requested category, 21 switches, three times and two plan selectors", () => {
    const app = harness();
    assert.deepEqual(Array.from(app.groups, group => group.title), [
        "Daily verses and news", "Plans", "Friends", "Prayer", "My Church", "Bible Study App Activity"
    ]);
    assert.equal(app.nodes.filter(node => node.type === "checkbox").length, 21);
    assert.equal(app.nodes.filter(node => node.type === "time").length, 3);
    assert.equal(app.nodes.filter(node => node.tag === "select").length, 2);
    for (const group of app.groups) for (const item of group.items) {
        assert.equal(app.get(`push-${item.id}`).checked, false);
    }
});
test("verse times persist independently, disabling retains times and email settings are untouched", () => {
    const app = harness({ preferences: { verseOfTheDayText: true, friendRequests: true } });
    const text = app.get("push-pushVerseText");
    const time = app.get("push-pushVerseTextTime");
    assert.equal(time.disabled, true);
    text.checked = true;
    text.listeners.change();
    assert.equal(time.disabled, false);
    assert.equal(app.saved().pushVerseTextTime, "08:00");
    time.value = "21:45";
    time.listeners.change();
    assert.equal(app.saved().pushVerseTextTime, "21:45");
    text.checked = false;
    text.listeners.change();
    assert.equal(time.disabled, true);
    assert.equal(app.saved().pushVerseTextTime, "21:45");
    assert.equal(app.saved().verseOfTheDayText, true);
    assert.equal(app.get("push-friendRequests").checked, true);
    assert.equal(app.get("push-pushVerseImageTime").value, "08:00");
    const reloaded = harness({ preferences: app.saved() });
    assert.equal(reloaded.get("push-pushVerseTextTime").value, "21:45");
});
test("failed saves restore switches, times and plan selections without changing saved state", () => {
    const preferences = { pushVerseText: true, pushVerseTextTime: "09:30", pushMyPlan: "saved" };
    const app = harness({ preferences, plans: [{ id: "saved", title: "Saved plan" }], fail: true });
    const toggle = app.get("push-pushVerseText");
    toggle.checked = false;
    toggle.listeners.change();
    assert.equal(toggle.checked, true);
    assert.equal(app.get("push-pushVerseTextTime").disabled, false);
    const time = app.get("push-pushVerseTextTime");
    time.value = "10:00";
    time.listeners.change();
    assert.equal(time.value, "09:30");
    const plan = app.get("push-pushMyPlan");
    plan.value = "";
    plan.listeners.change();
    assert.equal(plan.value, "saved");
    assert.equal(preferences.pushVerseTextTime, "09:30");
});
test("both saved-plan dropdowns refresh, persist selection and handle empty or removed plans", () => {
    const app = harness();
    assert.equal(app.get("push-pushMyPlan").disabled, true);
    assert.equal(app.get("push-pushPrayerPlan").disabled, true);
    app.render([{ id: "saved", title: "<b>Saved plan</b>" }]);
    for (const id of ["push-pushMyPlan", "push-pushPrayerPlan"]) {
        const select = app.get(id);
        assert.equal(select.disabled, false);
        assert.equal(select.children[1].textContent, "<b>Saved plan</b>");
        select.value = "saved";
        select.listeners.change();
    }
    assert.equal(app.saved().pushMyPlan, "saved");
    assert.equal(app.saved().pushPrayerPlan, "saved");
    app.render([]);
    assert.equal(app.get("push-pushMyPlan").value, "");
    assert.equal(app.get("push-pushPrayerPlan").disabled, true);
    assert.ok(app.nodes.some(node => node.textContent.includes("no longer saved")));
});
test("invalid times are rejected and corrupt saved times surface feedback", () => {
    const app = harness({ preferences: { pushVerseTextTime: "25:70", pushVerseText: true } });
    assert.match(app.feedback.textContent, /invalid/);
    const time = app.get("push-pushVerseTextTime");
    assert.equal(time.value, "08:00");
    for (const value of ["", "24:00", "12:60"]) {
        time.value = value;
        time.listeners.change();
        assert.match(app.feedback.textContent, /valid reminder time/);
        assert.equal(time.value, "08:00");
        assert.equal(app.saved(), undefined);
    }
});
