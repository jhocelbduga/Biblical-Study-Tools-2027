import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const destinations = [
    ["Home", "index.html#home"],
    ["Discover", "discover.html"],
    ["Videos", "videos.html"],
    ["Daily verses", "index.html#verse-generator"],
    ["Plans", "index.html#reading-plans"],
    ["Explore", "index.html#bible-explorer"],
    ["Statistics", "index.html#statistics"]
];
const home = readFileSync(new URL("./index.html", import.meta.url), "utf8");

for (const page of ["index.html", "discover.html", "videos.html", "profile.html", "churches.html"]) {
    test(`${page} provides all seven destinations in its accessible ellipsis dropdown`, () => {
        const html = readFileSync(new URL(page, import.meta.url), "utf8");
        assert.match(html, /id="navigationMenu"[^>]*data-bs-toggle="dropdown"[^>]*aria-expanded="false"[^>]*aria-controls="navigationLinks"[^>]*aria-label="More navigation options"/);
        assert.match(html, /bi bi-three-dots" aria-hidden="true"/);
        assert.doesNotMatch(html, /id="mainNavigation"|navbar-toggler/);
        const menu = html.match(/<ul[^>]*id="navigationLinks"[^>]*>([\s\S]*?)<\/ul>/)[1];
        const links = [...menu.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
            .map(([, href, label]) => [label, href.startsWith("#") ? `index.html${href}` : href]);
        assert.deepEqual(links, destinations);
        for (const [, href] of links) {
            if (href.includes("#")) {
                assert.ok(home.includes(`id="${href.split("#")[1]}"`), `${href} must target an existing section`);
            }
        }
        assert.match(html, /bootstrap@5\.3\.3\/dist\/js\/bootstrap\.bundle\.min\.js/);
    });
}

test("home account, subscription, notifications, profile, and install controls are preserved", () => {
    for (const id of ["subscribeButton", "notificationsButton", "profileButton", "appleInstallButton", "androidInstallButton"]) {
        assert.ok(home.includes(`id="${id}"`));
    }
    assert.match(home, /href="account.html">Sign in<\/a>/);
});

test("home header orders profile, branding, bell, ellipsis and hamburger with actions inside the menu", () => {
    const header = home.slice(home.indexOf("<header>"), home.indexOf("</header>"));
    const positions = ['id="profileButton"', 'class="navbar-brand', 'id="notificationsButton"', 'id="navigationMenu"', 'id="headerActionsToggle"']
        .map(marker => header.indexOf(marker));
    assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])));
    const menuStart = header.indexOf('id="headerActions"');
    for (const id of ["subscribeButton", "appleInstallButton", "androidInstallButton"]) {
        assert.ok(header.indexOf(`id="${id}"`) > menuStart);
    }
    assert.ok(header.indexOf("data-header-sign-in") > menuStart);
    assert.match(header, /bi bi-list" aria-hidden="true"/);
});
