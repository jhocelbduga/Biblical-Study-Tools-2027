(() => {
    const groups = [
        { title: "Daily verses and news", items: [
            { id: "pushVerseText", label: "Verse of the day text", time: true },
            { id: "pushVerseImage", label: "Verse of the day image", time: true },
            { id: "pushBibleNews", label: "News from Bible App" }
        ] },
        { title: "Plans", plan: "pushMyPlan", planLabel: "My plans", items: [
            { id: "planParticipantComments", label: "When community participants post a comment" },
            { id: "planInvitationAccepted", label: "When community participants accept an invitation" },
            { id: "planInvitations", label: "When invited to join a plan" }
        ] },
        { title: "Friends", items: [
            { id: "friendRequests", label: "Friend request" },
            { id: "friendsActivity", label: "Friends' activity" },
            { id: "activityComments", label: "Comments on my activity" },
            { id: "activityLikes", label: "Someone likes my activity" },
            { id: "contactJoins", label: "When a contact joins" },
            { id: "friendEncouragement", label: "Encouragement from friends" }
        ] },
        { title: "Prayer", plan: "pushPrayerPlan", planLabel: "Remind me to pray", items: [
            { id: "dailyPrayerReminder", label: "Prayer reminder: take a moment to pray, remind me daily", time: true },
            { id: "friendsSharePrayer", label: "When friends share prayer" },
            { id: "friendsPrayForYou", label: "When friends pray for you" },
            { id: "friendsUpdatePrayers", label: "When friends update prayers" },
            { id: "sharedPrayerComments", label: "Comments on shared prayers" }
        ] },
        { title: "My Church", items: [
            { id: "churchFeaturedPlan", label: "When My Church features a Plan" },
            { id: "churchPosts", label: "When My Church creates a post" }
        ] },
        { title: "Bible Study App Activity", items: [
            { id: "streakReminders", label: "Streak reminders" },
            { id: "badgeEarned", label: "When I earn a badge" }
        ] }
    ];
    function node(tag, text = "", className = "") {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    window.PushPreferences = {
        groups,
        render({ container, preferences, save, plans, feedback }) {
            container.replaceChildren();
            const commit = (key, value) => {
                const next = { ...preferences, [key]: value };
                if (!save(next)) return false;
                Object.assign(preferences, next);
                return true;
            };
            groups.forEach(group => {
                const section = node("section", "", "push-preference-group");
                const heading = node("h3", group.title, "h6 fw-bold text-uppercase mt-4 mb-3");
                heading.id = `push-group-${group.items[0].id}`;
                section.setAttribute("aria-labelledby", heading.id);
                section.append(heading);
                if (group.plan) {
                    const label = node("label", group.planLabel, "form-label fw-medium");
                    const select = node("select", "", "form-select mb-3");
                    select.id = `push-${group.plan}`;
                    label.htmlFor = select.id;
                    const placeholder = node("option", plans.length ? "Select a saved reading plan" : "No saved reading plans");
                    placeholder.value = "";
                    select.append(placeholder);
                    plans.forEach(plan => {
                        const option = node("option", plan.title);
                        option.value = plan.id;
                        select.append(option);
                    });
                    const saved = preferences[group.plan];
                    select.value = plans.some(plan => plan.id === saved) ? saved : "";
                    select.disabled = plans.length === 0;
                    if (saved && !plans.some(plan => plan.id === saved)) {
                        section.append(node("p", "The previously selected plan is no longer saved. Choose another plan.", "small text-warning"));
                    }
                    select.addEventListener("change", () => {
                        if (!commit(group.plan, select.value)) select.value = plans.some(plan => plan.id === preferences[group.plan]) ? preferences[group.plan] : "";
                    });
                    section.append(label, select);
                }
                group.items.forEach(item => {
                    const row = node("div", "", "notification-preference");
                    const label = node("label", item.label, "form-check-label fw-medium");
                    const wrap = node("span", "", "form-check form-switch mb-0 flex-shrink-0");
                    const toggle = node("input", "", "form-check-input");
                    toggle.id = `push-${item.id}`;
                    toggle.type = "checkbox";
                    toggle.role = "switch";
                    toggle.checked = preferences[item.id] === true;
                    toggle.setAttribute("aria-label", `${item.label}, push notification`);
                    label.htmlFor = toggle.id;
                    wrap.append(toggle);
                    row.append(label, wrap);
                    section.append(row);
                    let time;
                    const timeKey = `${item.id}Time`;
                    if (item.time) {
                        const timeRow = node("div", "", "mb-3 mt-2");
                        const timeLabel = node("label", "Select time (device local time)", "form-label small");
                        time = node("input", "", "form-control");
                        time.id = `push-${timeKey}`;
                        time.type = "time";
                        time.required = true;
                        const savedTime = preferences[timeKey];
                        const valid = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
                        time.value = valid(savedTime) ? savedTime : "08:00";
                        if (savedTime !== undefined && !valid(savedTime)) {
                            feedback.textContent = "A saved reminder time is invalid. Choose a valid time and save it again.";
                            console.error("Invalid saved push reminder time:", timeKey);
                        }
                        time.disabled = !toggle.checked;
                        timeLabel.htmlFor = time.id;
                        time.addEventListener("change", () => {
                            if (!valid(time.value)) {
                                feedback.textContent = "Choose a valid reminder time.";
                                time.value = valid(preferences[timeKey]) ? preferences[timeKey] : "08:00";
                                return;
                            }
                            if (!commit(timeKey, time.value)) time.value = valid(preferences[timeKey]) ? preferences[timeKey] : "08:00";
                        });
                        timeRow.append(timeLabel, time);
                        section.append(timeRow);
                    }
                    toggle.addEventListener("change", () => {
                        const next = { ...preferences, [item.id]: toggle.checked };
                        if (time && toggle.checked) next[timeKey] = time.value;
                        if (save(next)) Object.assign(preferences, next);
                        else toggle.checked = preferences[item.id] === true;
                        if (time) time.disabled = !toggle.checked;
                    });
                });
                container.append(section);
            });
        }
    };
})();
