(() => {
    const PUBLIC_URL = "https://biblical-study-tools-2027.onrender.com/";
    const base = /^(localhost|127\.|\[::1\])/.test(window.location.hostname) || window.location.protocol === "file:"
        ? PUBLIC_URL
        : new URL("./", window.location.href).href;

    function encode(data) {
        const bytes = new TextEncoder().encode(JSON.stringify(data));
        let binary = "";
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function decode(value) {
        try {
            const padded = value.replace(/-/g, "+").replace(/_/g, "/");
            const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
            const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
            return data && typeof data === "object" && !Array.isArray(data) ? data : null;
        } catch {
            return null;
        }
    }

    const text = (value, max) => (typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

    function friendLink(profile) {
        return `${base}?friend=${encode({ n: text(profile.name, 80), i: profile.id, c: text(profile.church?.name, 120) })}`;
    }

    function churchLink(church) {
        return `${base}?church=${encode({
            n: text(church.name, 120),
            a: text(church.address, 200),
            d: text(church.denomination, 80),
            la: Number(church.lat) || 0,
            lo: Number(church.lon) || 0
        })}`;
    }

    function qrSvg(url) {
        const qr = window.qrcode(0, "M");
        qr.addData(url);
        qr.make();
        return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    }

    let modalEl;
    let modal;
    let state = {};

    function ensureModal() {
        if (modalEl) return;
        modalEl = document.createElement("div");
        modalEl.className = "modal fade";
        modalEl.id = "qrShareModal";
        modalEl.tabIndex = -1;
        modalEl.setAttribute("aria-labelledby", "qrShareTitle");
        modalEl.setAttribute("aria-hidden", "true");
        modalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title h5" id="qrShareTitle"></h2>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="qr-box mx-auto" id="qrShareImage" role="img"></div>
                        <p class="mt-3 mb-1" id="qrShareNote"></p>
                        <p class="small text-body-secondary mb-0" id="qrShareFeedback" role="status" aria-live="polite"></p>
                        <label class="form-label small mt-3" for="qrShareUrl">Invitation link</label>
                        <input class="form-control form-control-sm" id="qrShareUrl" type="url" readonly>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-primary" id="qrShareAction" hidden></button>
                        <button type="button" class="btn btn-outline-secondary" id="qrShareCopy"><i class="bi bi-link-45deg me-1" aria-hidden="true"></i>Copy link</button>
                        <button type="button" class="btn btn-outline-secondary" id="qrShareSend" hidden><i class="bi bi-share me-1" aria-hidden="true"></i>Share</button>
                        <button type="button" class="btn btn-outline-secondary" id="qrShareDownload"><i class="bi bi-download me-1" aria-hidden="true"></i>Download QR</button>
                        <a class="btn btn-outline-secondary" id="qrShareEmail"><i class="bi bi-envelope me-1" aria-hidden="true"></i>Email invitation</a>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalEl);
        modal = bootstrap.Modal.getOrCreateInstance(modalEl);

        const feedback = modalEl.querySelector("#qrShareFeedback");
        modalEl.querySelector("#qrShareCopy").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(state.url);
                feedback.textContent = "Link copied.";
            } catch (error) {
                modalEl.querySelector("#qrShareUrl").focus();
                modalEl.querySelector("#qrShareUrl").select();
                feedback.textContent = "Couldn't copy automatically. Copy the selected invitation link manually.";
                console.error("Unable to copy QR invitation:", error);
            }
        });
        const send = modalEl.querySelector("#qrShareSend");
        send.hidden = !navigator.share;
        send.addEventListener("click", async () => {
            send.disabled = true;
            try {
                await navigator.share({ title: state.title, url: state.url });
                feedback.textContent = "Invitation sent to your selected sharing app.";
            } catch (error) {
                feedback.textContent = error.name === "AbortError"
                    ? "Sharing canceled." : "Could not open sharing. Copy the invitation link or download the QR code.";
                if (error.name !== "AbortError") console.error("Unable to share QR invitation:", error);
            } finally {
                send.disabled = false;
            }
        });
        modalEl.querySelector("#qrShareDownload").addEventListener("click", () => {
            const url = URL.createObjectURL(new Blob([qrSvg(state.url)], { type: "image/svg+xml" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "biblical-study-tools-invitation.svg";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            feedback.textContent = "QR image download requested. Attach the image to your message.";
        });
        modalEl.querySelector("#qrShareAction").addEventListener("click", () => {
            if (state.onAction) feedback.textContent = state.onAction() || "";
        });
    }

    function show({ title, note, url, actionLabel, onAction }) {
        ensureModal();
        state = { title, url, onAction };
        modalEl.querySelector("#qrShareTitle").textContent = title;
        modalEl.querySelector("#qrShareImage").innerHTML = qrSvg(url);
        modalEl.querySelector("#qrShareImage").setAttribute("aria-label", `QR code: ${title}`);
        modalEl.querySelector("#qrShareNote").textContent = note || "";
        modalEl.querySelector("#qrShareUrl").value = url;
        modalEl.querySelector("#qrShareEmail").href = `mailto:?${new URLSearchParams({ subject: title, body: `${note || title}\n\n${url}` })}`;
        modalEl.querySelector("#qrShareFeedback").textContent = "";
        const action = modalEl.querySelector("#qrShareAction");
        action.hidden = !actionLabel;
        action.textContent = actionLabel || "";
        modal.show();
    }

    function showChurchQr(data) {
        show({
            title: data.name || "Church QR code",
            note: "Scan to join this church as a parishioner on your profile.",
            url: churchLink(data),
            actionLabel: "Join as parishioner",
            onAction: () => {
                if (!window.ProfileStore) return "";
                window.ProfileStore.joinChurch(data);
                return `You're now a parishioner of ${data.name || "this church"}. See it on your profile.`;
            }
        });
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-church-qr]");
        if (!button) return;
        showChurchQr({
            name: button.dataset.name,
            address: button.dataset.address,
            denomination: button.dataset.denomination,
            lat: button.dataset.lat,
            lon: button.dataset.lon
        });
    });

    window.QrShare = { show, decode, friendLink, churchLink, text };
})();
