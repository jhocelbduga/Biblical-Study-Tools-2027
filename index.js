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
    const shareButton = document.getElementById("shareVerseFacebook");
    let currentVerse;

    function renderVerse(verse) {
        currentVerse = verse;
        verseText.textContent = `“${verse.text}”`;
        verseReference.textContent = verse.reference;
        feedback.textContent = "";

        const shareUrl = new URL(VERSE_GENERATOR_PUBLIC_URL);
        shareUrl.searchParams.set("verse", verse.id);
        const quote = `${verse.text} — ${verse.reference}`;
        shareButton.href =
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.toString())}` +
            `&quote=${encodeURIComponent(quote)}`;
    }

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
                if (!progress.completedAt || typeof progress.completedAt !== "object" || Array.isArray(progress.completedAt)) {
                    progress.completedAt = {};
                }
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
                state.plans[planId] = { currentDay: 1, completedDays: [], completedAt: {} };
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
            delete progress.completedAt[dayNumber];
        } else {
            completedDays.add(dayNumber);
            progress.completedAt[dayNumber] = getLocalDateKey(new Date());
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
        Object.values(readingState.plans || {}).forEach(progress => {
            if (progress && Array.isArray(progress.completedDays)) {
                completedDays += progress.completedDays.length;
            }
        });
        document.getElementById("statCompletedDays").textContent = formatNumber.format(completedDays);
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
