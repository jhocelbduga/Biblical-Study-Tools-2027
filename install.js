let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallFeedback("Biblical Study Tools has been installed.");
});

function setInstallFeedback(message) {
    document.getElementById("installFeedback").textContent = message;
}

async function prepareOfflineAccess() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
        throw new Error("App installation and offline access require a secure HTTPS connection.");
    }

    await navigator.serviceWorker.register("./service-worker.js");
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
        throw new Error("The offline app could not be started. Please try again.");
    }

    const channel = new MessageChannel();
    const warnings = await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            channel.port1.close();
            reject(new Error("Preparing offline resources timed out. Please try again."));
        }, 20000);

        channel.port1.onmessage = ({ data }) => {
            window.clearTimeout(timeout);
            channel.port1.close();
            if (data.error) {
                reject(new Error(data.error));
            } else {
                resolve(data.warnings || []);
            }
        };

        registration.active.postMessage({
            type: "CACHE_RESOURCES",
            urls: performance.getEntriesByType("resource").map((entry) => entry.name)
        }, [channel.port2]);
    });
    return warnings;
}

document.addEventListener("DOMContentLoaded", () => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
            console.error("Unable to register the offline app:", error);
        });
    }

    document.getElementById("appleInstallButton").addEventListener("click", async () => {
        const button = document.getElementById("appleInstallButton");
        button.disabled = true;
        setInstallFeedback("Preparing the app for offline use…");
        try {
            const warnings = await prepareOfflineAccess();
            const resourceStatus = warnings.length
                ? " Some fonts or styles may be unavailable offline."
                : " App resources are ready offline.";
            setInstallFeedback(
                `${resourceStatus} iPhone/iPad: Safari > Share > Add to Home Screen.`
            );
        } catch (error) {
            setInstallFeedback(error instanceof Error ? error.message : "The app could not be prepared.");
            console.error("Unable to prepare the Apple app install:", error);
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("androidInstallButton").addEventListener("click", async () => {
        const button = document.getElementById("androidInstallButton");
        button.disabled = true;
        setInstallFeedback("Preparing the app for offline use…");
        try {
            const warnings = await prepareOfflineAccess();
            const resourceStatus = warnings.length
                ? "Some fonts or styles could not be saved offline. "
                : "";
            if (deferredInstallPrompt) {
                const prompt = deferredInstallPrompt;
                deferredInstallPrompt = null;
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                setInstallFeedback(outcome === "accepted"
                    ? `${resourceStatus}App installed.`
                    : `${resourceStatus}Install later from your browser menu.`);
            } else {
                setInstallFeedback(
                    `${resourceStatus}Offline ready. Install from your browser menu.`
                );
            }
        } catch (error) {
            setInstallFeedback(error instanceof Error ? error.message : "The app could not be prepared.");
            console.error("Unable to prepare the Android app install:", error);
        } finally {
            button.disabled = false;
        }
    });
});
