(() => {
    const KEY = "bstProfile";
    const MAX_ITEMS = 100;

    const empty = () => ({
        name: "",
        photo: "",
        bio: "",
        church: { name: "", denomination: "", address: "", massTimes: "", contact: "", website: "", about: "" },
        activity: [],
        posts: [],
        friends: []
    });

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            const base = empty();
            return saved && typeof saved === "object"
                ? { ...base, ...saved, church: { ...base.church, ...(saved.church || {}) } }
                : base;
        } catch {
            return empty();
        }
    }

    function save(profile) {
        try {
            localStorage.setItem(KEY, JSON.stringify(profile));
            return true;
        } catch {
            return false;
        }
    }

    const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    function addActivity(text) {
        const profile = load();
        profile.activity.unshift({ id: uid(), text, at: new Date().toISOString() });
        profile.activity = profile.activity.slice(0, MAX_ITEMS);
        save(profile);
    }

    function addPost(text, reference = "") {
        const profile = load();
        profile.posts.unshift({ id: uid(), text, reference, at: new Date().toISOString() });
        profile.posts = profile.posts.slice(0, MAX_ITEMS);
        save(profile);
    }

    function initials(name) {
        const letters = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
        return letters || "";
    }

    function renderAvatar(target, profile = load()) {
        if (!target) return;
        target.textContent = "";
        if (profile.photo) {
            const img = document.createElement("img");
            img.src = profile.photo;
            img.alt = "";
            target.appendChild(img);
        } else if (initials(profile.name)) {
            target.textContent = initials(profile.name);
        } else {
            target.innerHTML = '<i class="bi bi-person-fill" aria-hidden="true"></i>';
        }
    }

    window.ProfileStore = { load, save, uid, addActivity, addPost, initials, renderAvatar };

    document.querySelectorAll("[data-profile-avatar]").forEach((el) => renderAvatar(el));
})();
