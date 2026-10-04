(() => {
    const KEY = "bstProfile";
    const MAX_ITEMS = 100;

    const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    const empty = () => ({
        id: "",
        name: "",
        photo: "",
        bio: "",
        church: { name: "", denomination: "", address: "", massTimes: "", contact: "", website: "", about: "", parishioner: false },
        activity: [],
        posts: [],
        friends: []
    });

    function load() {
        let profile;
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            const base = empty();
            profile = saved && typeof saved === "object"
                ? { ...base, ...saved, church: { ...base.church, ...(saved.church || {}) } }
                : base;
        } catch {
            profile = empty();
        }
        if (!profile.id) {
            profile.id = uid();
            try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ }
        }
        return profile;
    }

    function save(profile) {
        try {
            localStorage.setItem(KEY, JSON.stringify(profile));
            return true;
        } catch {
            return false;
        }
    }

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

    function joinChurch(data) {
        const profile = load();
        profile.church = {
            ...profile.church,
            name: data.name || profile.church.name,
            address: data.address || profile.church.address,
            denomination: data.denomination || profile.church.denomination,
            parishioner: true
        };
        profile.activity.unshift({ id: uid(), text: `Joined ${profile.church.name || "a church"} as a parishioner`, at: new Date().toISOString() });
        profile.activity = profile.activity.slice(0, MAX_ITEMS);
        save(profile);
        return profile;
    }

    function addFriend(friend) {
        const profile = load();
        if (friend.id && friend.id === profile.id) return { status: "self" };
        if (friend.id && profile.friends.some((f) => f.remoteId === friend.id)) return { status: "exists" };
        const at = new Date().toISOString();
        profile.friends.unshift({ id: uid(), remoteId: friend.id || "", name: friend.name, contact: friend.contact || "", at });
        profile.activity.unshift({ id: uid(), text: `Added ${friend.name} as a friend${friend.via === "qr" ? " via QR code" : ""}`, at });
        profile.activity = profile.activity.slice(0, MAX_ITEMS);
        save(profile);
        return { status: "added" };
    }

    window.ProfileStore = { load, save, uid, addActivity, addPost, joinChurch, addFriend, initials, renderAvatar };

    document.querySelectorAll("[data-profile-avatar]").forEach((el) => renderAvatar(el));
})();
