(() => {
    const PS = window.ProfileStore;
    const SITE_URL = "https://biblical-study-tools-2027.onrender.com/";
    const $ = (id) => document.getElementById(id);
    const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const safeUrl = (value) => {
        if (!value) return "";
        try {
            const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
            return /^https?:$/.test(url.protocol) ? url.href : "";
        } catch {
            return "";
        }
    };
    const empty = (text) => `<li class="profile-empty text-body-secondary">${text}</li>`;

    let profile = PS.load();
    const feedback = $("profileFeedback");
    const modal = bootstrap.Modal.getOrCreateInstance($("editProfileModal"));

    function persist() {
        if (!PS.save(profile)) feedback.textContent = "Couldn't save on this device (storage is full).";
    }

    function renderHeader() {
        $("profileName").textContent = profile.name || "Your name";
        $("profileBio").textContent = profile.bio || "Add a short bio in Edit profile.";
        $("profileChurchBadge").lastElementChild.textContent = profile.church.name ? `${profile.church.name}${profile.church.parishioner ? " · Parishioner" : ""}` : "No church added";
        $("profileFriendsBadge").textContent = `${profile.friends.length} ${profile.friends.length === 1 ? "friend" : "friends"}`;
        PS.renderAvatar($("profileAvatar"), profile);
    }

    function renderChurch() {
        const c = profile.church;
        const rows = [
            ["bi-building", "Church", c.name],
            ["bi-bookmark", "Denomination", c.denomination],
            ["bi-geo-alt", "Address", c.address],
            ["bi-clock", "Mass / service times", c.massTimes],
            ["bi-telephone", "Contact", c.contact]
        ].filter((r) => r[2]);
        const site = safeUrl(c.website);
        if (site) rows.push(["bi-globe", "Website", `<a href="${esc(site)}" target="_blank" rel="noopener">${esc(c.website)}</a>`]);
        const html = rows.map(([icon, label, value]) =>
            `<div class="profile-row"><i class="bi ${icon}" aria-hidden="true"></i><div><div class="small text-body-secondary">${label}</div><div>${label === "Website" ? value : esc(value).replace(/\n/g, "<br>")}</div></div></div>`).join("");
        $("churchDetails").innerHTML = (html || '<p class="text-body-secondary mb-0">You haven\'t added your church yet. Choose Edit profile to add its name, address, Mass times and contact details.</p>')
            + (c.about ? `<hr><h2 class="h6">About</h2><p class="mb-0">${esc(c.about).replace(/\n/g, "<br>")}</p>` : "");
    }

    function renderActivity() {
        $("activityList").innerHTML = profile.activity.length
            ? profile.activity.map((a) => `<li class="profile-item"><span>${esc(a.text)}</span><small class="text-body-secondary">${when(a.at)}</small></li>`).join("")
            : empty("No activity yet. Share a verse or add a friend and it will show up here.");
    }

    function renderPosts() {
        $("postList").innerHTML = profile.posts.length
            ? profile.posts.map((p) => {
                const share = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&quote=${encodeURIComponent(p.text)}`;
                return `<li class="profile-item flex-column align-items-stretch" data-id="${esc(p.id)}">
                    <p class="mb-1">${esc(p.text).replace(/\n/g, "<br>")}</p>
                    ${p.reference ? `<small class="fw-semibold">${esc(p.reference)}</small>` : ""}
                    <div class="d-flex justify-content-between align-items-center gap-2 mt-1">
                        <small class="text-body-secondary">${when(p.at)}</small>
                        <span class="d-flex gap-2">
                            <a class="btn btn-sm btn-outline-primary" href="${share}" target="_blank" rel="noopener"><i class="bi bi-facebook me-1" aria-hidden="true"></i>Share</a>
                            <button class="btn btn-sm btn-outline-danger" type="button" data-delete-post="${esc(p.id)}" aria-label="Delete post"><i class="bi bi-trash" aria-hidden="true"></i></button>
                        </span>
                    </div></li>`;
            }).join("")
            : empty("No shared posts yet. Write one above, or share a daily verse.");
    }

    function renderFriends() {
        $("friendList").innerHTML = profile.friends.length
            ? profile.friends.map((f) => `<li class="profile-item"><span class="d-flex align-items-center gap-2"><span class="profile-avatar-small" aria-hidden="true">${esc(PS.initials(f.name) || "?")}</span><span><strong>${esc(f.name)}</strong>${f.contact ? `<br><small class="text-body-secondary">${esc(f.contact)}</small>` : ""}${f.church ? `<br><small class="text-body-secondary">${esc(f.church)}</small>` : ""}</span></span>
                <button class="btn btn-sm btn-outline-danger" type="button" data-remove-friend="${esc(f.id)}" aria-label="Remove ${esc(f.name)}"><i class="bi bi-person-dash" aria-hidden="true"></i></button></li>`).join("")
            : empty("No friends yet. Add someone above.");
    }

    function renderAll() {
        renderHeader();
        renderChurch();
        renderActivity();
        renderPosts();
        renderFriends();
    }

    const fields = { name: "fName", bio: "fBio" };
    const churchFields = { name: "fChurchName", denomination: "fDenomination", address: "fAddress", massTimes: "fMass", contact: "fContact", website: "fWebsite", about: "fAbout" };

    $("editProfileButton").addEventListener("click", () => {
        for (const [key, id] of Object.entries(fields)) $(id).value = profile[key] || "";
        for (const [key, id] of Object.entries(churchFields)) $(id).value = profile.church[key] || "";
        modal.show();
    });

    $("editProfileForm").addEventListener("submit", (event) => {
        event.preventDefault();
        for (const [key, id] of Object.entries(fields)) profile[key] = $(id).value.trim();
        for (const [key, id] of Object.entries(churchFields)) profile.church[key] = $(id).value.trim();
        persist();
        PS.addActivity("Updated my profile");
        profile = PS.load();
        modal.hide();
        feedback.textContent = "Profile saved.";
        renderAll();
    });

    $("profilePhoto").addEventListener("change", (event) => {
        const file = event.target.files[0];
        event.target.value = "";
        if (!file || !file.type.startsWith("image/")) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const size = 256;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const side = Math.min(img.width, img.height);
            canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            URL.revokeObjectURL(url);
            profile.photo = canvas.toDataURL("image/jpeg", 0.85);
            persist();
            PS.addActivity("Changed my profile photo");
            profile = PS.load();
            feedback.textContent = "Profile photo updated.";
            renderAll();
        };
        img.onerror = () => { URL.revokeObjectURL(url); feedback.textContent = "That image couldn't be read. Try another one."; };
        img.src = url;
    });

    $("postForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const text = $("postText").value.trim();
        if (!text) return;
        PS.addPost(text);
        PS.addActivity("Shared a post");
        profile = PS.load();
        $("postText").value = "";
        renderAll();
    });

    $("postList").addEventListener("click", (event) => {
        const button = event.target.closest("[data-delete-post]");
        if (!button) return;
        profile.posts = profile.posts.filter((p) => p.id !== button.dataset.deletePost);
        persist();
        renderPosts();
    });

    $("friendForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const name = $("friendName").value.trim();
        if (!name) return;
        profile.friends.unshift({ id: PS.uid(), name, contact: $("friendContact").value.trim(), at: new Date().toISOString() });
        persist();
        PS.addActivity(`Added ${name} as a friend`);
        profile = PS.load();
        event.target.reset();
        renderAll();
    });

    $("friendList").addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-friend]");
        if (!button) return;
        profile.friends = profile.friends.filter((f) => f.id !== button.dataset.removeFriend);
        persist();
        renderAll();
    });

    renderAll();
    $("myQrButton").addEventListener("click", () => {
        if (!profile.name) {
            feedback.textContent = "Add your name in Edit profile first, so friends know who is sending the request.";
            return;
        }
        QrShare.show({
            title: `${profile.name} - friend request`,
            note: "Ask a friend to scan this code with their phone camera to add you as a friend.",
            url: QrShare.friendLink(profile)
        });
    });

    function handleScannedLink() {
        const params = new URLSearchParams(window.location.search);
        const friendParam = params.get("friend");
        const churchParam = params.get("church");
        if (!friendParam && !churchParam) return;
        window.history.replaceState({}, "", window.location.pathname);

        const data = QrShare.decode(friendParam || churchParam);
        const name = data && QrShare.text(data.n, 120);
        if (!name) {
            feedback.textContent = "That QR code isn't valid.";
            return;
        }
        const inviteModal = bootstrap.Modal.getOrCreateInstance($("inviteModal"));
        const confirm = $("inviteConfirm");
        const fresh = confirm.cloneNode(true);
        confirm.replaceWith(fresh);

        if (friendParam) {
            $("inviteTitle").textContent = "Friend request";
            $("inviteBody").innerHTML = `<p class="mb-0"><strong>${esc(name)}</strong> would like to be your friend.</p>`;
            fresh.textContent = "Add friend";
            fresh.addEventListener("click", () => {
                const result = PS.addFriend({ id: QrShare.text(data.i, 40), name, church: QrShare.text(data.c, 120), via: "qr" });
                if (result.status === "error" || result.status === "invalid") {
                    feedback.textContent = "Could not save this friend request. Check browser storage and try again.";
                    console.error("Unable to save friend request:", result.status);
                    inviteModal.hide();
                    return;
                }
                inviteModal.hide();
                feedback.textContent = result.status === "self" ? "That's your own QR code."
                    : result.status === "exists" ? `${name} is already your friend.`
                    : `${name} was added to your friends.`;
                profile = PS.load();
                renderAll();
            });
        } else {
            const address = QrShare.text(data.a, 200);
            $("inviteTitle").textContent = "Join church";
            $("inviteBody").innerHTML = `<p class="mb-1">Join <strong>${esc(name)}</strong> as a parishioner?</p>${address ? `<p class="small text-body-secondary mb-0">${esc(address)}</p>` : ""}`;
            fresh.textContent = "Join as parishioner";
            fresh.addEventListener("click", () => {
                PS.joinChurch({ name, address, denomination: QrShare.text(data.d, 80) });
                inviteModal.hide();
                feedback.textContent = `You're now a parishioner of ${name}.`;
                profile = PS.load();
                renderAll();
            });
        }
        inviteModal.show();
    }

    handleScannedLink();})();
