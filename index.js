/**
 * Biblical Study Tools
 * Main Application Entry Point
 */

document.addEventListener("DOMContentLoaded", () => {
    initialiseApp();
});

function initialiseApp() {
    initialiseTheme();
    initialiseVerseGenerator();
    initialiseReadingPlans();
    initialiseBibleAnalytics();
    initialiseSubscription();
    initialiseNotifications();
    initialiseInviteLanding();

    console.log("Biblical Study Tools Loaded");
}

const SUBSCRIBED_KEY = "bstSubscribed";

// A scanned friend or church QR code lands here first so new visitors are invited to subscribe.
function initialiseInviteLanding() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("friend") && !params.has("church")) return;
    const target = `profile.html${window.location.search}`;

    if (localStorage.getItem(SUBSCRIBED_KEY) === "1") {
        window.location.replace(target);
        return;
    }

    const modalElement = document.getElementById("subscribeModal");
    const form = document.getElementById("subscribeForm");
    const note = document.createElement("p");
    note.className = "alert alert-success py-2 small";
    note.textContent = params.has("friend")
        ? "You've been invited by a friend. Subscribe to join, then accept their friend request."
        : "You've been invited to join a church. Subscribe to join, then confirm as a parishioner.";
    form.querySelector(".modal-body").prepend(note);

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    let subscribedNow = false;
    modalElement.addEventListener("hidden.bs.modal", () => window.location.replace(target), { once: true });
    form.addEventListener("submit", () => {
        const watcher = setInterval(() => {
            if (localStorage.getItem(SUBSCRIBED_KEY) === "1" && !subscribedNow) {
                subscribedNow = true;
                clearInterval(watcher);
                setTimeout(() => modal.hide(), 1500);
            }
        }, 300);
        setTimeout(() => clearInterval(watcher), 15000);
    });
    modal.show();
}
function initialiseSubscription() {
    const form = document.getElementById("subscribeForm");
    const feedback = document.getElementById("subscribeFeedback");
    const submitButton = document.getElementById("subscribeSubmit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        submitButton.disabled = true;
        feedback.className = "small mt-3 mb-0 text-body-secondary";
        feedback.textContent = "Submitting your subscription…";

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.elements.name.value.trim(),
                    email: form.elements.email.value.trim(),
                    contact: form.elements.contact.value.trim()
                })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || "Your subscription could not be submitted. Please try again.");
            }

            form.reset();
            localStorage.setItem(SUBSCRIBED_KEY, "1");
            feedback.className = "small mt-3 mb-0 text-success";
            feedback.textContent = result.message;
        } catch (error) {
            feedback.className = "small mt-3 mb-0 text-danger";
            feedback.textContent = error instanceof Error
                ? error.message
                : "Your subscription could not be submitted. Please try again.";
            console.error("Unable to submit mailing-list subscription:", error);
        } finally {
            submitButton.disabled = false;
        }
    });
}

function initialiseNotifications() {
    const notifications = [
        {
            id: "welcome",
            icon: "bi-stars",
            title: "Welcome to Biblical Study Tools",
            message: "Explore the KJV Bible reader, daily verses, reading plans, and study tools.",
            category: "Getting started"
        },
        {
            id: "daily-verse",
            icon: "bi-book",
            title: "A verse for reflection",
            message: "“The LORD is my shepherd; I shall not want.” — Psalm 23:1",
            category: "Daily verse"
        },
        {
            id: "reading-plans",
            icon: "bi-calendar-check",
            title: "Build a reading habit",
            message: "Choose a plan to keep track of your Bible reading progress.",
            category: "Study tools"
        }
    ];
    const preferenceGroups = {
        email: [
            { id: "verseOfTheDayText", label: "Verse of the day (text)" },
            { id: "verseOfTheDayImage", label: "Verse of the day (image)" },
            { id: "bibleNews", label: "News from the Bible" }
        ],
        push: [
            { id: "friendRequests", label: "Friend requests" },
            { id: "friendsActivity", label: "Friends’ activity" },
            { id: "activityComments", label: "Comments on my activity" },
            { id: "activityLikes", label: "Likes on my activity" },
            { id: "contactJoins", label: "When a contact joins" },
            { id: "friendEncouragement", label: "Encouragement from friends" }
        ]
    };
    const readIdsKey = "notificationReadIds";
    const preferencesKey = "notificationPreferences";
    const inboxView = document.getElementById("notificationInboxView");
    const settingsView = document.getElementById("notificationSettingsView");
    const emailView = document.getElementById("emailNotificationView");
    const pushView = document.getElementById("pushNotificationView");
    const screenTitle = document.getElementById("notificationScreenTitle");
    const backButton = document.getElementById("notificationBackButton");
    const settingsButton = document.getElementById("notificationSettingsButton");
    const badge = document.getElementById("notificationBadge");
    const countLabel = document.getElementById("notificationCountLabel");
    const inboxFeedback = document.getElementById("notificationInboxFeedback");
    const settingsFeedback = document.getElementById("notificationSettingsFeedback");
    const readIds = loadStoredArray(readIdsKey).filter(id =>
        notifications.some(notification => notification.id === id) ||
        (window.PlanMilestones?.notifications() || []).some(notification => notification.id === id));
    const preferences = loadStoredObject(preferencesKey);
    let currentScreen = "inbox";

    function loadStoredArray(key) {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return [];
            const value = JSON.parse(stored);
            if (Array.isArray(value) && value.every(item => typeof item === "string")) return value;
            throw new TypeError(`Saved ${key} must be an array of strings.`);
        } catch (error) {
            console.error(`Unable to load ${key}:`, error);
            return [];
        }
    }

    function loadStoredObject(key) {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return {};
            const value = JSON.parse(stored);
            if (value && typeof value === "object" && !Array.isArray(value)) return value;
            throw new TypeError(`Saved ${key} must be an object.`);
        } catch (error) {
            console.error(`Unable to load ${key}:`, error);
            return {};
        }
    }

    function saveState(key, value, feedbackElement) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            feedbackElement.textContent = "Saved on this device.";
            feedbackElement.className = "small mt-3 mb-0 text-success";
            return true;
        } catch (error) {
            feedbackElement.textContent = "Could not save this change in your browser.";
            feedbackElement.className = "small mt-3 mb-0 text-danger";
            console.error(`Unable to save ${key}:`, error);
            return false;
        }
    }

    function renderInbox() {
        const inboxNotifications = [...(window.PlanMilestones?.notifications() || []), ...notifications];
        const list = document.getElementById("notificationList");
        const unreadCount = inboxNotifications.filter(notification => !readIds.includes(notification.id)).length;
        list.replaceChildren();

        inboxNotifications.forEach((notification) => {
            const isRead = readIds.includes(notification.id);
            const item = document.createElement("button");
            item.className = `notification-item${isRead ? "" : " is-unread"}`;
            item.type = "button";
            item.setAttribute("aria-label", `${notification.title}. ${notification.message}${isRead ? "" : ". Unread"}`);

            const icon = document.createElement("span");
            icon.className = "notification-item-icon";
            icon.setAttribute("aria-hidden", "true");
            const iconGraphic = document.createElement("i");
            iconGraphic.className = `bi ${notification.icon}`;
            icon.append(iconGraphic);

            const content = document.createElement("span");
            content.className = "notification-item-content";
            const title = document.createElement("span");
            title.className = "notification-item-title";
            title.textContent = notification.title;
            const message = document.createElement("span");
            message.className = "notification-item-message";
            message.textContent = notification.message;
            const category = document.createElement("span");
            category.className = "notification-item-category";
            category.textContent = notification.category;
            content.append(title, message, category);

            const unreadMarker = document.createElement("span");
            unreadMarker.className = "notification-unread-marker";
            unreadMarker.setAttribute("aria-hidden", "true");
            item.append(icon, content, unreadMarker);
            item.addEventListener("click", () => {
                if (isRead) return;
                const updatedReadIds = [...readIds, notification.id];
                if (saveState(readIdsKey, updatedReadIds, inboxFeedback)) {
                    readIds.splice(0, readIds.length, ...updatedReadIds);
                    renderInbox();
                }
            });
            list.append(item);
        });

        badge.textContent = String(unreadCount);
        badge.hidden = unreadCount === 0;
        countLabel.textContent = unreadCount === 0
            ? "No unread notifications"
            : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;
        document.getElementById("notificationsButton").setAttribute(
            "aria-label",
            unreadCount === 0 ? "Notifications, none unread" : `Notifications, ${unreadCount} unread`
        );
        document.getElementById("markNotificationsReadButton").disabled = unreadCount === 0;
    }

    function renderPreferences(groupName) {
        const container = document.getElementById(`${groupName}NotificationPreferences`);
        container.replaceChildren();

        preferenceGroups[groupName].forEach((preference) => {
            const row = document.createElement("div");
            row.className = "notification-preference";
            const label = document.createElement("label");
            label.className = "form-check-label fw-medium";
            label.htmlFor = `${groupName}-${preference.id}`;
            label.textContent = preference.label;
            const toggleLabel = document.createElement("span");
            toggleLabel.className = "form-check form-switch mb-0";
            const toggle = document.createElement("input");
            toggle.className = "form-check-input";
            toggle.type = "checkbox";
            toggle.role = "switch";
            toggle.id = `${groupName}-${preference.id}`;
            toggle.checked = preferences[preference.id] === true;
            toggle.setAttribute("aria-label", `${preference.label}, ${groupName} notification`);
            toggle.addEventListener("change", () => {
                const updatedPreferences = { ...preferences, [preference.id]: toggle.checked };
                if (saveState(preferencesKey, updatedPreferences, settingsFeedback)) {
                    Object.assign(preferences, updatedPreferences);
                } else {
                    toggle.checked = preferences[preference.id] === true;
                }
            });
            toggleLabel.append(toggle);
            row.append(label, toggleLabel);
            container.append(row);
        });
    }

    function showScreen(screen) {
        currentScreen = screen;
        inboxView.hidden = screen !== "inbox";
        settingsView.hidden = screen !== "settings";
        emailView.hidden = screen !== "email";
        pushView.hidden = screen !== "push";
        backButton.hidden = screen === "inbox";
        backButton.setAttribute(
            "aria-label",
            screen === "settings" ? "Back to notifications" : "Back to notification settings"
        );
        settingsButton.hidden = screen !== "inbox";
        screenTitle.textContent = {
            inbox: "Notifications",
            settings: "Notification settings",
            email: "Email notifications",
            push: "Push notifications"
        }[screen];
        settingsFeedback.textContent = "";
    }

    renderInbox();
    window.addEventListener("reading-achievements-updated", renderInbox);
    renderPreferences("email");
    renderPreferences("push");

    settingsButton.addEventListener("click", () => showScreen("settings"));
    backButton.addEventListener("click", () => {
        showScreen(currentScreen === "email" || currentScreen === "push" ? "settings" : "inbox");
    });
    document.querySelectorAll("[data-notification-screen]").forEach((button) => {
        button.addEventListener("click", () => showScreen(button.dataset.notificationScreen));
    });
    document.getElementById("markNotificationsReadButton").addEventListener("click", () => {
        const updatedReadIds = [...(window.PlanMilestones?.notifications() || []), ...notifications].map(notification => notification.id);
        if (saveState(readIdsKey, updatedReadIds, inboxFeedback)) {
            readIds.splice(0, readIds.length, ...updatedReadIds);
            renderInbox();
        }
    });
    document.getElementById("notificationsModal").addEventListener("hidden.bs.modal", () => {
        showScreen("inbox");
        inboxFeedback.textContent = "";
    });
}

/**
 * Theme Management
 */
function initialiseTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
        document.documentElement.setAttribute("data-bs-theme", savedTheme);
    }
}

/**
 * Verse Generator
 */
function initialiseVerseGenerator() {
    const verses = [
        {
            id: "jeremiah-29-11",
            text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
            reference: "Jeremiah 29:11"
        },
        {
            id: "philippians-4-13",
            text: "I can do all things through Christ which strengtheneth me.",
            reference: "Philippians 4:13"
        },
        {
            id: "psalm-23-1",
            text: "The LORD is my shepherd; I shall not want.",
            reference: "Psalm 23:1"
        },
        {
            id: "john-3-16",
            text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
            reference: "John 3:16"
        },
        {
            id: "proverbs-3-5",
            text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
            reference: "Proverbs 3:5"
        },
        {
            id: "psalm-46-1",
            text: "God is our refuge and strength, a very present help in trouble.",
            reference: "Psalm 46:1"
        },
        {
            id: "romans-8-28",
            text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
            reference: "Romans 8:28"
        },
        {
            id: "isaiah-41-10",
            text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
            reference: "Isaiah 41:10"
        },
        {
            id: "matthew-11-28",
            text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
            reference: "Matthew 11:28"
        },
        {
            id: "joshua-1-9",
            text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
            reference: "Joshua 1:9"
        }
    ];

    const modalElement = document.getElementById("verseModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const verseText = document.getElementById("generatedVerseText");
    const verseReference = document.getElementById("generatedVerseReference");
    const feedback = document.getElementById("verseShareFeedback");
    const shareButton = document.getElementById("shareVerseButton");
    const shareOptions = document.getElementById("verseShareOptions");
    const shareLinks = document.getElementById("verseShareLinks");
    const shareUrlInput = document.getElementById("verseShareUrl");
    const deviceShareButton = document.getElementById("shareVerseDevice");
    let currentVerse;

    function setShareOptionsVisible(visible) {
        shareOptions.hidden = !visible;
        shareButton.setAttribute("aria-expanded", String(visible));
    }

    function createShareData(verse) {
        const url = new URL(VERSE_GENERATOR_PUBLIC_URL);
        url.searchParams.set("verse", verse.id);
        return {
            title: `${verse.reference} (KJV)`,
            text: `${verse.text} — ${verse.reference} (KJV)`,
            url: url.toString()
        };
    }

    function recordVerseShare(verse, activity) {
        if (!window.ProfileStore) return;
        window.ProfileStore.addPost(`“${verse.text}”`, verse.reference);
        window.ProfileStore.addActivity(activity);
    }

    function renderVerse(verse) {
        currentVerse = verse;
        verseText.textContent = `“${verse.text}”`;
        verseReference.textContent = verse.reference;
        feedback.textContent = "";
        setShareOptionsVisible(false);

        const data = createShareData(verse);
        shareUrlInput.value = data.url;
        shareLinks.querySelectorAll("a").forEach(link => link.remove());
        const imageUrl = new URL(`images/verses/${verse.id}.png`, VERSE_GENERATOR_PUBLIC_URL).toString();
        const destinations = [
            { name: "Email", base: "mailto:", params: { subject: data.title, body: `${data.text}\n\n${data.url}` }, icon: "envelope" },
            { name: "Facebook", base: "https://www.facebook.com/sharer/sharer.php", params: { u: data.url, quote: data.text }, icon: "facebook" },
            { name: "X", base: "https://twitter.com/intent/tweet", params: { text: data.text, url: data.url }, icon: "twitter-x" },
            { name: "LinkedIn", base: "https://www.linkedin.com/sharing/share-offsite/", params: { url: data.url }, icon: "linkedin" },
            { name: "WhatsApp", base: "https://api.whatsapp.com/send", params: { text: `${data.text}\n${data.url}` }, icon: "whatsapp" },
            { name: "Pinterest", base: "https://www.pinterest.com/pin/create/button/", params: { url: data.url, media: imageUrl, description: data.text }, icon: "pinterest" },
            { name: "Tumblr", base: "https://www.tumblr.com/share/link", params: { url: data.url, name: data.title, description: data.text }, icon: "share" },
            { name: "LINE", base: "https://social-plugins.line.me/lineit/share", params: { url: data.url, text: data.text }, icon: "chat-dots" }
        ];
        destinations.forEach(({ name, base, params, icon }) => {
            const url = new URL(base);
            Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
            const link = document.createElement("a");
            link.className = "btn btn-outline-secondary";
            link.href = url.toString();
            if (name !== "Email") {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
            const symbol = document.createElement("i");
            symbol.className = `bi bi-${icon} me-1`;
            symbol.setAttribute("aria-hidden", "true");
            link.append(symbol, name);
            link.addEventListener("click", () => {
                recordVerseShare(verse, `Opened ${name} sharing for ${verse.reference}`);
                feedback.textContent = `${name} sharing opened. Finish sending in ${name}.`;
            });
            shareLinks.appendChild(link);
        });
        deviceShareButton.hidden = typeof navigator.share !== "function";
    }

    shareButton.addEventListener("click", () => {
        setShareOptionsVisible(shareOptions.hidden);
        if (!shareOptions.hidden) document.getElementById("copyVerseLink").focus();
    });
    document.getElementById("closeVerseShareOptions").addEventListener("click", () => {
        setShareOptionsVisible(false);
        shareButton.focus();
    });
    document.getElementById("copyVerseLink").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(shareUrlInput.value);
            feedback.textContent = "Verse link copied. Paste it into your message.";
        } catch (error) {
            shareUrlInput.focus();
            shareUrlInput.select();
            feedback.textContent = "Could not copy automatically. Copy the selected verse link manually.";
            console.error("Unable to copy verse link:", error);
        }
    });
    deviceShareButton.addEventListener("click", async () => {
        const verse = currentVerse;
        deviceShareButton.disabled = true;
        try {
            await navigator.share(createShareData(verse));
            recordVerseShare(verse, `Shared ${verse.reference} using device sharing`);
            feedback.textContent = "Verse sent to your selected sharing app.";
        } catch (error) {
            if (error.name === "AbortError") {
                feedback.textContent = "Sharing canceled.";
            } else {
                feedback.textContent = "Device sharing could not open. Choose a sharing option or copy the link.";
                console.error("Unable to share verse:", error);
            }
        } finally {
            deviceShareButton.disabled = false;
        }
    });

    function showVerse(verse, updateAddress = true) {
        renderVerse(verse);
        if (updateAddress && window.location.protocol !== "file:") {
            const shareUrl = new URL(window.location.href);
            shareUrl.searchParams.set("verse", verse.id);
            window.history.replaceState({}, "", shareUrl);
        }
        modal.show();
    }

    function generateVerse() {
        const options = verses.filter(verse => verse.id !== currentVerse?.id);
        return options[Math.floor(Math.random() * options.length)];
    }

    document.querySelectorAll(".random-verse-btn").forEach((button) => {
        button.addEventListener("click", () => {
            showVerse(generateVerse());
        });
    });

    document.getElementById("anotherVerseButton").addEventListener("click", () => {
        showVerse(generateVerse());
    });

    document.getElementById("copyVerseButton").addEventListener("click", async () => {
        const copyText = `${currentVerse.text} — ${currentVerse.reference}`;
        try {
            await navigator.clipboard.writeText(copyText);
            feedback.textContent = "Verse copied. Paste it into your post or message.";
        } catch (error) {
            feedback.textContent = "Could not copy automatically. Select the verse text and copy it manually.";
            console.error("Unable to copy generated verse:", error);
        }
    });

    const sharedVerseId = new URLSearchParams(window.location.search).get("verse");
    if (sharedVerseId) {
        const sharedVerse = verses.find(verse => verse.id === sharedVerseId);
        if (sharedVerse) {
            showVerse(sharedVerse, false);
        }
    }
}

const READING_PLAN_STORAGE_KEY = "biblical-study-tools-reading-plans";
const VERSE_GENERATOR_PUBLIC_URL = "https://biblical-study-tools-2027.onrender.com/";

const BIBLE_CHAPTER_VERSE_COUNTS = [
    [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
    [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
    [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
    [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
    [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12],
    [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33],
    [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25],
    [22, 23, 18, 22],
    [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13],
    [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25],
    [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53],
    [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30],
    [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30],
    [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23],
    [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
    [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31],
    [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
    [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17],
    [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6],
    [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31],
    [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14],
    [17, 17, 11, 16, 16, 13, 13, 14],
    [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24],
    [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34],
    [22, 22, 66, 22, 22],
    [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35],
    [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13],
    [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9],
    [20, 32, 21],
    [15, 16, 15, 13, 27, 14, 17, 14, 15],
    [21],
    [17, 10, 10, 11],
    [16, 13, 12, 13, 15, 16, 20],
    [15, 13, 19],
    [17, 20, 19],
    [18, 15, 20],
    [15, 23],
    [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
    [14, 17, 18, 6],
    [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20],
    [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20],
    [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53],
    [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
    [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31],
    [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27],
    [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
    [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14],
    [24, 21, 29, 31, 26, 18],
    [23, 22, 21, 32, 33, 24],
    [30, 30, 21, 23],
    [29, 23, 25, 18],
    [10, 20, 13, 18, 28],
    [12, 17, 18],
    [20, 15, 16, 16, 25, 21],
    [18, 26, 17, 22],
    [16, 15, 15],
    [25],
    [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25],
    [27, 26, 18, 17, 20],
    [25, 25, 22, 19, 14],
    [21, 22, 18],
    [10, 29, 24, 21, 21],
    [13],
    [14],
    [25],
    [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21]
];

const BIBLE_BOOKS = [
    ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
    ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
    ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
    ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
    ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52],
    ["Lamentations", 5], ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3],
    ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
    ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4], ["Matthew", 28],
    ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
    ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
    ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3],
    ["1 Timothy", 6], ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13],
    ["James", 5], ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1],
    ["3 John", 1], ["Jude", 1], ["Revelation", 22]
].map(([name, chapters], index) => ({
    name,
    chapters,
    chapterVerses: BIBLE_CHAPTER_VERSE_COUNTS[index],
    verses: BIBLE_CHAPTER_VERSE_COUNTS[index].reduce((total, count) => total + count, 0),
    testament: index < 39 ? "OT" : "NT"
}));

const CHRONOLOGICAL_BOOK_ORDER = [
    "Genesis", "Job", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "Psalms", "1 Kings", "1 Chronicles", "Proverbs", "Song of Solomon",
    "Ecclesiastes", "2 Kings", "2 Chronicles", "Obadiah", "Joel", "Jonah", "Amos", "Hosea",
    "Isaiah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
    "Ezra", "Haggai", "Zechariah", "Esther", "Nehemiah", "Malachi", "Matthew", "Mark", "Luke",
    "John", "Acts", "James", "Galatians", "1 Thessalonians", "2 Thessalonians", "1 Corinthians",
    "2 Corinthians", "Romans", "Ephesians", "Philippians", "Colossians", "Philemon", "1 Timothy",
    "Titus", "2 Timothy", "Hebrews", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude",
    "Revelation"
];

const TOPICAL_READINGS = [
    { title: "Creation and purpose", readings: ["Genesis 1:1–2:3", "Psalm 8:1–9"] },
    { title: "Knowing God", readings: ["Exodus 3:1–15", "Psalm 103:1–14"] },
    { title: "Trusting God", readings: ["Proverbs 3:1–12", "Matthew 6:25–34"] },
    { title: "Faith", readings: ["Hebrews 11:1–16", "Romans 4:1–8"] },
    { title: "Prayer", readings: ["Psalm 51:1–17", "Matthew 6:5–15"] },
    { title: "Wisdom", readings: ["Proverbs 2:1–15", "James 1:2–8"] },
    { title: "Love", readings: ["1 Corinthians 13:1–13", "1 John 4:7–21"] },
    { title: "Forgiveness", readings: ["Matthew 18:21–35", "Ephesians 4:25–32"] },
    { title: "Courage", readings: ["Joshua 1:1–9", "Psalm 27:1–6"] },
    { title: "Peace", readings: ["Psalm 23:1–6", "John 14:1–14"] },
    { title: "Serving others", readings: ["Mark 10:35–45", "Galatians 5:13–26"] },
    { title: "Hope", readings: ["Isaiah 40:28–31", "Romans 8:18–39"] },
    { title: "The life of Jesus", readings: ["Luke 15:1–10", "John 15:1–17"] },
    { title: "A life of faith", readings: ["Micah 6:6–8", "Colossians 3:1–17"] }
];

const READING_PLANS = {
    annual: {
        title: "Read the Bible in a Year",
        description: "All 1,189 chapters of the 66-book Bible in canonical order.",
        category: "Bible",
        tags: ["whole bible", "old testament", "new testament", "year"],
        days: createChapterPlan(BIBLE_BOOKS, 365)
    },
    chronological: {
        title: "Chronological Bible",
        description: "Read all 1,189 chapters in an approximate historical order, grouped by book.",
        category: "Bible",
        tags: ["whole bible", "history", "year"],
        days: createChapterPlan(
            CHRONOLOGICAL_BOOK_ORDER.map(name => BIBLE_BOOKS.find(book => book.name === name)),
            365
        )
    },
    newTestament: {
        title: "New Testament in 90 Days",
        description: "Read the 260 chapters of the New Testament at a steady pace over 90 days.",
        category: "New Testament",
        tags: ["jesus", "gospels", "letters", "90 days"],
        days: createChapterPlan(BIBLE_BOOKS.filter(book => book.testament === "NT"), 90)
    },
    psalms: {
        title: "30 Days in Psalms",
        description: "Spend a month in the Psalms with a handful of chapters each day.",
        category: "Psalms",
        tags: ["worship", "prayer", "wisdom", "30 days"],
        days: createChapterPlan([BIBLE_BOOKS.find(book => book.name === "Psalms")], 30)
    },
    gospels: {
        title: "The Gospels",
        description: "Journey through Matthew, Mark, Luke, and John in 90 days.",
        category: "New Testament",
        tags: ["jesus", "gospels", "90 days"],
        days: createChapterPlan(
            ["Matthew", "Mark", "Luke", "John"].map(name => BIBLE_BOOKS.find(book => book.name === name)),
            90
        )
    },
    topical: {
        title: "Foundations of Faith",
        description: "A 14-day guided topical study through key passages across Scripture.",
        category: "Topical",
        tags: ["faith", "prayer", "wisdom", "hope", "14 days"],
        days: TOPICAL_READINGS
    }
};

function createChapterPlan(books, dayCount) {
    const chapters = books.flatMap(book =>
        Array.from({ length: book.chapters }, (_, index) => ({
            book: book.name,
            chapter: index + 1
        }))
    );

    return Array.from({ length: dayCount }, (_, dayIndex) => {
        const start = Math.floor(dayIndex * chapters.length / dayCount);
        const end = Math.floor((dayIndex + 1) * chapters.length / dayCount);

        return {
            title: `Daily reading`,
            readings: formatChapterReadings(chapters.slice(start, end))
        };
    });
}

function formatChapterReadings(chapters) {
    const readings = [];
    let current = null;

    chapters.forEach(({ book, chapter }) => {
        if (current && current.book === book && chapter === current.end + 1) {
            current.end = chapter;
            return;
        }

        if (current) readings.push(formatChapterRange(current));
        current = { book, start: chapter, end: chapter };
    });

    if (current) readings.push(formatChapterRange(current));
    return readings;
}

function formatChapterRange({ book, start, end }) {
    return `${book} ${start}${end === start ? "" : `–${end}`}`;
}

function createEmptyReadingPlanState() {
    return { activePlanId: null, plans: {} };
}

function completedReadingIndices(plan, progress, dayNumber) {
    const readings = plan.days[dayNumber - 1].readings;
    if (progress.completedDays.includes(dayNumber)) {
        return readings.map((reading, index) => index);
    }
    const saved = progress.completedReadings?.[dayNumber];
    return Array.isArray(saved)
        ? [...new Set(saved.filter(index => Number.isInteger(index) && index >= 0 && index < readings.length))]
        : [];
}

function updatedReadingProgress(plan, progress, dayNumber, indices, date) {
    const next = {
        ...progress,
        completedDays: progress.completedDays.filter(day => day !== dayNumber),
        completedAt: { ...progress.completedAt },
        completedReadings: { ...progress.completedReadings, [dayNumber]: [...indices].sort((a, b) => a - b) }
    };
    if (indices.length === plan.days[dayNumber - 1].readings.length) {
        next.completedDays.push(dayNumber);
        next.completedDays.sort((a, b) => a - b);
        next.completedAt[dayNumber] = progress.completedAt[dayNumber] || date;
    } else {
        delete next.completedAt[dayNumber];
    }
    return next;
}

function initialiseReadingPlans() {
    const dashboard = document.getElementById("activeReadingPlan");
    const feedback = document.getElementById("readingPlanFeedback");
    const catalog = document.getElementById("readingPlanCatalog");
    const detailTitle = document.getElementById("readingPlanDetailTitle");
    const detailDescription = document.getElementById("readingPlanDetailDescription");
    const detailMeta = document.getElementById("readingPlanDetailMeta");
    const preview = document.getElementById("readingPlanPreview");
    const startPlanButton = document.getElementById("startReadingPlan");
    const catalogFeedback = document.getElementById("readingPlanCatalogFeedback");
    const daySelect = document.getElementById("readingDaySelect");
    let selectedPlanId = null;
    let storageWarning = "";
    let state = createEmptyReadingPlanState();

    try {
        const savedState = localStorage.getItem(READING_PLAN_STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (!parsed || typeof parsed !== "object" || !parsed.plans || typeof parsed.plans !== "object") {
                throw new Error("Saved reading plan data has an invalid format.");
            }

            state = parsed;
            if (!Object.hasOwn(READING_PLANS, state.activePlanId)) state.activePlanId = null;
            Object.entries(state.plans).forEach(([planId, progress]) => {
                const plan = READING_PLANS[planId];
                if (!plan || !progress || !Array.isArray(progress.completedDays)) {
                    throw new Error("Saved reading plan progress is invalid.");
                }

                progress.completedDays = [...new Set(progress.completedDays.filter(day =>
                    Number.isInteger(day) && day >= 1 && day <= plan.days.length
                ))];
                if (!progress.completedAt || typeof progress.completedAt !== "object" || Array.isArray(progress.completedAt)) {
                    progress.completedAt = {};
                }
                if (!Number.isInteger(progress.currentDay) || progress.currentDay < 1 || progress.currentDay > plan.days.length) {
                    progress.currentDay = firstIncompleteDay(plan, progress.completedDays);
                }
                if (typeof progress.startedAt !== "string") progress.startedAt = "";
            });
        }
    } catch (error) {
        storageWarning = "Saved plan progress could not be read. A new plan can be started; check browser storage if you need the old progress.";
        console.error("Unable to load reading plan progress:", error);
    }

    function saveState() {
        try {
            localStorage.setItem(READING_PLAN_STORAGE_KEY, JSON.stringify(state));
            feedback.textContent = "Progress saved on this device.";
        } catch (error) {
            feedback.textContent = "Progress is updated for this session but could not be saved in browser storage.";
            console.error("Unable to save reading plan progress:", error);
        }
        window.dispatchEvent(new CustomEvent("reading-plan-progress-updated", { detail: state }));
    }

    function renderPlan() {
        const planId = state.activePlanId;
        const plan = READING_PLANS[planId];
        if (!plan) {
            dashboard.hidden = true;
            return;
        }

        dashboard.hidden = false;
        document.getElementById("activePlanTitle").textContent = plan.title;
        document.getElementById("activePlanDescription").textContent = plan.description;

        const progress = state.plans[planId];
        const dayNumber = progress.currentDay;
        const day = plan.days[dayNumber - 1];
        const completed = progress.completedDays.includes(dayNumber);
        const percent = progress.completedDays.length / plan.days.length * 100;
        const percentLabel = percent === 0 ? "0%" : `${percent.toFixed(1)}%`;
        const fill = document.getElementById("planProgressFill");
        const progressBar = document.getElementById("planProgressBar");

        document.getElementById("planProgressLabel").textContent =
            `${progress.completedDays.length} of ${plan.days.length} days complete`;
        document.getElementById("planProgressPercent").textContent = percentLabel;
        fill.style.width = `${percent}%`;
        progressBar.setAttribute("aria-valuenow", percent.toFixed(1));
        document.getElementById("readingDayLabel").textContent = `Day ${dayNumber} of ${plan.days.length}`;
        document.getElementById("readingDayTitle").textContent = day.title;
        document.getElementById("readingDayStatus").textContent = completed ? "Completed" : "Up next";
        document.getElementById("readingDayStatus").className = completed
            ? "badge rounded-pill align-self-sm-start text-bg-success"
            : "badge rounded-pill align-self-sm-start text-bg-primary";
        document.getElementById("completeReadingDay").textContent =
            completed ? "Mark day incomplete" : "Mark day complete";
        document.getElementById("previousReadingDay").disabled = dayNumber === 1;
        document.getElementById("nextReadingDay").disabled = dayNumber === plan.days.length;
        document.getElementById("pauseReadingPlan").textContent = "Pause plan";

        daySelect.replaceChildren();
        plan.days.forEach((planDay, index) => {
            const number = index + 1;
            const option = document.createElement("option");
            option.value = String(number);
            option.textContent = `Day ${number}${progress.completedDays.includes(number) ? " · Complete" : ""}`;
            option.selected = number === dayNumber;
            daySelect.appendChild(option);
        });

        const passageList = document.getElementById("readingPassages");
        passageList.replaceChildren();
        const completedReadings = new Set(completedReadingIndices(plan, progress, dayNumber));
        day.readings.forEach((reading, index) => {
            const item = document.createElement("li");
            const isCompleted = completedReadings.has(index);
            item.className = `reading-passage${isCompleted ? " is-completed" : ""}`;
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "form-check-input";
            checkbox.checked = isCompleted;
            checkbox.dataset.readingIndex = String(index);
            const reference = document.createElement("span");
            reference.textContent = reading;
            const status = document.createElement("span");
            status.className = "small reading-passage-status";
            status.textContent = isCompleted ? "Completed" : "Not completed";
            label.append(checkbox, reference, status);
            item.appendChild(label);
            passageList.appendChild(item);
        });

        if (storageWarning) feedback.textContent = storageWarning;
    }

    function planLengthLabel(days) {
        return `${days} ${days === 1 ? "day" : "days"}`;
    }

    function renderCatalog() {
        const query = document.getElementById("readingPlanSearch").value.trim().toLocaleLowerCase();
        const category = document.getElementById("readingPlanCategory").value;
        const length = document.getElementById("readingPlanLength").value;
        const matches = Object.entries(READING_PLANS).filter(([, plan]) => {
            const searchableText = `${plan.title} ${plan.description} ${plan.category} ${plan.tags.join(" ")}`.toLocaleLowerCase();
            const matchesLength = length === "all" ||
                (length === "short" && plan.days.length <= 30) ||
                (length === "medium" && plan.days.length > 30 && plan.days.length <= 90) ||
                (length === "long" && plan.days.length > 90);
            return searchableText.includes(query) &&
                (category === "all" || plan.category === category) &&
                matchesLength;
        });

        document.getElementById("readingPlanResultCount").textContent =
            `${matches.length} ${matches.length === 1 ? "plan" : "plans"}`;
        catalog.replaceChildren();
        if (matches.length === 0) {
            const empty = document.createElement("p");
            empty.className = "text-body-secondary border rounded-3 p-3 mb-0";
            empty.textContent = "No plans match those filters. Try another topic or length.";
            catalog.appendChild(empty);
            return;
        }

        matches.forEach(([planId, plan]) => {
            const progress = state.plans[planId];
            const item = document.createElement("article");
            item.className = `reading-plan-card${selectedPlanId === planId ? " is-selected" : ""}`;

            const heading = document.createElement("div");
            heading.className = "d-flex justify-content-between align-items-start gap-2";
            const title = document.createElement("h3");
            title.className = "h6 fw-bold mb-1";
            title.textContent = plan.title;
            const label = document.createElement("span");
            label.className = "badge text-bg-light";
            label.textContent = progress
                ? `${progress.completedDays.length}/${plan.days.length} days`
                : planLengthLabel(plan.days.length);
            heading.append(title, label);

            const summary = document.createElement("p");
            summary.className = "small text-body-secondary mb-2";
            summary.textContent = plan.description;
            const footer = document.createElement("div");
            footer.className = "d-flex justify-content-between align-items-center gap-2";
            const categoryLabel = document.createElement("span");
            categoryLabel.className = "small text-body-secondary";
            categoryLabel.textContent = plan.category;
            const selectButton = document.createElement("button");
            selectButton.className = "btn btn-sm btn-outline-primary";
            selectButton.type = "button";
            selectButton.textContent = "View details";
            selectButton.setAttribute("aria-pressed", String(selectedPlanId === planId));
            selectButton.addEventListener("click", () => showPlanDetails(planId));
            footer.append(categoryLabel, selectButton);
            item.append(heading, summary, footer);
            catalog.appendChild(item);
        });
    }

    function showPlanDetails(planId) {
        const plan = READING_PLANS[planId];
        if (!plan) return;
        selectedPlanId = planId;
        detailTitle.textContent = plan.title;
        detailDescription.textContent = plan.description;
        detailMeta.replaceChildren();
        [plan.category, planLengthLabel(plan.days.length), "King James Version"].forEach(text => {
            const badge = document.createElement("span");
            badge.className = "badge rounded-pill text-bg-light";
            badge.textContent = text;
            detailMeta.appendChild(badge);
        });
        preview.replaceChildren();
        plan.days.slice(0, 3).forEach((day, index) => {
            const item = document.createElement("li");
            item.className = "mb-2";
            item.textContent = `Day ${index + 1}: ${day.title === "Daily reading" ? day.readings.join(", ") : `${day.title} — ${day.readings.join(", ")}`}`;
            preview.appendChild(item);
        });
        if (plan.days.length > 3) {
            const more = document.createElement("li");
            more.className = "small text-body-secondary";
            more.textContent = `Plus ${plan.days.length - 3} more days`;
            preview.appendChild(more);
        }

        const progress = state.plans[planId];
        startPlanButton.disabled = false;
        startPlanButton.textContent = state.activePlanId === planId
            ? "Continue current plan"
            : progress ? "Resume this plan" : "Start this plan";
        catalogFeedback.textContent = progress
            ? `${progress.completedDays.length} of ${plan.days.length} days complete. Your progress is saved on this device.`
            : "Your progress will be saved on this device.";
        renderCatalog();
    }

    function activatePlan(planId) {
        if (!Object.hasOwn(READING_PLANS, planId)) return;
        state.activePlanId = planId;
        if (!state.plans[planId]) {
            state.plans[planId] = {
                currentDay: 1,
                completedDays: [],
                completedAt: {},
                startedAt: getLocalDateKey(new Date())
            };
        }
        renderPlan();
        renderCatalog();
        saveState();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("readingPlanModal")).hide();
        dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.getElementById("readingPlanSearch").addEventListener("input", renderCatalog);
    document.getElementById("readingPlanCategory").addEventListener("change", renderCatalog);
    document.getElementById("readingPlanLength").addEventListener("change", renderCatalog);
    document.getElementById("readingPlanModal").addEventListener("show.bs.modal", renderCatalog);
    startPlanButton.addEventListener("click", () => {
        if (selectedPlanId) activatePlan(selectedPlanId);
    });
    document.getElementById("pauseReadingPlan").addEventListener("click", () => {
        if (!state.activePlanId) return;
        state.activePlanId = null;
        renderPlan();
        renderCatalog();
        saveState();
        feedback.textContent = "Plan paused. Your progress is saved; resume it from Browse plans.";
    });
    daySelect.addEventListener("change", () => {
        if (!state.activePlanId) return;
        state.plans[state.activePlanId].currentDay = Number(daySelect.value);
        renderPlan();
        saveState();
    });

    document.getElementById("previousReadingDay").addEventListener("click", () => {
        const progress = state.plans[state.activePlanId];
        if (progress.currentDay > 1) {
            progress.currentDay--;
            renderPlan();
            saveState();
        }
    });

    document.getElementById("nextReadingDay").addEventListener("click", () => {
        const progress = state.plans[state.activePlanId];
        if (progress.currentDay < READING_PLANS[state.activePlanId].days.length) {
            progress.currentDay++;
            renderPlan();
            saveState();
        }
    });

    function confirmCompletionChange(indices, advanceDay = false) {
        if (!state.activePlanId) return;
        const planId = state.activePlanId;
        const plan = READING_PLANS[state.activePlanId];
        const progress = state.plans[planId];
        const dayNumber = progress.currentDay;
        if (!window.confirm(`Save completion changes for ${plan.title}, day ${dayNumber}?`)) {
            renderPlan();
            feedback.textContent = "Changes canceled. Saved reading progress is unchanged.";
            return;
        }
        const nextProgress = updatedReadingProgress(plan, progress, dayNumber, indices, getLocalDateKey(new Date()));
        if (advanceDay && nextProgress.completedDays.includes(dayNumber)) {
            nextProgress.currentDay = firstIncompleteDay(plan, nextProgress.completedDays, dayNumber);
        }
        const nextState = { ...state, plans: { ...state.plans, [planId]: nextProgress } };
        try {
            localStorage.setItem(READING_PLAN_STORAGE_KEY, JSON.stringify(nextState));
        } catch (error) {
            renderPlan();
            feedback.textContent = "Could not save completion changes. Your previous progress is unchanged. Check browser storage and try again.";
            console.error("Unable to save reading completion:", error);
            return;
        }
        state = nextState;
        storageWarning = "";
        renderPlan();
        renderCatalog();
        if (selectedPlanId) showPlanDetails(selectedPlanId);
        feedback.textContent = "Reading progress saved. Analytics updated.";
        window.dispatchEvent(new CustomEvent("reading-plan-progress-updated", { detail: state }));
    }

    document.getElementById("readingPassages").addEventListener("change", event => {
        const checkbox = event.target;
        if (!(checkbox instanceof HTMLInputElement) || !checkbox.matches("[data-reading-index]") || !state.activePlanId) return;
        const plan = READING_PLANS[state.activePlanId];
        const progress = state.plans[state.activePlanId];
        const indices = new Set(completedReadingIndices(plan, progress, progress.currentDay));
        const index = Number(checkbox.dataset.readingIndex);
        if (checkbox.checked) indices.add(index);
        else indices.delete(index);
        confirmCompletionChange([...indices]);
    });

    document.getElementById("completeReadingDay").addEventListener("click", () => {
        if (!state.activePlanId) return;
        const plan = READING_PLANS[state.activePlanId];
        const progress = state.plans[state.activePlanId];
        const indices = progress.completedDays.includes(progress.currentDay)
            ? [] : plan.days[progress.currentDay - 1].readings.map((reading, index) => index);
        confirmCompletionChange(indices, true);
    });

    renderPlan();
    renderCatalog();
    if (storageWarning) feedback.textContent = storageWarning;
}

function firstIncompleteDay(plan, completedDays, startAfter = 0) {
    const completed = new Set(completedDays);
    for (let offset = 1; offset <= plan.days.length; offset++) {
        const day = ((startAfter + offset - 1) % plan.days.length) + 1;
        if (!completed.has(day)) return day;
    }
    return plan.days.length;
}

function initialiseBibleAnalytics() {
    const analytics = document.getElementById("bibleAnalytics");
    const bookList = document.getElementById("bookAnalyticsList");
    const search = document.getElementById("analyticsBookSearch");
    const historyList = document.getElementById("readingHistoryList");
    const feedback = document.getElementById("analyticsFeedback");
    let testamentFilter = "all";
    let readingState = createEmptyReadingPlanState();

    document.getElementById("openAnalytics").addEventListener("click", () => {
        analytics.hidden = false;
        analytics.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("analyticsTitle").focus({ preventScroll: true });
    });
    document.getElementById("closeAnalytics").addEventListener("click", () => {
        analytics.hidden = true;
        document.getElementById("openAnalytics").focus();
    });
    document.getElementById("analyticsTitle").tabIndex = -1;

    let completedDays = 0;
    const formatNumber = new Intl.NumberFormat();

    function updateCompletedDayCount() {
        completedDays = 0;
        let completedPassages = 0;
        let finishedPlans = 0;
        Object.entries(readingState.plans || {}).forEach(([planId, progress]) => {
            if (progress && Array.isArray(progress.completedDays)) {
                completedDays += progress.completedDays.length;
                const plan = READING_PLANS[planId];
                if (plan) {
                    if (plan.days.every((day, index) => progress.completedDays.includes(index + 1))) finishedPlans++;
                    plan.days.forEach((day, index) => {
                        completedPassages += completedReadingIndices(plan, progress, index + 1).length;
                    });
                }
            }
        });
        document.getElementById("statCompletedDays").textContent = formatNumber.format(completedDays);
        document.getElementById("statCompletedPassages").textContent = formatNumber.format(completedPassages);
        window.PlanMilestones?.update({ days: completedDays, passages: completedPassages, plans: finishedPlans });
    }

    try {
        const savedState = localStorage.getItem(READING_PLAN_STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (!parsed || typeof parsed !== "object" || !parsed.plans || typeof parsed.plans !== "object") {
                throw new Error("Saved reading plan data has an invalid format.");
            }
            readingState = parsed;
        }
    } catch (error) {
        feedback.textContent = "Reading history could not be loaded from browser storage.";
        console.error("Unable to load reading history for analytics:", error);
    }

    document.getElementById("statBookCount").textContent = formatNumber.format(BIBLE_BOOKS.length);
    document.getElementById("statChapterCount").textContent =
        formatNumber.format(BIBLE_BOOKS.reduce((total, book) => total + book.chapters, 0));
    document.getElementById("statVerseCount").textContent =
        formatNumber.format(BIBLE_BOOKS.reduce((total, book) => total + book.verses, 0));
    updateCompletedDayCount();

    function renderBooks() {
        const query = search.value.trim().toLocaleLowerCase();
        const matches = BIBLE_BOOKS.filter(book =>
            (testamentFilter === "all" || book.testament === testamentFilter) &&
            book.name.toLocaleLowerCase().includes(query)
        );

        document.getElementById("bookResultCount").textContent =
            `${matches.length} ${matches.length === 1 ? "book" : "books"}`;
        bookList.replaceChildren();
        if (matches.length === 0) {
            const empty = document.createElement("p");
            empty.className = "text-body-secondary mb-0";
            empty.textContent = "No books match your search.";
            bookList.appendChild(empty);
            return;
        }

        matches.forEach(book => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "book-analytics-item";
            button.setAttribute("aria-label", `${book.name}: ${book.chapters} chapters, ${formatNumber.format(book.verses)} verses`);

            const name = document.createElement("span");
            name.className = "fw-semibold";
            name.textContent = book.name;
            const totals = document.createElement("span");
            totals.className = "small text-body-secondary";
            totals.textContent = `${book.chapters} ch. · ${formatNumber.format(book.verses)} verses`;
            button.append(name, totals);
            button.addEventListener("click", () => renderBookDetails(book));
            bookList.appendChild(button);
        });
    }

    function renderBookDetails(book) {
        document.getElementById("selectedBookTitle").textContent = book.name;
        document.getElementById("selectedBookSection").textContent =
            `${book.testament === "OT" ? "Old" : "New"} Testament`;
        document.getElementById("selectedBookChapters").textContent = formatNumber.format(book.chapters);
        document.getElementById("selectedBookVerses").textContent = formatNumber.format(book.verses);
        document.getElementById("selectedBookAverage").textContent =
            formatNumber.format(book.verses / book.chapters);
        document.getElementById("selectedBookStats").hidden = false;

        const chapterList = document.getElementById("selectedBookChapterList");
        chapterList.replaceChildren();
        for (let chapter = 1; chapter <= book.chapters; chapter++) {
            const item = document.createElement("div");
            item.className = "chapter-number";
            const number = document.createElement("strong");
            number.textContent = `Chapter ${chapter}`;
            const verses = document.createElement("span");
            verses.textContent = `${formatNumber.format(book.chapterVerses[chapter - 1])} verses`;
            item.append(number, verses);
            chapterList.appendChild(item);
        }
    }

    function renderHistory() {
        const historyByDate = new Map();
        Object.values(readingState.plans || {}).forEach(progress => {
            if (!progress || !progress.completedAt || typeof progress.completedAt !== "object") return;
            Object.values(progress.completedAt).forEach(date => {
                if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    historyByDate.set(date, 1);
                }
            });
        });

        const today = new Date();
        const recentDays = Array.from({ length: 7 }, (_, offset) => {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
            const key = getLocalDateKey(date);
            return { key, date, count: historyByDate.get(key) || 0 };
        });
        const recentTotal = recentDays.reduce((total, day) => total + day.count, 0);
        document.getElementById("historySummary").textContent =
            `${formatNumber.format(recentTotal)} day${recentTotal === 1 ? "" : "s"} in the last 7 days`;
        historyList.replaceChildren();
        recentDays.forEach(({ date, count }) => {
            const row = document.createElement("div");
            row.className = "reading-history-day";
            const label = document.createElement("span");
            label.textContent = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            const total = document.createElement("strong");
            total.textContent = `${count} ${count === 1 ? "day" : "days"}`;
            row.append(label, total);
            historyList.appendChild(row);
        });
    }

    search.addEventListener("input", renderBooks);
    window.addEventListener("reading-plan-progress-updated", event => {
        readingState = event.detail;
        updateCompletedDayCount();
        renderHistory();
    });
    document.querySelectorAll("[data-testament-filter]").forEach(button => {
        button.addEventListener("click", () => {
            testamentFilter = button.dataset.testamentFilter;
            document.querySelectorAll("[data-testament-filter]").forEach(filterButton => {
                const selected = filterButton === button;
                filterButton.classList.toggle("active", selected);
                filterButton.setAttribute("aria-pressed", String(selected));
            });
            renderBooks();
        });
    });

    renderBooks();
    renderHistory();
}

function getLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
