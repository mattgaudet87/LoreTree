# LoreTree

Personal photo memory app. Reads Matt's Apple Photos library, adds AI descriptions and tags, and lets him explore through a swipe feed, Lore (a drill-down Map and a lifetime Timeline, with search), and Reminisce (AI asks him questions about his photos, not built yet).

## Working with Matt
- Matt is not a developer. Explain everything in plain language. He pastes commands exactly as written.
- After completing each task, tell Matt clearly: what you did, what you created or changed, and what the next step is.
- If a decision needs his input, give two options with your recommendation. Never ask open-ended technical questions.
- Build only the current phase. Never start the next phase unless asked.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- SQLite via better-sqlite3. Database file: data/loretree.db
- sharp (image resizing), framer-motion (network and timeline animation), zod (validating AI JSON)
- @anthropic-ai/sdk. Model names live ONLY in lib/ai.ts
- osxphotos (Python command line tool, installed with pipx) reads Apple Photos

## Running the app (pm2 only, never npm run dev)
- Port 3013. pm2 name: loretree. Config: ecosystem.config.js (runs next dev -p 3013)
- The dev server is open to the local network on purpose (phone testing). There is no login, so use trusted Wi-Fi only.
- Start: pm2 start ecosystem.config.js && pm2 save
- Restart after config or dependency changes: pm2 restart loretree
- Logs: pm2 logs loretree --lines 50
- Stop: pm2 stop loretree
- If port 3013 is busy, run Matt's Wolf Port Guardian script before starting.

## Folder map
- app/ pages and app/api/ routes. Tabs: feed, lore (Map + Timeline + search), add-lore/*, search (redirects to lore?search=1; the search box state and query live in the URL as search=1 and q=), profile and reminisce (placeholders), settings (Analyze)
- lib/db.ts connection and schema. lib/ai.ts every Claude call. lib/categories.ts fixed category list
- lib/queries/ read helpers (feed, network, timeline, search, photo tags, filters). findOrCreateTag in photo.ts is shared with the scripts
- lib/caption.ts feed and detail captions. lib/import-settings.ts which album or library to import
- components/ shared UI (TabBar, PhotoCard, DetailPanel, MicButton, NodeGraph)
- scripts/import-photos.ts Apple Photos importer (npm run import). scripts/seed-sample.ts sample data
- data/ database and images. NEVER commit. Must stay in .gitignore.

## Data rules
- Every table has user_id TEXT NOT NULL DEFAULT 'matt'. Always filter by it (future multi-user app).
- Photo id = Apple Photos uuid. Imports are safe to re-run: upsert, never duplicate.
- Tag types: person, category, place, event, keyword. Year is computed from taken_at, never stored as a tag.
- Tag source: apple, ai, or user. AI never removes or overwrites a user tag. Renaming a tag makes it a user tag.
- Ignore unnamed Apple faces (_UNKNOWN_ or empty names).
- Categories come only from the fixed list in lib/categories.ts (the API rejects anything else).
- Path filters (path=person:Name,place:Name) percent-encode each value; use valueSegment() in lib/queries/filters.ts. Names contain commas.
- AI event names are per photo (swapped in for Apple's shared "Place, Date" event, never renaming it). Tags no photo uses are deleted.
- Captions read place from the Place tag, not photos.place_name. Analysis is given context notes.
- Apple's own caption is kept in photos.apple_caption; analysis replaces description but is given the caption.
- Highlight score = favorite x3 + apple_score + people count x0.5 + (has context note) x2. Defined in lib/queries/photo.ts, unused until Reminisce.

## AI rules
- Never call the Claude API automatically. Only when Matt presses a button (Analyze, Add context, Reminisce).
- Default batch: 20 photos. "Analyze all" in Settings loops batches after a cost confirm. One batch at a time (server lock). Resize to 1024px long edge before sending. Never send originals.
- Always request JSON, validate with zod before saving. Bad JSON: set ai_status = 'error', continue.
- API key is ANTHROPIC_API_KEY in .env.local. Never log or print it. Owner name for "you" wording: LORETREE_OWNER_NAME (optional).
- Descriptions: warm, specific, 2 to 3 sentences, use people's names, never invent facts.

## Importing photos
- Imports the album set on the Add Photos page (default "LoreTree Beta"), or the whole library if chosen there.
- The importer runs in Terminal (npm run import), not from the web app. macOS only lets Terminal read Photos.
- Saves data/images/display/{uuid}.jpg (1600px) and data/images/thumb/{uuid}.jpg (400px).

## Design: LoreTree has its own look (not Wolf Creative)
- Dark and photo-first. Tokens are CSS variables in app/globals.css. Use them, never raw hex in components.
- bg #111013, surface #1B1A1E, surface-2 #25232A, border #34313A
- text #F4F1EC, text-muted #9A958F, accent #8B7CFF
- Node colors: people #8B7CFF, categories #3CCB9A, places #FF8A5B, events #F5B942, years #9A958F
- View photos banner: gradient #6D5DFC to #FF6FA3
- Fonts: Inter for UI. Fraunces (serif) for photo descriptions and Reminisce questions.
- Must work at phone width (390px), with a Mac trackpad, and with arrow keys.

## Git
- Commit at the end of every phase. Give Matt the exact command: git add . && git commit -m "Phase N: description"
