# SyncDev project context and operations runbook

This file is the canonical handoff for developers and coding agents working in this repository. Read it before changing application behavior, infrastructure, CI/CD, or credentials.

## Security rule

Never commit passwords, access tokens, API secret values, database passwords, `.env` files, CLI authentication files, or copied dashboard credentials. This repository contains the names and locations of required secrets, not their values. Retrieve values from the owning service or Aryan's password manager. If a value is exposed in a terminal transcript, issue, chat, commit, or build log, rotate it immediately.

Only environment variables prefixed with `REACT_APP_` may be exposed to the browser bundle. `SUPABASE_SERVICE_ROLE_KEY` and `CODE_EXECUTION_PROVIDER_TOKEN` must remain server-only.

## Ownership and canonical resources

- Owner/GitHub account: `aryankr1508`
- Repository: `https://github.com/aryankr1508/SyncDev`
- Production branch: `master`
- Production application: `https://syncdev-editor.vercel.app`
- Vercel team/scope: `aryankr2104`
- Vercel organization ID: `team_IK6kA1dRODHNNYq1gX6v1Xtv`
- Vercel project: `syncdev-editor`
- Vercel project ID: `prj_O5Gyne5bXyfHb4nZlxISDLEGyfjf`
- Supabase organization: `Aryan Personal`
- Supabase organization ID: `vjvjlogzmexdaygqopsb`
- Supabase project: `syncdev`
- Supabase project reference: `rprlvvqvssroladvokem`
- Supabase API URL: `https://rprlvvqvssroladvokem.supabase.co`
- Supabase region: Mumbai (`ap-south-1`)

Do not create replacement Vercel or Supabase projects when these resources already exist. Reconnect the local checkout to these exact IDs.

## Product and architecture

SyncDev is a real-time collaborative code editor built with React 17, Create React App, Tailwind CSS, CodeMirror 5, Vercel Functions, Supabase, Express, and Socket.IO.

Production flow:

1. The React client is built into `build/` and served by Vercel.
2. `src/socket.js` chooses `VercelRoomTransport` in production.
3. `src/utils/vercelRoomTransport.js` polls `/api/room-sync`, sends heartbeats, debounces code persistence, and exposes a Socket.IO-like event interface to the UI.
4. `api/room-sync.js` validates requests and persists rooms/presence through `server/supabase-rest.js`.
5. Supabase stores state in `syncdev_rooms` and `syncdev_room_clients`, created by `supabase/schema.sql`.
6. `api/execute.js` is the optional server-side proxy for isolated multi-language execution.

Local development uses the Express/Socket.IO server in `server.js`. Keep this path unless local collaborative development is intentionally redesigned.

Important synchronization timings and limits:

- Client polling interval: 1 second
- Client heartbeat interval: 12 seconds
- Code update debounce: 180 milliseconds
- Presence TTL: 30 seconds
- Room ID: 128 characters maximum
- Username: 32 characters maximum
- Client ID: 100 characters maximum
- Persisted code: 500,000 characters maximum

Empty rooms and stale participants are cleaned automatically. Supabase Row Level Security is enabled and direct `anon`/`authenticated` access is revoked; production access goes through the server-only API function.

## Environment inventory

Current Vercel configuration:

| Variable | Environments | Secret | Purpose |
| --- | --- | --- | --- |
| `REACT_APP_SYNC_TRANSPORT=vercel` | Production, Preview, Development | No | Selects the production polling transport. |
| `REACT_APP_EXECUTION_ENDPOINT=/api/execute` | Production, Preview, Development | No | Selects the execution API. |
| `SUPABASE_URL=https://rprlvvqvssroladvokem.supabase.co` | Production, Preview, Development | No | Server-side Supabase REST base URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Yes | Modern Supabase server secret (`sb_secret_...`); value lives in Vercel and Supabase. |
| `CODE_EXECUTION_PROVIDER_URL` | Not currently configured | Usually no | Optional isolated compiler service endpoint. |
| `CODE_EXECUTION_PROVIDER_TOKEN` | Not currently configured | Yes | Optional compiler service bearer token. |

The modern Supabase server secret is the active production credential. Legacy project API keys are disabled. Never replace the active secret with a browser-safe key, and never add it to a `REACT_APP_` variable.

Remote Python, Java, C/C++, C#, Go, Rust, PHP, Ruby, and Kotlin execution returns a controlled `503` until both execution-provider variables are configured. JavaScript runs locally in a Web Worker; JSON and YAML validation also run in the browser.

For local Socket.IO development, start from `.env.example`. The defaults are:

```dotenv
PORT=5001
REACT_APP_BACKEND_URL=http://localhost:5001
REACT_APP_SYNC_TRANSPORT=socket
CLIENT_URL=http://localhost:3000
```

## New-laptop bootstrap

Use Node.js 20 to match GitHub Actions.

```bash
git clone https://github.com/aryankr1508/SyncDev.git
cd SyncDev
npm ci
npm run verify
```

Local application development needs no cloud secrets:

```bash
cp .env.example .env
npm run dev
```

This starts the client at `http://localhost:3000` and Socket.IO server at `http://localhost:5001`.

Reconnect Vercel CLI when infrastructure access is needed:

```bash
npx vercel login
npx vercel link --scope aryankr2104 --project syncdev-editor
npx vercel whoami
```

The resulting `.vercel/` directory is local and ignored. Do not commit it. Use `npx vercel env ls --scope aryankr2104` to confirm variable names. Avoid pulling production secrets into a repository file unless required for a specific local function test; delete any temporary secret file immediately afterward.

Reconnect Supabase CLI when database work is needed:

```bash
npx supabase login
npx supabase link --project-ref rprlvvqvssroladvokem
```

The resulting `supabase/.temp/` directory is local and ignored. The database password, if requested by the CLI, must come from Aryan's password manager or be reset through the Supabase dashboard. Do not guess, reuse, or commit it.

Authenticate GitHub tooling when publishing:

```bash
gh auth login -h github.com
gh auth status
```

Prefer a GitHub token or SSH key managed by the OS credential store. Do not embed a token in the remote URL.

## Secret recovery and rotation

Required private access should be recorded in Aryan's password manager with these labels:

- `SyncDev / GitHub aryankr1508`
- `SyncDev / Vercel aryankr2104`
- `SyncDev / Supabase rprlvvqvssroladvokem`
- `SyncDev / Supabase database password`
- `SyncDev / execution provider` if remote execution is enabled later

If `SUPABASE_SERVICE_ROLE_KEY` must be rotated:

1. Create a replacement server secret in the existing Supabase project.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production and Preview.
3. trigger a production deployment.
4. Verify the health endpoint and two-client collaboration.
5. Revoke the previous secret only after the new deployment passes.

Never paste credential values into this document.

## Deployment and CI/CD

- Vercel watches `master` and deploys it to production automatically.
- Pull-request branches receive preview deployments.
- `vercel.json` uses the Create React App preset, runs `npm run verify`, publishes `build/`, and rewrites SPA routes to `index.html`.
- GitHub Actions runs on pushes and pull requests targeting `master` with Node.js 20 and `npm ci`.
- A deployment must not be considered complete until GitHub CI, the Vercel check, the production alias, and the health endpoint all pass.

Normal validation:

```bash
npm run verify
curl -fsS 'https://syncdev-editor.vercel.app/api/room-sync?health=1'
```

Expected health response:

```json
{"status":"ok","transport":"vercel-supabase"}
```

For collaboration changes, also test two independent clients joining the same room, presence updates, code propagation, direct room URL loading, and cleanup after leaving.

## API contracts

`GET /api/room-sync?health=1` checks configuration without exposing credentials.

`GET /api/room-sync?roomId=<room>` returns current room state.

`POST /api/room-sync` accepts JSON actions:

- `join`: `roomId`, `clientId`, `username`
- `heartbeat`: `roomId`, `clientId`, `username`
- `code`: `roomId`, `clientId`, `code`, `revision`
- `leave`: `roomId`, `clientId`

`POST /api/execute` accepts a provider-neutral execution request with `language`, `source`, `stdin`, `timeout`, and optional `runtime`. It must never execute untrusted code directly inside the application function; use an isolated external compiler provider.

## Change-safety rules

- Preserve unrelated local or untracked files. In particular, `deep-research-report.md` may exist locally and is not part of application changes unless explicitly requested.
- Never use `git add -A` when unrelated work is present; stage explicit paths.
- Use an `agent/<description>` branch, run `npm run verify`, push, and open a draft pull request.
- Do not remove Express, Socket.IO, Tailwind, PostCSS, or Autoprefixer as “unused”; they are used by local development or the build configuration even if a basic dependency scanner reports false positives.
- Do not weaken Supabase RLS or expose the server secret to the client.
- Do not rewrite Git history or rotate/delete infrastructure without explicit authorization and an exact resource-ID check.
- Keep the production URL and project IDs in this document updated whenever infrastructure changes.

## Current known caveats

- Remote multi-language execution is intentionally unavailable until an isolated provider is selected and configured.
- Function and database regions should be kept geographically close when the hosting plan permits it; re-check latency before changing regions.
- React Router emits version-7 future-flag warnings during tests. They are warnings, not test failures, and should be handled as a deliberate router upgrade rather than suppressed blindly.
