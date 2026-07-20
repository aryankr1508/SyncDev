# Code Sync

A real-time collaborative code editor built with React, Tailwind CSS, CodeMirror, and provider-aware room synchronization for Vercel, Netlify, and local Socket.IO development.

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

The `syncdev-editor` Netlify site is connected to the `master` branch of `aryankr1508/SyncDev`. Every push runs the test suite and production build through `npm run verify`; Netlify publishes `build/` only when both succeed. Pull requests run the same validation in GitHub Actions.

Client-side routes are rewritten to `index.html` through `netlify.toml`, so shared editor-room URLs can be opened directly.

Production rooms use the bundled `room-sync` Netlify Function and strongly consistent Netlify Blobs storage. Presence is maintained with lightweight heartbeats, code changes are debounced before persistence, stale participants are removed automatically, and empty-room code is deleted. This path is selected through `REACT_APP_SYNC_TRANSPORT=netlify` in `netlify.toml`, so no separate backend account is required for the Netlify deployment.

Local development and conventional Node deployments continue using the Socket.IO server. A future dedicated socket host can override the production fallback by setting `REACT_APP_BACKEND_URL` to its public HTTPS URL and removing the Netlify transport override.

### Vercel migration

The Vercel deployment uses the functions in `api/` and the Supabase schema in `supabase/schema.sql`. Netlify remains supported during migration so production can be verified before DNS is moved.

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Import `aryankr1508/SyncDev` into Vercel with the Create React App preset.
3. Add these variables to Production, Preview, and Development environments in Vercel:
   - `REACT_APP_SYNC_TRANSPORT=vercel`
   - `REACT_APP_EXECUTION_ENDPOINT=/api/execute`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix it with `REACT_APP_`)
   - `CODE_EXECUTION_PROVIDER_URL` and `CODE_EXECUTION_PROVIDER_TOKEN` when remote language execution is enabled
4. Deploy and verify `/api/room-sync?health=1`, direct room URLs, two-browser collaboration, and remote execution before moving the domain.

Vercel uses `npm run verify` as the deployment gate and publishes `build/`. The SPA rewrite in `vercel.json` keeps shared editor-room URLs working when opened directly. Pushes to the configured production branch deploy automatically through Vercel's Git integration.

## Commands

- `npm run dev` — run the client and server with live reload
- `npm run build` — create an optimized frontend build
- `npm test -- --watchAll=false` — run the test suite once
- `npm run verify` — run the CI test and production-build gate
- `npm run server:dev` — run only the socket server with nodemon
- `npm run start:front` — run only the React development server

The Node server health check is available at `/health`. The Netlify production sync health check is available at `/.netlify/functions/room-sync?health=1`.
