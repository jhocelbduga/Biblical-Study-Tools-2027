# Shared community setup

Communities require the Node/Render site, configured Supabase authentication, and
the database schema below. They are not simulated with localStorage.

1. Complete [ACCOUNT-SETUP.md](./ACCOUNT-SETUP.md), including confirmed accounts
   and production email delivery.
2. In that project's Supabase SQL Editor, run [communities.sql](./communities.sql)
   once as the database administrator. It creates new tables and functions in a
   transaction. It is not a repeatable migration: if these tables already exist,
   inspect the existing schema before applying changes.
3. Ensure the public schema is exposed by the Supabase Data API and refresh its
   schema cache if the new RPC functions are not visible.
4. Restart the configured Node service and open Discover.

## Behavior and access controls

- Anyone may browse public names, descriptions, cities, owner IDs, member counts,
  and computed distances. Individual member identities are not listed.
- Confirmed, signed-in accounts may create and join communities.
- Creation atomically adds the owner as the first member.
- There is no per-account creation cap or application rate limiter. Establish
  moderation, abuse controls, and operational monitoring before public launch.
- Membership is unique per account/community; repeated joins are idempotent.
- Members may leave; owners must remain members.
- Raw table access is revoked from anonymous and authenticated API roles. Row
  level security is enabled. Narrow security-definer RPCs with fixed search paths
  authorize mutations using `auth.uid()`, not client-supplied account IDs.
- Search uses literal substring matching, a maximum of 50 results, and distance
  filtering within 1-100 km using great-circle distance.
- Nearby search only includes communities with meeting coordinates. These must
  be a safe public venue, not a private residence. Search coordinates are passed
  to Supabase, not persisted by the application as user profile data; service
  providers may retain request logs under their own policies.
- Created community details are public and shared across accounts. Local friends
  and reading records remain separate and device-local.

There is no community chat, invite-only membership, owner transfer, editing,
deletion UI, abuse reporting, or moderation dashboard in this release. The site
owner must manage removals through the database administration tools. Do not
enable broad public creation without a moderation process. Location selection
uses the current device location only, so create at the public meeting venue or
omit coordinates and provide a city for directory search.

## Verification before launch

Use two confirmed test accounts and an anonymous browser:

1. Missing server config must disable search/create and show an unavailable error.
2. Missing tables/functions must show a database setup error, not fake results.
3. Anonymous users can search but cannot create, join, leave, or read raw tables.
4. Account A creates a community and automatically becomes its first member.
5. Account B joins twice: member count increases only once. My joined communities
   includes it. Leaving removes only B's membership.
6. A cannot leave its own community. Test the RPC directly as well as the UI.
7. Sign out and ensure membership controls become disabled.
8. Test denied location permission, communities without coordinates, and radius
   boundaries with known locations. Check zero results and query filtering.
9. Fail a mutation/network request: it must show an error, not claim success.
10. Reload in another browser signed into the same account and verify membership
    persists through Supabase.

Local mocked tests do not validate database execution or row-level authorization.
Run this checklist against your project before claiming production readiness.
