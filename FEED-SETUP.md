# Shared Home Feed setup

Developed by Jhocel Duga, Sole Full Stack Developer.

## Prerequisites

Configure the Render/Node site and Supabase accounts using
[ACCOUNT-SETUP.md](./ACCOUNT-SETUP.md). The feed uses the existing singleton
Supabase client and authenticated user ID, not the device-local profile ID.
GitHub Pages cannot supply the account configuration endpoint.

Run [feed.sql](./feed.sql) **once** in a fresh Supabase SQL Editor migration.
It is transactional and creates its own tables, RPCs, grants, row-level policies,
event triggers and Realtime publication entries. It does not depend on the
community schema. Do not rerun it over existing tables; use a reviewed migration
for later changes. Realtime must be enabled in the project. Never put service-role
keys in browser code.

Then run [feed-events.sql](./feed-events.sql) **once** to enable dated event
posts and Upcoming Events. On a project where the base feed is already
installed, run only this additive migration. It adds the event timestamp,
future-date validation, idempotent event publishing, and a paginated,
RLS-filtered upcoming-event query. Events share the same audience, comments,
likes and timeline processing as other posts.

The Home composer has **Create an upcoming event** and a local date/time input;
the server stores its UTC instant. Dates must be in the future. Event links and
Saved bookmarks are not permission grants. Saved stores only event IDs;
details are fetched under current authorization, including on Profile. A
restricted event can remain on screen until the next 10-second authorization
refresh, but no restricted event text is stored in the bookmark.

Saving a **verse**, unlike an event bookmark, explicitly saves a local text
copy. It cannot be recalled by a later change to the original post's audience.
Saved entries are not account-synced and remain on a shared device after logout.

Open Home, sign in, expand **Feed profile, privacy and account friends**, and
choose a public display name. New accounts receive the name Reader and an
automatic activity audience of **Private**.

## Behavior

- Completion events are emitted only after saving new reading-plan passage
  completions. Undo, cancellations and failed local saves do not publish them.
- Achievement events are emitted only for newly saved, announced milestones.
- Verse sharing logs the actual action: opening a destination, copying a link,
  or handing off to device sharing. It cannot verify delivery on another network.
- **Post to Home Feed** and **Write reflection** on the Daily Verse card open
  the Home composer, with a per-item audience and initial comment setting.
- New Profile posts are saved locally and published through the same activity
  event/publisher while connected and signed in, with explicit audience and
  comment controls. Historical posts are not backfilled. Removing a local
  Profile copy does not delete the shared feed entry.
- **Reflect on this verse** on a shared feed verse creates a linked reflection.
  Its audience cannot be wider than its source. Visibility must pass both the
  reflection and the source's *current* audience checks.
- Public posts are readable without signing in; interacting requires an account.
- Comment insertion, initial posts, and owner comment-setting changes are
  processed by database triggers into the central `feed_events` timeline.
  Comments/toggle events inherit their parent post's current audience; they do
  not have independently broader audiences.
- Disabling comments keeps all existing comments readable through **View
  comments**, but blocks new comments at the database, even from the owner.
- Owners can change an existing item's audience. Comments, likes, timeline
  events and linked reflections obey the new restrictions.
- Like/unlike is idempotent. Activity UUID keys make retrying a publication
  idempotent. Explicit failure cards offer Retry/Dismiss.
- Notifications remain the existing achievement inbox. The event log is an
  extension point, not an implemented email/push delivery service.

## Friends Only

Share your account UUID code directly with a friend who has opened their feed.
They submit it under **Send friend request**. Only the recipient can accept an
incoming request. Accepted relationships work in both directions; either account
can remove one. Pending/declined/cancelled requests never grant access.

Local Discover contacts, church affiliation and QR identities are **not**
verified account friendships. They are not imported and cannot grant feed
access. There is no searchable email directory: only account codes and public
display names are exposed. Email addresses and private profile settings remain
outside public queries.

## Event architecture and extensions

`activity-events.js` loads before the existing reading/share scripts. Producers
call `ActivityEvents.emit(type, content)`; the `bst-activity` handlers on Home
and Profile share `feed-publisher.js` and publish through `feed_publish`.
The RPC derives ownership from `auth.uid()` and rejects stale-account events, uses the
saved automatic audience when none is supplied, validates content through
constraints and inserts atomically with its trigger-generated activity event.
The frontend subscribes to RLS-filtered PostgreSQL changes and refetches the
authorized timeline. It never renders user content as HTML.

To add a future producer, register its type with `ActivityEvents.register`,
add a reviewed entry to `feed_activity_types` through a server migration, and
add a readable label in `feed.js`. Clients cannot modify this registry or write
raw feed rows. Future notification delivery can consume the same event log
with server credentials, applying the same audience authorization checks.

## Refresh, failures and limitations

- The feed uses newest-first server timestamp ordering, sequence tie-breaking
  and keyset pagination. Realtime
  updates refresh the currently loaded range.
- Restricted updates may no longer be delivered to a previous viewer by
  Supabase RLS. Visible pages therefore recheck all loaded items every 10 seconds
  and on return to the tab. Authorization changes apply immediately to *new
  database requests*; previously displayed content may remain until that
  refresh. Previously seen/copied content cannot be recalled.
- Shared feed data is not saved to browser offline caches. Failed refreshes
  clear the displayed timeline rather than keep potentially revoked data.
- Events while signed out, while account setup is incomplete, or from the
  separate KJV reader remain device-local with explicit status. There is no
  automatic historical backfill. The KJV reader's marks/milestones are unchanged.
- Failed publishing retries are in memory and tied to the current account.
  Reload/sign-out clears them; retry before leaving the page. There is no
  persistent offline outbox.
- Feed text is capped at 4,000 characters, verse text at 2,000, names at 80,
  comments at 2,000, and query pages at 20 events / 50 comments.
- Posts are plain text; there are no uploads, editing/deletion, blocking,
  reporting, moderation tools, or delivery notifications yet. Add moderation,
  rate limiting, retention and account-deletion handling before a public launch.
- Display names and achievement/completion text are user-supplied, not verified
  claims or identity badges.

## Validation

Run `npm test` and `npm run check`. The application has no database dependency
in its production package. For disposable SQL verification, install
`@electric-sql/pglite` in a separate temporary tools directory and run:

```powershell
node .\feed-database-check.js 'C:\temporary-tools\node_modules\@electric-sql\pglite\dist\index.js'
```

The validator creates mock Supabase roles/authentication in a **new in-memory
PostgreSQL engine**, executes the schema, and checks actual grants, all three
audiences, request acceptance/removal, comments on/off, owner-only settings,
likes, idempotent publication, events, source restrictions and pagination.
It is not a replacement for hosted Supabase Realtime/integration testing.

Before production, use three real accounts and an anonymous browser:

1. Confirm Public is readable by all, Private only by the owner, and Friends
   Only only by the owner and accepted friends. Repeat direct table queries.
2. Confirm pending requests do not grant access and removal revokes access.
3. Try changing another user's audience/comments and direct table writes;
   all must fail. Try simultaneous disabling and commenting from two clients;
   the database serializes both on the parent row.
4. Leave comments, disable comments, verify old comments still render and new
   comments fail; enable again and verify new comments work.
5. Test a linked reflection and reduce the source audience; it must disappear
   for excluded viewers, including through the shared activity URL.
6. Complete a new passage, earn a milestone, share/post a verse, reflect and
   comment; verify each event appears exactly once per successful event key.
7. Test two browsers, Realtime disconnect/reconnect, reload, sign-out, account
   switching, and privacy changes while another browser has the feed open.
