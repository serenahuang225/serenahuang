# Through the Glass — Serena Huang

A responsive Next.js / React / TypeScript portfolio, with a real-time Three.js glass sculpture and a pearl → mauve → plum descent.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` creates the production build; `npm start` serves it. `npm run typecheck` checks TypeScript.

## Content

Edit `src/content/serena.ts`:

- `projects` contains the three resume-based project summaries, metrics, technologies, and destination links.
- `SERENA_AXIOMS` and `quotes` contain Serena's supplied reflections (minor spelling corrections only).
- `photos` includes the 30 supplied photographs, with optimized WebP copies. Add photos under `public/photos/` and entries with `src`, descriptive `alt`, `caption`, and optional `location`. The photo section is a responsive gallery with a keyboard-accessible lightbox.
- `listening` includes the three supplied MP3s, played through the on-page audio controls. Add `title`, `artist`, `href`, and optional `artwork` to populate the listening room. This is a curated list, not a fake live Spotify integration.

The abstract project visuals are editorial artwork, not product screenshots. Photography and music placeholders are clearly labeled. No invented essays, photos, or listening activity. The resume itself is not copied to the public directory; its phone number is not published.

## Interaction and accessibility

- Native scrolling drives a rounded 3D cube's rotation and lens-like enlargement in the opening sequence.
- Anchored navigation reaches each section directly; the active section is reflected in the navigation.
- Project filters and native dialogs provide detail views with Escape dismissal and focus restoration.
- The writing section uses native disclosure controls for all four axioms.
- OS reduced-motion preferences are respected, with an additional persistent-on-screen motion control.
- Devices without WebGL use a CSS glass sculpture. The lens remains available as navigation throughout the page; its fixed render surface moves using transforms to avoid resize stutter.
- The site has a single continuous home page; each section has a quiet reflection, with a manually browsable thought card at the end.

## Checks

```sh
npm run build
npm run typecheck
npx playwright test
```

Playwright uses the app on port 3000, starting it if necessary. Run `npx playwright install chromium` if no browser is installed.

## Next content pass

Add personal photographs, project screenshots, longer writing, and a first music selection. Deployment is not configured; this source can be deployed to any host that supports Next.js.

## Adding photographs and music

There is no admin/upload screen yet. You can send photographs and song or playlist links in the Codex conversation and have them added for you.

For manual edits, the full project path is `/Users/huangrh/workspace/serena/webapps/best-portfolio`:

1. Put photographs in `public/photos/`. Add one entry to `photos` in `src/content/serena.ts` for each photo, with `src: "/photos/your-file.jpg"`, descriptive `alt`, and `caption`.
2. Add song title, artist, and Spotify/Apple Music/Bandcamp destination URL to `listening` in that same file. Optional cover artwork can live in `public/music/` and be referenced as `artwork: "/music/cover.jpg"`.
3. You do not need to upload audio files. Visitors follow the music links to listen.
4. Restart the production preview after `npm run build`, or use `npm run dev` while editing.

The silver lens stays on screen and opens a section index. Its focus ring rotates with page depth; the entrance zoom is reduced when motion is disabled. The silver cursor is limited to fine mouse pointers and automatically yields to native cursors for forms, dialogs, touch, and reduced motion.
