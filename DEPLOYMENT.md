# Admin Portal Deployment — Hostinger

Live at `admin.trpbismipaniyan.com`. Deployed via Hostinger's Web Apps (Node.js hosting) with Git auto-deploy — push to `main`, Hostinger pulls, installs, builds, and redeploys. No staging/UAT tier for this project.

## One-time setup (already done — reference for a new client)

hPanel → **Web Apps → Create**:
- **Repository**: `https://github.com/Sherifneo/admin.bismipaniyan.git`
- **Framework preset**: Express (auto-detected correctly — `server.js` is a small Express static-file server, see `CLAUDE.md`)
- **Branch**: `main`
- **Node version**: latest available (22.x used here)
- **Application URL**: `admin.trpbismipaniyan.com`
- **Root directory**: `./`
- **Entry file**: `server.js` (at the repo root — **not** `src/server.js`, that path is the backend repo's, don't confuse the two when copy-pasting settings between the two apps)
- **Environment variables**: `VITE_API_BASE` = `https://api.trpbismipaniyan.com` (optional — the code falls back to hostname-based detection if unset)

That's it — no database, no other env vars needed. This app has zero database code; every data operation goes through the backend API over HTTP.

## Why a Node.js App and not static hosting

Hostinger's plain static-site Git-deploy (used for the `Bismipaniyan` website repo) just syncs files as-is — it doesn't run a build step. This repo is React/Vite source, not pre-built HTML, so it needs `npm install && npm run build` to run before anything is servable. Hostinger's Node.js App hosting runs `npm install` (which triggers this repo's `postinstall` → `vite build` automatically) then starts the app via the entry file.

## Redeploying after a code change

Just `git push origin main`. No manual build/upload step, no SSH needed (unlike the backend, this app has no database migrations to run manually).

If the app seems to hang or serve stale content after a deploy, use the **Redeploy** button in hPanel's Deployments tab — this rebuilds and relaunches the process from scratch.
