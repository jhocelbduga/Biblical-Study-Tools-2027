# Supabase account setup

The account page supports registration, email confirmation, email/password login,
password recovery, persistent browser sessions, and sign-out on the current device.
It does not synchronize the existing device-local profile, friends, or reading data.
Newsletter subscriptions continue to use the separate Mailchimp integration.

## Configure Supabase

1. Create a Supabase project at https://supabase.com/dashboard.
2. Enable the Email authentication provider. Keep email confirmation enabled.
3. Set the minimum password length to 12 or greater in authentication settings.
4. Configure production SMTP for confirmation and recovery emails. Supabase's
   default email service is restricted and is not suitable for general public signup.
5. Set the authentication Site URL to
   `https://biblical-study-tools-2027.onrender.com`.
6. Add the exact redirect URL
   `https://biblical-study-tools-2027.onrender.com/account.html` to the allowed
   redirect URLs. For local testing, also add
   `http://localhost:3000/account.html` (adjust the port if needed).
7. Set these environment variables in Render:
   - `SUPABASE_URL`: the HTTPS project origin from the Supabase dashboard.
   - `SUPABASE_PUBLISHABLE_KEY`: the public key beginning with `sb_publishable_`.
8. Restart/redeploy the Render service.

Never use a secret key or service-role key. The server rejects non-publishable keys.
The public configuration endpoint returns only the project URL and publishable key.
Do not place environment files in the app directory: this server serves static files.

## Google and Facebook sign-in

Social sign-in buttons use Supabase OAuth with PKCE. They do not automatically
subscribe users to the newsletter. After sign-in, the account page offers an
optional link to the newsletter form; only its explicit submission enrolls the
address in the Mailchimp confirmation flow.

1. In Google Cloud, create an OAuth client for a web application. Configure its
   consent screen and the authorized redirect URI shown by Supabase for the
   Google provider (your Supabase auth callback, not the app account page).
2. Enable Google in Supabase Authentication providers and enter the Google
   client ID and secret there. Google login supports Google accounts, including
   Gmail; the app does not request access to Gmail messages.
3. Create a Meta/Facebook developer app and configure Facebook Login. Set the
   valid OAuth redirect URI to the callback shown by Supabase. Enable Facebook
   in Supabase and enter the provider app ID and secret there.
4. Follow each provider's current production consent, app-domain, privacy-policy,
   review, and publishing requirements. Development/test mode may restrict who
   can sign in. Facebook may not provide an email for every account; users can
   enter their newsletter email manually.
5. Keep `account.html` allowed as an application redirect as described above,
   including exact localhost URLs used for development.
6. Keep provider secrets only in the provider/Supabase dashboard. Never add
   Google or Facebook secrets to client scripts or the public config endpoint.
7. Test each provider with a permitted test account: redirect, callback, declined
   access, session reload, sign-out, and optional newsletter submission. Confirm
   no Mailchimp request is made merely by signing in.

OAuth buttons require provider configuration in addition to the Supabase project.
Disabled/unconfigured providers return explicit errors. Existing email/password
sign-in remains available.

## Running locally

Set the two variables in your process environment and run `npm start`. Open
`http://localhost:3000/account.html`. The account page requires the Node server;
file URLs and GitHub Pages do not provide the configuration endpoint and will
display an explicit unavailable state.

The browser loads the pinned Supabase JavaScript SDK from jsDelivr. Authentication
requests go directly to Supabase. No passwords are stored by the app server.
PKCE confirmation/recovery flows must be opened in the browser that initiated
the request, where the verifier is stored. For a different device, request a new
reset from that device. Account operations require internet access.

## Verify before enabling public signup

- With configuration absent, the page must disable account forms and show the
  configuration warning, never claim a successful login.
- Register a test address, confirm using its email in the same browser, and sign in.
- Verify incorrect-password errors, password mismatch, and policy enforcement.
- Request a reset, follow its email link, and set a new password.
- Reload while signed in, then sign out and verify the session is removed.
- Verify local reading progress and friends are unchanged after signing out.
- Test expired links and mail delivery failures with your Supabase configuration.

Any future user-data tables need explicit authorization and row-level security
policies before using the public key. This integration does not create tables or
change authorization of existing data.

For the shared community directory and membership tables, follow the separate
[community setup guide](./COMMUNITY-SETUP.md) after completing account setup.
