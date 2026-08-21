// Minimal static file server for Hostinger's Node.js App hosting.
// admin-portal is a Vite SPA — `npm run build` produces static files in
// dist/, but Hostinger's Node.js App feature expects something to run as
// a process, not a plain static host. This just serves that dist/ folder,
// falling back to index.html for any unmatched route so React Router's
// client-side routes (e.g. /cashbook, /inventory) work on a hard refresh
// instead of 404ing.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");

const app = express();
app.use(express.static(DIST_DIR));
app.get("*", (req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Admin portal static server listening on :${port}`));
