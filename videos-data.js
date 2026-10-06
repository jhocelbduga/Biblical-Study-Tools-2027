(() => {
    const items = [
        { id: "what-is-the-bible", title: "What Is the Bible?", provider: "BibleProject", category: "Understanding the Bible", type: "Video", path: "25439-what-is-the-bible", summary: "An introduction to the Bible and how to approach reading it." },
        { id: "story-of-the-bible", title: "The Story of the Bible", provider: "BibleProject", category: "Understanding the Bible", type: "Video", path: "25213-the-story-of-the-bible", summary: "Explore the overarching story that connects the books of the Bible." },
        { id: "literary-styles", title: "Literary Styles in the Bible", provider: "BibleProject", category: "Understanding the Bible", type: "Video", path: "25002-literary-styles-in-the-bible", summary: "Discover different kinds of writing encountered in Scripture." },
        { id: "gospel", title: "The Gospel", provider: "BibleProject", category: "Life of Jesus", type: "Video", path: "47600-the-gospel", summary: "Explore the gospel as a form of biblical literature." },
        { id: "parables", title: "The Parables of Jesus", provider: "BibleProject", category: "Life of Jesus", type: "Video", path: "47601-the-parables-of-jesus", summary: "Learn about the stories Jesus used to teach." },
        { id: "jonah", title: "The Bible Explained: Jonah", provider: "Spoken Gospel", category: "Old Testament", type: "Video", path: "43888-the-bible-explained-jonah", summary: "An introduction to the book of Jonah." },
        { id: "jonah-1", title: "Jonah 1", provider: "Spoken Gospel", category: "Old Testament", type: "Video", path: "43889-jonah-1", summary: "Take a closer look at the opening chapter of Jonah." },
        { id: "i-am", title: "I AM", provider: "Streetlights", category: "Life of Jesus", type: "Video", path: "41205-i-am", summary: "A visual exploration connected to the Gospel of John." },
        { id: "i-am-series", title: "I AM Series", provider: "Streetlights", category: "Life of Jesus", type: "Collection", path: "collections/304-i-am-series", summary: "Explore a collection of visual interpretations from John." },
        { id: "john", title: "Life of Jesus: Gospel of John", provider: "Bible App collections", category: "Life of Jesus", type: "Collection", path: "collections/14-life-of-jesus-gospel-of-john", summary: "Watch a collection centered on the life of Jesus in John." },
        { id: "james", title: "The Book of James", provider: "Bible App collections", category: "New Testament", type: "Collection", path: "collections/1511-the-book-of-james", summary: "Explore a video collection focused on the book of James." },
        { id: "old-testament", title: "Old Testament Essentials", provider: "Bible App collections", category: "Old Testament", type: "Collection", path: "collections/1364-seminary-now-old-testament-essentials", summary: "Browse the Seminary Now collection on the Old Testament." }
    ].map(item => Object.freeze({ ...item, url: `https://www.bible.com/videos/${item.path}` }));

    function filter({ query = "", category = "all", provider = "all", type = "all" } = {}) {
        const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return items.filter(item => {
            const text = `${item.title} ${item.provider} ${item.category} ${item.summary}`.toLocaleLowerCase();
            return terms.every(term => text.includes(term)) &&
                (category === "all" || item.category === category) &&
                (provider === "all" || item.provider === provider) &&
                (type === "all" || item.type === type);
        });
    }

    window.VideoLibrary = Object.freeze({ items: Object.freeze(items), filter });
})();
