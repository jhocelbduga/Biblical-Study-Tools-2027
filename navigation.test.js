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

test("Daily Verse groups saves and verse actions in accessible menus while keeping Share separate", () => {
    assert.match(home, /id="verseSavedToggle"[^>]*data-bs-toggle="dropdown"[^>]*aria-expanded="false"[^>]*aria-controls="verseSavedActions"[^>]*aria-label="Save verse options"/);
    assert.match(home, /<ul class="dropdown-menu" id="verseSavedActions" aria-labelledby="verseSavedToggle"><\/ul>/);
    assert.match(home, /id="verseActionsToggle"[^>]*data-bs-toggle="dropdown"[^>]*aria-expanded="false"[^>]*aria-controls="verseActions"[^>]*aria-label="Verse actions"/);
    const menu = home.match(/<ul[^>]*id="verseActions"[^>]*>([\s\S]*?)<\/ul>/)[1];
    for (const id of ["copyVerseButton", "anotherVerseButton", "postVerseToFeed", "reflectVerseToFeed"]) {
        assert.match(menu, new RegExp(`<button class="dropdown-item" id="${id}"`));
        assert.equal(home.split(`id="${id}"`).length, 2);
    }
    assert.ok(!menu.includes('id="shareVerseButton"'));
    assert.match(home, /id="shareVerseButton"[^>]*aria-expanded="false"[^>]*aria-controls="verseShareOptions"/);
    const script = readFileSync(new URL("./index.js", import.meta.url), "utf8");
    assert.match(script, /for \(const type of \["verse", "highlight", "image"\]\)/);
    assert.match(script, /save.className = "dropdown-item"/);
    assert.match(script, /const item = document.createElement\("li"\);\s*item.append\(save\);\s*savedActions.append\(item\)/);
});

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

test("notification header groups settings then close at the far right without Bootstrap negative margins", () => {
    const header = home.slice(home.indexOf('class="modal-header notification-header"'), home.indexOf('id="notificationInboxView"'));
    assert.match(header, /notification-header-title/);
    const actions = header.slice(header.indexOf('class="notification-header-actions'));
    assert.ok(actions.indexOf('id="notificationSettingsButton"') < actions.indexOf('class="btn-close"'));
    assert.match(actions, /data-bs-dismiss="modal" aria-label="Close"/);
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    assert.match(css, /\.notification-header-actions\s*\{[^}]*margin-left: auto;[^}]*flex-shrink: 0;/);
    assert.match(css, /\.notification-header-actions \.btn-close\s*\{[^}]*margin: 0;/);
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
