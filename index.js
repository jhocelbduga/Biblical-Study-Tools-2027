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

    console.log("Biblical Study Tools Loaded");
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
 * Sample Verse Generator
 */
function initialiseVerseGenerator() {
    const verses = [
        {
            text: "For I know the plans I have for you.",
            reference: "Jeremiah 29:11"
        },
        {
            text: "I can do all things through Christ.",
            reference: "Philippians 4:13"
        },
        {
            text: "The Lord is my shepherd.",
            reference: "Psalm 23:1"
        }
    ];

    document.querySelectorAll(".random-verse-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const verse = verses[Math.floor(Math.random() * verses.length)];

            alert(`${verse.text}\n\n${verse.reference}`);
        });
    });
}

const READING_PLAN_STORAGE_KEY = "biblical-study-tools-reading-plans";

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
].map(([name, chapters]) => ({ name, chapters }));

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
        days: createChapterPlan(BIBLE_BOOKS, 365)
    },
    chronological: {
        title: "Chronological Bible",
        description: "All 1,189 chapters in an approximate book-level historical order.",
        days: createChapterPlan(
            CHRONOLOGICAL_BOOK_ORDER.map(name => BIBLE_BOOKS.find(book => book.name === name)),
            365
        )
    },
    topical: {
        title: "Foundations of Faith",
        description: "A 14-day guided topical study through key passages across Scripture.",
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

function initialiseReadingPlans() {
    const dashboard = document.getElementById("activeReadingPlan");
    const feedback = document.getElementById("readingPlanFeedback");
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
                if (!Number.isInteger(progress.currentDay) || progress.currentDay < 1 || progress.currentDay > plan.days.length) {
                    progress.currentDay = firstIncompleteDay(plan, progress.completedDays);
                }
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

        const passageList = document.getElementById("readingPassages");
        passageList.replaceChildren();
        day.readings.forEach(reading => {
            const item = document.createElement("li");
            item.textContent = reading;
            passageList.appendChild(item);
        });

        if (storageWarning) feedback.textContent = storageWarning;
    }

    document.querySelectorAll(".reading-plan-option").forEach(button => {
        button.addEventListener("click", () => {
            const planId = button.dataset.planId;
            if (!Object.hasOwn(READING_PLANS, planId)) return;

            state.activePlanId = planId;
            if (!state.plans[planId]) {
                state.plans[planId] = { currentDay: 1, completedDays: [] };
            }

            renderPlan();
            saveState();
            bootstrap.Modal.getOrCreateInstance(document.getElementById("readingPlanModal")).hide();
            dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
        });
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

    document.getElementById("completeReadingDay").addEventListener("click", () => {
        const plan = READING_PLANS[state.activePlanId];
        const progress = state.plans[state.activePlanId];
        const dayNumber = progress.currentDay;
        const completedDays = new Set(progress.completedDays);

        if (completedDays.has(dayNumber)) {
            completedDays.delete(dayNumber);
        } else {
            completedDays.add(dayNumber);
            progress.currentDay = firstIncompleteDay(plan, [...completedDays], dayNumber);
        }

        progress.completedDays = [...completedDays].sort((a, b) => a - b);
        renderPlan();
        saveState();
    });

    renderPlan();
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
