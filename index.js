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

    const randomVerseButton = document.querySelector(".random-verse-btn");

    if (!randomVerseButton) return;

    randomVerseButton.addEventListener("click", () => {
        const verse = verses[Math.floor(Math.random() * verses.length)];

        alert(`${verse.text}\n\n${verse.reference}`);
    });
}
