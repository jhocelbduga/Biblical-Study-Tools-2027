(() => {
    const key = "bstPlanAchievements";
    const goals = [
        ...[1, 7, 30, 100].map(value => ({ id: `days-${value}`, metric: "days", value, title: `${value} plan day${value === 1 ? "" : "s"} completed` })),
        ...[1, 10, 50, 100].map(value => ({ id: `passages-${value}`, metric: "passages", value, title: `${value} plan passage${value === 1 ? "" : "s"} read` })),
        ...[1, 3, 6].map(value => ({ id: `plans-${value}`, metric: "plans", value, title: `${value} reading plan${value === 1 ? "" : "s"} finished` }))
    ];
    let earned = {};
    let available = true;
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" ||
                Object.entries(parsed).some(([id, at]) => !goals.some(goal => goal.id === id) ||
                    typeof at !== "string" || !Number.isFinite(Date.parse(at)))) {
                throw new Error("Invalid achievement records.");
            }
            earned = parsed;
        }
    } catch (error) {
        available = false;
        document.getElementById("planAchievementFeedback").textContent = "Saved achievements could not be loaded. Reading progress is still available; reload after checking browser storage.";
        console.error("Unable to load plan achievements:", error);
    }

    window.PlanMilestones = {
        notifications() {
            return goals.filter(goal => Object.hasOwn(earned, goal.id)).map(goal => ({
                id: `achievement-${goal.id}`, icon: "bi-trophy", title: goal.title,
                message: `Reading milestone earned on ${new Date(earned[goal.id]).toLocaleDateString()}.`,
                category: "Reading achievement"
            }));
        },
        update(metrics, announce = true) {
            const feedback = document.getElementById("planAchievementFeedback");
            document.getElementById("planMilestoneTotals").textContent =
                `${metrics.passages} passages read | ${metrics.days} completed days | ${metrics.plans} finished plans`;
            const newlyEarned = goals.filter(goal => available && metrics[goal.metric] >= goal.value && !Object.hasOwn(earned, goal.id));
            if (newlyEarned.length) {
                const next = { ...earned };
                newlyEarned.forEach(goal => { next[goal.id] = new Date().toISOString(); });
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                    earned = next;
                    if (announce) newlyEarned.forEach(goal => {
                        window.ActivityEvents?.emit("achievement", { body: goal.title });
                    });
                    if (announce) feedback.textContent = `Achievement unlocked: ${newlyEarned.map(goal => goal.title).join("; ")}!`;
                    window.dispatchEvent(new CustomEvent("reading-achievements-updated"));
                } catch (error) {
                    feedback.textContent = "Your reading progress is saved, but achievements could not be saved. They will be retried on the next update or reload.";
                    console.error("Unable to save plan achievements:", error);
                }
            }
            document.getElementById("planMilestoneCount").textContent = available
                ? `${Object.keys(earned).length} of ${goals.length} milestones earned`
                : "Saved achievements unavailable";
            const list = document.getElementById("planMilestoneList");
            list.replaceChildren();
            goals.forEach(goal => {
                const item = document.createElement("li");
                item.textContent = Object.hasOwn(earned, goal.id)
                    ? `Earned: ${goal.title}`
                    : `${goal.title} - ${Math.min(metrics[goal.metric], goal.value)} / ${goal.value}`;
                list.appendChild(item);
            });
        }
    };
})();
