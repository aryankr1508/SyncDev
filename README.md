# Code Sync

A real-time collaborative code editor built with React, Tailwind CSS, CodeMirror, Vercel Functions, Supabase, and Socket.IO for local development.

## Editor features

- Automatic code-language detection with a manual language selector
- Syntax highlighting for JavaScript, TypeScript, JSX/TSX, HTML, CSS, SCSS, JSON, Python, Java, C/C++, C#, Kotlin, Go, Rust, PHP, Ruby, Swift, SQL, shell, Markdown, YAML, and XML
- Automatic brackets, quotes, and HTML tag completion
- Suggestions, bracket/tag matching, code folding, active-line highlighting, search, and comment shortcuts
- Independent persisted light/dark application theme
- Dracula, Material Dark, Monokai, and GitHub Light compiler syntax themes
- Adjustable editor font size, word wrapping, cursor position, and selection status
- Real-time room synchronization with automatic reconnects

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev
```

This starts the React app at `http://localhost:3000` and the Socket.IO server at `http://localhost:5001`. The defaults work without an environment file. Copy `.env.example` to `.env` only when you need to override ports or origins.

## Production

```bash
npm start
```

The production command builds the React app and serves the UI and Socket.IO connection from the same Node server at `http://localhost:5001` (or the `PORT` environment variable).

## Continuous deployment

The production app is deployed at [syncdev-editor.vercel.app](https://syncdev-editor.vercel.app). Vercel watches the `master` branch of `aryankr1508/SyncDev`; each push runs `npm run verify` before publishing `build/`. Pull requests run the same validation in GitHub Actions and receive Vercel preview deployments.

Production rooms use the `api/room-sync.js` Vercel Function and the tables defined in `supabase/schema.sql`. Presence is maintained with lightweight heartbeats, code changes are debounced before persistence, stale participants are removed automatically, and empty-room data is deleted. The SPA rewrite in `vercel.json` keeps shared room URLs working when opened directly.

Local development and conventional Node deployments use the Socket.IO server. A dedicated socket host can be selected with `REACT_APP_BACKEND_URL`; Vercel production uses `REACT_APP_SYNC_TRANSPORT=vercel`.

### Vercel setup

The deployed project is already configured. To reproduce the infrastructure in another account:

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Import `aryankr1508/SyncDev` into Vercel with the Create React App preset.
3. Add these variables to Production, Preview, and Development environments in Vercel:
   - `REACT_APP_SYNC_TRANSPORT=vercel`
   - `REACT_APP_EXECUTION_ENDPOINT=/api/execute`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix it with `REACT_APP_`)
   - `CODE_EXECUTION_PROVIDER_URL` and `CODE_EXECUTION_PROVIDER_TOKEN` when remote language execution is enabled
4. Deploy and verify `/api/room-sync?health=1`, direct room URLs, two-browser collaboration, and remote execution.

Vercel uses `npm run verify` as the deployment gate and publishes `build/`. The SPA rewrite in `vercel.json` keeps shared editor-room URLs working when opened directly. Pushes to the configured production branch deploy automatically through Vercel's Git integration.

## Commands

- `npm run dev` — run the client and server with live reload
- `npm run build` — create an optimized frontend build
- `npm test -- --watchAll=false` — run the test suite once
- `npm run verify` — run the CI test and production-build gate
- `npm run server:dev` — run only the socket server with nodemon
- `npm run start:front` — run only the React development server

The local Node server health check is available at `/health`. The production synchronization health check is available at `/api/room-sync?health=1`.
