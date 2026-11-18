# Through the Glass — Serena Huang

A personal site built with Next.js, React and TypeScript. The home page is one
long scroll: you scroll *into* a 3D camera lens, then through work, values,
photos, music and an about section. At the very bottom, a little glowing hole
drops you into **the Underground**, a small 3D game.

## Run it

```sh
npm install
npm run dev        # http://127.0.0.1:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # TypeScript only
npx playwright test  # browser tests for the home page (starts the dev server if needed)
```

Run `npx playwright install chromium` once if Playwright has no browser.

## Editing the home page

Almost all the words live in **`src/content/serena.ts`**:

- `projects`: the three project cards and their pop-up detail. `slug` picks the
  cover art (drawn in CSS in `page.tsx`), `kind` is what the Research / Product
  filters match.
- `SERENA_AXIOMS`: the four "values to live by" flip cards (front prompt, back
  reflection, and which icon).
- `quotes`: the rotating thought at the bottom.
- `photos`: the photo ribbons. Put a WebP (about 1600 px wide) in
  `public/photos/optimized/` and add `src`, `alt` and `caption`.
- `listening`: the record collection. Put the MP3 in `public/music/` and point
  `audio` at it.

The experience "book" lives in `src/components/experience.tsx`.

### Where things are

| File | What it is |
| --- | --- |
| `src/app/page.tsx` | The home page: header, the scroll-driven lens (`placeLens`), every section, dialogs |
| `src/app/globals.css` | All home-page styles, in labelled sections (search for `====`) |
| `src/components/glass-scene.tsx` | The 3D lens and camera body (react-three-fiber) |
| `src/components/values.tsx`, `experience.tsx`, `photo-gallery.tsx`, `music-player.tsx` | One section each |
| `src/components/silver-cursor.tsx` | The custom mouse cursor |
| `src/components/fall-hole.tsx` | The hole in the footer that leads to the Underground |
| `src/lib/format.ts` | Tiny shared helpers (`pad2`, `clamp`) |
| `tests/portfolio.spec.ts` | Playwright tests |

Motion: the site follows the system's reduced-motion setting, and the
"Motion on / off" button sets `html[data-motion="still"]`, which turns off
animations and the scroll-in effect.

## The Underground (`/underground`)

Bob, a fluffy red ball, has fallen into a glowing cave. Find the seven rocket
parts, gather ten energy orbs and fly home. Everything is in
`src/components/underground/`:

**The world (3D, react-three-fiber + Rapier physics)**

| File | What it is |
| --- | --- |
| `world-data.ts` | The layout: terrain, lakes, tunnel, every mushroom, orb and potion. All randomness is seeded, so the world is the same for everyone |
| `shared.ts` | Uniforms shared by every shader (time, Bob's trail, lights), live player state, GLSL snippets |
| `scene.tsx` | The `<Canvas>`: puts everything together, post-processing, and the frame pacer |
| `ball.tsx` | Bob: input, physics (roll, jump, duck, swim, fly, bounce), fur, and the camera |
| `terrain.tsx` | Ground, walls, water surfaces, lights, glowworms, spores |
| `foliage.tsx` | Grass and leaves (a field of instances that wraps around Bob) |
| `mushrooms.tsx` | Big bouncy mushrooms, puffball launch pads, small mushrooms, hollow logs, crystals |
| `extras.tsx` | Glow flowers, hanging threads, fireflies, energy orbs |
| `landmarks.tsx` | Crystal tunnel (and its gates), cave, waterfall, rope bridge, fog |
| `creatures.tsx` | Puffkins, fish, snails |
| `potions.tsx` | The potion bottles |
| `story-world.tsx` | The story in 3D: Sky Eye, rocket, parts, friends, photos, and the director |
| `audio.ts` | Every sound, synthesised with the Web Audio API (no audio files) |

**The story and the screen (no three.js, so they load fast)**

| File | What it is |
| --- | --- |
| `story-data.ts` | Parts, friends and everything they say; colour potions; the field-guide map |
| `quest.ts` | The quest as steps (for the objectives, compass and friends' hints) |
| `story-store.ts`, `orb-store.ts`, `look-store.ts`, `guide-store.ts` | Game state, each saved in the browser's localStorage |
| `store-utils.ts` | What the stores share (listeners, saving) |
| `story-hud.tsx` | Conversations, the crystal-song puzzle, objectives, compass, cards |
| `field-guide.tsx` | The field guide book (I) |
| `touch.ts`, `touch-controls.tsx` | On-screen controls for phones and tablets |
| `underground-client.tsx` | The page: loader, orb counter, potion chips, sound button |

Moving a landmark? It's placed in `world-data.ts`, and the field-guide map in
`story-data.ts` (`MAP`) has a copy of its position, so update both.

Saved progress (per browser) uses these localStorage keys:
`underground-story-v1`, `-orbs-v1`, `-look-v1`, `-guide-v1`, `-tips-v1`,
`-best-v1`, `-looked-v1`, `-muted-v1`, `-objectives-open`. Clearing them starts
the game fresh.

## Deploying

`vercel.json` builds it on Vercel with `npm run build`; any host that runs
Next.js works too.
