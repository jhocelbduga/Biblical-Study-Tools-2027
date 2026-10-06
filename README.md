# Biblical Study Tools

**Created and developed by Jhocel Duga - Sole Full Stack Developer**

Biblical Study Tools is a modern web and mobile application designed to help users
deepen their engagement with Scripture through daily devotional reflection,
Bible reading plans, random verse generation, study resources, and biblical
analytics, all within an intuitive and responsive digital experience.

The application brings practical study tools into one accessible interface:
discover Scripture, build a reading habit, reflect on a verse, explore biblical
content, and celebrate progress. Its mobile experience is delivered as an
installable Progressive Web App (PWA), rather than a separate native app.

## Table of contents

- [Developer and project ownership](#developer-and-project-ownership)
- [Live applications](#live-applications)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture and project structure](#architecture-and-project-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Using the application](#using-the-application)
- [Testing and validation](#testing-and-validation)
- [Deployment](#deployment)
- [Privacy, persistence, and limitations](#privacy-persistence-and-limitations)
- [Accessibility and responsive design](#accessibility-and-responsive-design)
- [Future development](#future-development)
- [Feedback and support](#feedback-and-support)
- [Attribution and licensing](#attribution-and-licensing)

## Developer and project ownership

**Jhocel Duga is the sole Full Stack Developer of Biblical Study Tools.**

Jhocel Duga leads the application's full development lifecycle, including:

- Product direction and user experience design.
- Responsive frontend interfaces and client-side functionality.
- Backend endpoints and third-party service integrations.
- Reading-progress tracking, analytics, and achievement experiences.
- Application testing, deployment, and ongoing maintenance.

Developer profile: [Jhocel Duga on GitHub](https://github.com/jhocelbduga).

Third-party libraries, hosting providers, and linked content are acknowledged
below; they are not presented as original works of the application developer.

## Live applications

| Application | Location |
| --- | --- |
| Biblical Study Tools - primary site | [Open on Render](https://biblical-study-tools-2027.onrender.com/) |
| Biblical Study Tools - static mirror | [Open on GitHub Pages](https://jhocelbduga.github.io/Biblical-Study-Tools-2027/) |
| Companion KJV Scripture Reader | [Read the KJV Bible](https://jhocelbduga.github.io/The-King-James-Version-of-the-Bible/) |
| Source repository | [Biblical-Study-Tools-2027](https://github.com/jhocelbduga/Biblical-Study-Tools-2027) |

The primary Render site supports server-backed integrations when configured.
GitHub Pages hosts static features only: it cannot run the authentication
configuration or newsletter subscription endpoints.

## Features

### Daily devotional reflection and verse generation

- Find a random passage from a curated collection of KJV verses.
- Read its Scripture text and reference in a focused Daily Verse card.
- Use the ellipsis menu to save the verse, highlight, or verse image on this device.
- Use the hamburger menu to copy, get another verse, post to Home Feed, or write a reflection; Share remains a separate button.
- Customize the card with Sage green, Ocean blue, Warm parchment, or Midnight.
- Choose Classic, Centered, or Minimal card designs.
- Save design preferences locally and restore defaults with Reset.
- Open verse-specific links for reflection and sharing.

Daily reflection is Scripture-centered. The application does not currently
provide a separate library of authored daily devotional articles.

### Flexible verse sharing

- Copy a public verse link or share through email.
- Open sharing options for Facebook, X, LinkedIn, WhatsApp, Pinterest, Tumblr,
  and LINE.
- Use native device sharing where the browser supports it.
- Receive explicit feedback for cancellations and failed copy/share attempts.

Customized card styling is local to the application. Public links and existing
verse image assets retain their original presentation.

### Guided Bible reading plans

- Browse a searchable, filterable catalog of six guided reading plans.
- Preview plan details before starting.
- Start, resume, or pause a plan and select a reading day directly.
- Mark individual passages complete and highlight completed readings.
- Confirm progress changes before saving.
- Complete a whole day and continue to the next unfinished day.
- Keep progress saved locally across page reloads.

Reading changes update analytics after storage succeeds. Canceled changes or
failed saves preserve the previous recorded progress.

### Biblical analytics and milestones

- Explore Bible book, chapter, and verse totals.
- Review completed plan days, completed passages, and reading history.
- Track the number of finished reading plans.
- View milestone goals and earned achievements.
- Receive saved achievement notifications in the application's notification
  inbox, with unread indicators and mark-as-read controls.

Reading-plan milestones recognize:

| Metric | Milestone thresholds |
| --- | --- |
| Completed plan days | 1, 7, 30, 100 |
| Completed plan passages | 1, 10, 50, 100 |
| Finished reading plans | 1, 3, 6 |

Current progress decreases when completion is undone. Previously earned
achievements remain earned and are not repeatedly awarded.

### Discover and study resources

- Search curated Scripture content by topic or keyword.
- Browse biblical study resources and video previews.
- Discover churches with an All churches default and optional type filters.
- Access the companion KJV reader for full Scripture reading.

Church results depend on the external discovery service and available location
information; they are not a verified membership directory.

### Bible video discovery

- Browse 12 curated video or collection entries.
- Filter by query, topic, provider, and content type.
- View featured collections and provider groupings.
- Open an in-app watch landing page with a Return Home button.
- Follow the official provider link for playback in a separate tab.

Videos are linked, not hosted or embedded. The application uses its own catalog
presentation rather than redistributing provider thumbnails or video content.

### Shared Home Feed and account friendships

- See a social-style, chronological activity timeline with live updates.
- Automatically log newly earned plan milestones, new passage completions and
  verse-sharing actions while signed in, plus new Profile posts with their
  selected audience.
- Post verses, personal reflections and updates with Public, Friends Only or
  Private audiences enforced by Supabase row-level authorization.
- Send and accept account-code friend requests; these are separate from local
  Discover contacts.
- Like/unlike, comment, copy public activity links, and reflect on shared verses.
- Owners can change audiences and disable new comments without hiding old ones.
- New accounts default automatic activities to Private. Failed publications
  show retry controls; there is no historical backfill or persistent offline outbox.

Configure the schema and Realtime using [FEED-SETUP.md](./FEED-SETUP.md).
The separate KJV reader's activities remain device-local. Hosted Supabase
configuration is required before shared feed operations can work.

### Shared communities

- Browse public communities by name, description, or city.
- Create a community while signed in and become its owner and first member.
- Join open communities, view joined communities, and leave as a non-owner.
- Search communities near your location within 10, 25, 50, or 100 km.
- Optionally register a safe public meeting location for nearby discovery.

This feature requires the configured Supabase database in
[COMMUNITY-SETUP.md](./COMMUNITY-SETUP.md). Results cover communities registered
in this app, not every community worldwide, and display up to 50 matches.
Community membership is shared across accounts; local friends and reading
progress remain separate. Moderation, community chat, editing, and owner
transfer are not included.

### Local profiles, friends, and QR invitations

#### Profile Saved library

The Saved tab follows Activity and includes Notes, Highlights, Verses, Images,
Plans, Video, Events and Prayer, with expandable icon/arrow categories.

- Create private device-local notes and prayers with optional verse references.
- Save/highlight Daily Verse cards and save their existing posted verse images.
  Highlights apply inside Study Tools, not the separate KJV reader.
- Save plans from Browse Plans, and videos from catalog/Discover/Watch.
- Plan menus offer Start a plan (opens the existing confirmation screen),
  Remove from saved, Share plan (copy link), and Plan info. Removing a bookmark
  does not delete reading progress.
- Video cards have generic app-created preview thumbnails, titles and menus
  for Share video, Remove from saved and Video info. These are not official
  provider screenshots.
- Verses also aggregates saved videos/plans; Prayer also includes saved plans.
- Events opens upcoming Home Feed events; Saved events lists all bookmarked
  events, including past events. Event details are reauthorized by the backend
  rather than copied into storage.
- Dated event posting requires the additive migration
  [feed-events.sql](./feed-events.sql) after the base feed schema.

Saved entries use `bstSavedItems` on this origin and device. Clearing browser
storage removes them. They are not cloud-synced or automatically deleted on
logout. Explicitly saved verse text is a local copy and cannot be recalled by
later audience changes. Event bookmarks store only IDs. Posted images currently
mean the app's existing curated verse images; arbitrary image uploads are not
implemented.

- Maintain a device-local profile and saved friends.
- Search local friends and filter by church affiliation.
- Select contacts with permission in supported browsers, or enter them manually.
- Generate, copy, download, email, or share QR invitations.
- Accept invitations with duplicate and self-request safeguards.

Contacts remain temporary until explicitly saved. Invitations encode a local
identity, display name, and church affiliation, not contact details.
There is no central friend-search service or verified church-member database.

### Account authentication

The account integration supports:

- Supabase email/password registration and login.
- Google (including Gmail) and Facebook OAuth sign-in when the providers are configured.
- Email confirmation.
- Password-reset requests and recovery.
- Persistent browser sessions and sign-out on the current device.
- A separate optional newsletter prompt after login; social sign-in never enrolls users automatically.

**Authentication must be configured before accounts can be used.** With missing
configuration, the account page shows an explicit unavailable message and
disables account operations. See [ACCOUNT-SETUP.md](./ACCOUNT-SETUP.md).

Accounts do not currently synchronize local profiles, friends, reading plans,
or achievements. The shared feed records new signed-in actions separately;
account friendships and the feed display name are stored in Supabase.

### Newsletter subscriptions and notifications

Email and push settings include Daily Verse text/image times, Bible news, saved-plan
selectors, plan participant updates, Friends, Prayer, My Church, and app activity
switches. Reminder times use device-local time. The prayer selector reuses saved
reading plans, not a separate prayer library. Existing Friends preferences are
preserved, and email/verse push preferences are independent. These settings are
stored only on this device: they do not schedule or deliver email/push alerts
or enroll users in newsletters. Existing email switches are preserved. Shared
plan invitations, prayer sharing and church post notifications require future
services.

- Subscribe to updates through the server's Mailchimp integration.
- Use the confirmation email flow before joining the mailing list.
- Review the in-app notification inbox and mark notifications as read.
- Save notification preference choices locally.

Authentication and newsletter subscription are separate features. Achievement
notifications are in-app only. The notification settings interface does not
implement a general email or device-push delivery service.

The header hides Sign in while an authenticated session is active and provides
My account for account management and sign-out. Subscribe is hidden after a
successful newsletter request and on reload when the device's saved subscription
flag is present. This flag records submission, not proof of email confirmation,
and is independent of login; signing in alone does not hide Subscribe.

### Installable web and mobile experience

- Responsive layouts for phones, tablets, and desktops.
- PWA manifest, app icons, and standalone display support.
- Apple and Android installation guidance.
- Service-worker caching for the application shell and eligible resources.
- Offline access to previously cached content where supported.

First-time downloads, authentication, subscriptions, external videos, and
external discovery services require internet access. Offline behavior depends
on browser support and which resources have already been cached.

### Companion KJV reader

The [KJV reader](https://github.com/jhocelbduga/The-King-James-Version-of-the-Bible)
is maintained in a separate repository. Its reading tools include:

- Book and chapter navigation and Scripture search.
- Individual verse controls to mark a verse as read or undo that mark.
- Read-verse highlighting and per-chapter completion counts.
- Total marked verses and progress toward reading milestones.
- Achievements at 1, 10, 50, 100, 500, and 1,000 verses.
- Persistent achievement notifications with mark-as-read controls.
- A first-visit offline download prompt with Not now and a permanent download
  button. Downloading saves the reader and Scripture files for offline use on
  that device; online reading does not require downloading.

Reader records and reading-plan records are independent. The two applications
do not currently combine or synchronize their statistics.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| UI components | Bootstrap 5.3.3 |
| Icons | Bootstrap Icons 1.11.3 |
| Backend | Node.js 20 or later, built-in HTTP and filesystem modules |
| Authentication | Supabase JavaScript SDK, email/password authentication, PKCE |
| Newsletter | Mailchimp server-side integration |
| Persistence | Browser localStorage/Cache Storage; Supabase shared feed and communities |
| Mobile/offline support | Web app manifest and service worker |
| Tests | Node.js built-in test runner and assertions |
| Hosting | Render and GitHub Pages |

The main application uses native browser APIs and does not require a frontend
framework or bundling step. Frontend libraries and the pinned Supabase SDK are
loaded from CDN resources.

## Architecture and project structure

The Node server serves the static application and handles its integration
endpoints. Most study interactions run in the browser and save their state
locally. Authentication requests are handled by Supabase; newsletter requests
are forwarded to Mailchimp by the server. Shared communities and memberships
use authenticated Supabase RPCs and database records. Shared feed posts,
account friendships, comments, likes and activity events use restricted RPCs,
row-level authorization and Supabase Realtime.

```text
Browser / installed PWA
  |-- Static pages, styles, and JavaScript
  |-- Local reading plans, profiles, preferences, and achievements
  |-- Supabase authentication through the browser SDK
  |-- Supabase community directory and membership RPCs
  |
Node.js server
  |-- Static file serving
  |-- GET /api/auth/config
  |-- POST /api/subscribe --> Mailchimp
  |
External official content
  |-- KJV reader
  |-- Video providers and church discovery services
```

Key files:

```text
Biblical-Study-Tools-2027/
  index.html                 Home, plans, analytics, verse and notification UI
  index.js                   Main application behavior
  styles.css                 Shared styling and responsive layouts
  verse-design.js            Daily Verse appearance preferences
  plan-milestones.js         Plan achievement tracking
  activity-events.js         Extensible browser activity event registry
  feed-publisher.js          Shared publication RPC adapter
  feed.js                   Home timeline, composer, engagements and friends
  profile-feed.js            Profile-post publishing and retry feedback
  feed.sql                  Feed schema, privacy policies and event triggers
  FEED-SETUP.md              Setup, limitations and integration checks
  feed-database-check.js    Disposable PostgreSQL behavior verification
  discover.html              Scripture and resource discovery
  discover.js                Discovery interactions
  discover-friends.js        Contacts, local friends, and invitations
  communities.js             Shared directory, creation, and membership UI
  communities.sql            Community tables and restricted database RPCs
  supabase-client.js         Shared authentication client initialization
  churches.html              Church listings and filters
  churches.js                Church discovery helpers
  videos.html                Video catalog
  videos-data.js             Curated official video metadata
  videos.js                  Catalog search and filters
  watch.html                 Video landing page
  watch.js                   Official playback-link resolution
  profile.html               Device-local user profile
  profile-store.js            Profile and friend persistence
  profile.js                 Profile interactions
  qr-share.js                QR invitation sharing
  account.html               Registration, login, and recovery interface
  account.js                 Supabase authentication controller
  auth-config.js             Public authentication configuration validation
  server.js                  Static server and integration endpoints
  service-worker.js          Offline caching
  install.js                 PWA installation interactions
  manifest.webmanifest       Application identity and icons
  render.yaml                Render deployment configuration
  package.json               Runtime scripts and validation commands
  *.test.js                  Regression tests
  ACCOUNT-SETUP.md            Supabase configuration guide
  COMMUNITY-SETUP.md          Community database setup and verification
  README.md                  Project documentation
```

## Getting started

### Prerequisites

- Node.js **20 or later** and npm.
- Git for cloning the repository.
- A modern browser.
- Optional Supabase and Mailchimp projects for their respective integrations.

### Clone and run

```powershell
git clone https://github.com/jhocelbduga/Biblical-Study-Tools-2027.git
Set-Location .\Biblical-Study-Tools-2027
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

To use another port in PowerShell:

```powershell
$env:PORT = "3100"
npm start
```

The account and newsletter integrations require the Node server. Opening HTML
directly with a `file:` URL is not a substitute for running the backend, and
PWA installation requires a secure context such as HTTPS or localhost.

## Environment configuration

| Variable | Purpose | Required for |
| --- | --- | --- |
| `PORT` | HTTP listener port; defaults to 3000 | Optional |
| `SUPABASE_URL` | HTTPS Supabase project origin | Accounts |
| `SUPABASE_PUBLISHABLE_KEY` | Public key beginning with `sb_publishable_` | Accounts |
| `MAILCHIMP_API_KEY` | Private Mailchimp API credential | Newsletter subscriptions |
| `MAILCHIMP_AUDIENCE_ID` | Mailchimp audience identifier | Newsletter subscriptions |

Set variables in the hosting dashboard or the process environment before
starting the server. The server does not automatically load a `.env` file.

**Never commit credentials or place private configuration files in the app
directory.** The server serves static files from that directory. Keep Mailchimp
credentials in server environment variables only.

Only the Supabase project URL and publishable key are exposed by
`GET /api/auth/config`. Secret and service-role keys are rejected. This endpoint
uses `Cache-Control: no-store` and is excluded from authentication-resource
caching by the service worker.

Follow [ACCOUNT-SETUP.md](./ACCOUNT-SETUP.md) to configure the email provider,
SMTP delivery, password policy, allowed redirects, and production account
verification. PKCE email confirmation and recovery should be opened in the
browser that initiated the request.

Mailchimp subscriptions require a valid API key and audience. Ensure the
audience is configured for the information collected by the subscription form
and verify confirmation-email delivery before public use.

## Using the application

1. Open the ellipsis **More navigation options** menu to visit Home, Discover,
   Videos, Daily verses, Plans, Explore, or Statistics.
   On Home and Discover, the profile icon precedes the Bible brand, the bell sits
   left of the ellipsis, and a hamburger menu to its right contains account/app
   actions. Home's hamburger retains subscription and installation controls.
2. Choose **Find a verse** for a Scripture passage. Expand **Customize verse
   card** to change its colour and design, or use Share to send its link.
3. Open **Explore plans**, preview a plan, and start reading. Mark passages
   complete and confirm the save when prompted.
4. Review **Reading milestones** and **Explore insights** for progress and
   biblical analytics. Newly earned plan milestones appear in Notifications.
5. Visit Discover for Scripture topics, church discovery, friends, and resources.
6. Browse Videos and follow an official playback link from its watch page.
7. Open the companion KJV reader to read Scripture and mark individual verses
   as read. Review its separate verse milestones and achievement notifications.
8. Use **Sign in** only after the site owner enables Supabase. Use **Subscribe**
   separately for newsletter updates.

## Testing and validation

Run the main application's regression suite and JavaScript syntax checks:

```powershell
npm test
npm run check
```

Tests cover reading-plan confirmation and rollback, analytics updates, video
catalog and watch routing, local friends and invitations, account behavior with
mocked services, navigation destinations, card-design persistence, milestone
thresholds, notification updates, activity publication, feed retries,
account switching, comment settings and local Profile-post events.

The disposable PostgreSQL validator checks actual feed grants, privacy,
friendships, event triggers and engagement operations. See
[FEED-SETUP.md](./FEED-SETUP.md) for its separate tools setup and hosted
Supabase verification checklist.

Real Supabase email delivery, registration, recovery, and SMTP behavior require
a configured project and manual end-to-end verification. Mocked account tests
do not establish production authentication readiness.

In the separate KJV reader checkout, run:

```powershell
node --test reading-progress.test.mjs
node --check reading-progress.js
node --check service-worker.js
```

Recommended browser checks include mobile layout, keyboard navigation, offline
reloads, completion cancellation, failed-storage behavior, achievement
deduplication, notification read persistence, and account recovery.

## Deployment

### Render - primary application

Deploy this repository as a Node web service using [render.yaml](./render.yaml),
or configure:

- Build command: `npm install`
- Start command: `npm start`
- Runtime: Node.js 20 or later
- Environment variables: add the integration settings described above

Push validated changes to the connected branch to trigger deployment when
automatic deployment is enabled. Verify both the homepage and changed assets,
not just an HTTP success response.

The existing public verse-sharing URL and server-generated share metadata target
`https://biblical-study-tools-2027.onrender.com`. If deploying to another domain,
update those URLs and Supabase redirect settings deliberately.

### GitHub Pages - static mirror

GitHub Pages can publish the static application from the configured branch.
It cannot execute the Node server or its `/api/` routes. Account operations and
Mailchimp subscription requests therefore require the primary server-hosted
site.

Check the Actions deployment status after pushing. If the `github-pages`
environment requires approval, an authorized reviewer must approve the
deployment before the mirror updates.

### Companion reader

The KJV reader has its own repository and GitHub Pages deployment. Deploy its
changes there, not into the Biblical Study Tools repository.

When changing cached pages or scripts, update the appropriate service-worker
cache version so installed applications can receive the new shell.

## Privacy, persistence, and limitations

- **Local data:** profiles, friends, plan progress, verse-card preferences,
  achievements, and notification read states are stored in the current browser.
- **No historical cloud synchronization:** signing in does not upload existing
  local records. New signed-in activities are published to the shared feed with
  the saved audience (Private by default).
- **Shared feed:** account display names and account codes are public; post
  audiences, accepted friendships and owner comment settings are database
  enforced. Restricted items may remain onscreen until the next 10-second
  authorization refresh; previously seen/copied content cannot be recalled.
- **Separate applications:** the KJV reader and Biblical Study Tools maintain
  different progress stores. Origin, browser, and device differences also
  separate local data.
- **Data loss:** clearing browser storage, changing devices, or using another
  browser may remove or make local records unavailable. Export/import is not
  currently implemented.
- **Shared devices:** sign-out removes the account session on that device, not
  the device-local profile, friends, or reading history.
- **Contacts:** browser contact selection requires permission and support;
  manual entry is available. Selected contacts are not saved automatically.
- **QR invitations:** invitation identity and affiliation are locally supplied;
  they are not verified account or church-membership credentials.
- **External services:** authentication, newsletters, video playback, and
  discovery services have their own connectivity requirements and privacy terms.
- **Notifications:** achievement messages are saved in-app notifications, not
  background push alerts or automated achievement emails.
- **Scripture statistics:** standard KJV enumeration is used for analytics;
  verse numbering can vary by edition.
- **Authorization:** communities and feed use restricted RPCs and row-level
  authorization. Configure and verify their schemas before exposing them.

## Accessibility and responsive design

The interface uses semantic headings, labeled controls, keyboard-operable
Bootstrap components, status messages, and accessible names for icon buttons.
Responsive layouts adapt study cards, navigation, forms, and dialogs to smaller
screens. Read progress uses explicit controls and status text alongside
highlighting, rather than colour alone.

Accessibility remains an ongoing development responsibility. Browser testing
does not represent a formal accessibility certification.

## Future development

Potential enhancements, not claims of currently available functionality:

- Secure account-linked progress and profile synchronization.
- Export/import and backup tools for local reading records.
- Expanded devotional and study-resource catalogs.
- Church-member identity verification and richer account-friend discovery.
- Community moderation, editing, owner transfer, and richer membership tools.
- Optional push notifications with explicit permission and delivery services.
- Additional reading goals and richer longitudinal analytics.
- Improved accessibility testing and broader device coverage.

## Feedback and support

Report reproducible bugs or suggest improvements through the
[project issue tracker](https://github.com/jhocelbduga/Biblical-Study-Tools-2027/issues).
Include the affected page, steps to reproduce, browser/device details, and the
expected result. Do not post passwords, API keys, private contacts, or other
sensitive data.

Project developer: **Jhocel Duga - Sole Full Stack Developer**.

## Attribution and licensing

- Application design and development are credited to **Jhocel Duga**.
- Bootstrap, Bootstrap Icons, Supabase, and other third-party components retain
  their respective licenses and ownership.
- Bible App/YouVersion-inspired workflows are implemented independently; this
  project is not affiliated with or endorsed by YouVersion.
- Official video links belong to their respective content providers. Linked
  resources are not granted a redistribution license by this project.
- The KJV text has jurisdiction-specific rights considerations, including in
  the United Kingdom. Verify applicable permissions before redistributing
  Scripture content in your jurisdiction.

This README does not grant a software license. Unless an explicit license is
provided by the project owner, do not assume permission to reuse or redistribute
the application's source code.
