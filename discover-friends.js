(() => {
    const PS = window.ProfileStore;
    const $ = id => document.getElementById(id);
    const results = $("discoverFriendResults");
    const feedback = $("discoverFriendFeedback");
    const form = $("discoverFriendForm");
    const search = $("discoverFriendSearch");
    const churchFilter = $("discoverFriendChurch");
    const contactsButton = $("selectFriendContacts");
    let contacts = [];
    let editingId = null;
    const normalize = value => String(value || "").trim().toLocaleLowerCase();

    function resetForm() {
        editingId = null;
        form.reset();
        $("discoverFriendFormTitle").textContent = "Add a friend manually";
        $("saveDiscoverFriend").textContent = "Save friend";
        $("cancelDiscoverFriendEdit").hidden = true;
    }

    function editFriend(friend) {
        editingId = friend.id || null;
        $("discoverFriendName").value = friend.name || "";
        $("discoverFriendContact").value = friend.contact || "";
        $("discoverFriendAffiliation").value = friend.church || "";
        $("discoverFriendFormTitle").textContent = editingId ? "Edit saved friend" : "Save selected contact";
        $("saveDiscoverFriend").textContent = editingId ? "Save changes" : "Save friend";
        $("cancelDiscoverFriendEdit").hidden = false;
        $("discoverFriendName").focus();
    }

    function render() {
        const profile = PS.load();
        const previous = churchFilter.value;
        churchFilter.replaceChildren();
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All affiliations";
        churchFilter.appendChild(all);
        const affiliations = [...new Set([profile.church.name, ...profile.friends.map(friend => friend.church)]
            .map(name => String(name || "").trim()).filter(Boolean))].sort();
        affiliations.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            churchFilter.appendChild(option);
        });
        churchFilter.value = affiliations.includes(previous) ? previous : "all";
        const savedKeys = new Set(profile.friends.map(friend => `${normalize(friend.name)}|${normalize(friend.contact)}`));
        const entries = [
            ...profile.friends.map(friend => ({ ...friend, saved: true })),
            ...contacts.filter(contact => !savedKeys.has(`${normalize(contact.name)}|${normalize(contact.contact)}`))
        ];
        const query = normalize(search.value);
        const matches = entries.filter(friend =>
            normalize(`${friend.name} ${friend.contact || ""} ${friend.church || ""}`).includes(query) &&
            (churchFilter.value === "all" || normalize(friend.church) === normalize(churchFilter.value))
        );
        results.replaceChildren();
        matches.forEach(friend => {
            const row = document.createElement("li");
            row.className = "profile-item flex-wrap";
            const details = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = friend.name;
            const note = document.createElement("p");
            note.className = "small text-body-secondary mb-0";
            note.textContent = [friend.contact, friend.church, friend.saved ? "Saved friend" : "Selected contact (not saved)"].filter(Boolean).join(" · ");
            details.append(name, note);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn btn-outline-primary btn-sm";
            button.textContent = friend.saved ? "Edit affiliation" : "Add to friends";
            button.addEventListener("click", () => editFriend(friend));
            row.append(details, button);
            results.appendChild(row);
        });
        if (!matches.length) {
            const empty = document.createElement("li");
            empty.className = "text-body-secondary p-3";
            empty.textContent = "No friends or contacts match. Add a friend, choose contacts, or change the filters.";
            results.appendChild(empty);
        }
        $("discoverFriendCount").textContent = `${matches.length} ${matches.length === 1 ? "result" : "results"}`;
        $("clearSelectedContacts").hidden = contacts.length === 0;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        const friend = {
            name: $("discoverFriendName").value.trim(),
            contact: $("discoverFriendContact").value.trim(),
            church: $("discoverFriendAffiliation").value.trim()
        };
        if (!friend.name) {
            feedback.textContent = "Enter a friend's name before saving.";
            return;
        }
        if (editingId) {
            const profile = PS.load();
            const existing = profile.friends.find(item => item.id === editingId);
            if (!existing) {
                feedback.textContent = "This friend is no longer saved. Refresh the list and try again.";
                render();
                return;
            }
            Object.assign(existing, friend);
            if (!PS.save(profile)) {
                feedback.textContent = "Could not save friend changes. Check browser storage and try again.";
                console.error("Unable to save friend affiliation.");
                return;
            }
        } else {
            const result = PS.addFriend(friend);
            if (result.status !== "added") {
                feedback.textContent = result.status === "exists" ? "This friend is already saved. Edit their affiliation from the list."
                    : "Could not save this friend. Check browser storage and try again.";
                if (result.status !== "exists") console.error("Unable to save Discover friend:", result.status);
                return;
            }
        }
        feedback.textContent = "Friend saved on this device.";
        resetForm();
        render();
    });
    contactsButton.addEventListener("click", async () => {
        if (!window.isSecureContext || typeof navigator.contacts?.select !== "function") {
            feedback.textContent = "This browser does not support contact selection. Enter a friend manually below, or share your QR invitation.";
            $("discoverFriendName").focus();
            return;
        }
        contactsButton.disabled = true;
        try {
            const supported = await navigator.contacts.getProperties();
            const properties = ["name", "email", "tel"].filter(property => supported.includes(property));
            if (!properties.includes("name")) throw new Error("Contact names are not supported by this browser.");
            const selected = await navigator.contacts.select(properties, { multiple: true });
            const next = selected.flatMap(contact => {
                const name = String(contact.name?.[0] || "").trim().slice(0, 80);
                if (!name) return [];
                return [{ name, contact: String(contact.email?.[0] || contact.tel?.[0] || "").slice(0, 120), church: "" }];
            });
            const combined = new Map([...contacts, ...next].map(contact =>
                [`${normalize(contact.name)}|${normalize(contact.contact)}`, contact]
            ));
            contacts = [...combined.values()];
            feedback.textContent = `${next.length} named contacts selected. Review and save each friend explicitly. Unnamed contacts are not listed.`;
            render();
        } catch (error) {
            feedback.textContent = error.name === "AbortError" ? "Contact selection canceled."
                : "Could not access selected contacts. Try again or add a friend manually.";
            if (error.name !== "AbortError") console.error("Unable to select friend contacts:", error);
        } finally {
            contactsButton.disabled = false;
        }
    });
    $("inviteDiscoverFriends").addEventListener("click", () => {
        const profile = PS.load();
        if (!profile.name) {
            feedback.textContent = "Add your name in My profile before sending a friend request.";
            return;
        }
        window.QrShare.show({
            title: `${profile.name} - friend request`,
            note: "Scan this QR code or open the link to accept my friend invitation in Biblical Study Tools. The accepted friend is saved on your device only.",
            url: window.QrShare.friendLink(profile)
        });
    });
    $("clearSelectedContacts").addEventListener("click", () => {
        contacts = [];
        if (!editingId) resetForm();
        render();
        feedback.textContent = "Selected contacts cleared. Saved friends are unchanged.";
    });
    $("cancelDiscoverFriendEdit").addEventListener("click", resetForm);
    search.addEventListener("input", render);
    churchFilter.addEventListener("change", render);
    window.addEventListener("storage", event => {
        if (event.key === "bstProfile") render();
    });
    render();
})();
