<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Study Shelf

Study Log (Assignment 3) grown into a full-stack app for MPCS 51238 Assignment 4. A university student searches for the books they're studying, keeps them on a shelf, and logs study sessions against them toward a weekly goal (10 hours). Each person signs in and sees only their own shelf and sessions, on any device.

Main task: "I find my textbook → put it on my shelf → log 45 minutes of reading it → sign in on my laptop later, and the book and my week are still there."

## Stack
- Next.js 16 (App Router) + Tailwind 4. In Next 16 the request guard file is `src/proxy.ts`, not `middleware.ts`. Read `node_modules/next/dist/docs/` before using a Next API.
- Clerk for sign-in (development keys only).
- Supabase Postgres, connected to Clerk through Supabase third-party auth. Supabase reads the Clerk session token; `auth.jwt()->>'sub'` is the Clerk user id.
- External API: Open Library (no key). Search: `https://openlibrary.org/search.json?q=…&fields=key,title,author_name,first_publish_year,cover_i&limit=12`. Covers: `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`.
- Playwright for the end-to-end test.

## Data model
Two tables, both in `public`. Every row belongs to one person through `user_id`, which is the Clerk user id (text, like `user_2ab…`). The database fills it in from the token, so the browser never sends it.

**books**: books on someone's shelf (a saved Open Library result).
| column | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| user_id | text not null | default `auth.jwt()->>'sub'` |
| ol_key | text not null | Open Library work key, like `/works/OL4781294W` |
| title | text not null | |
| authors | text | first authors, joined with ", " |
| cover_id | integer | Open Library `cover_i`, null when there's no cover |
| first_year | integer | `first_publish_year` |
| created_at | timestamptz | default `now()` |
Unique `(user_id, ol_key)`: the same book can't be on one shelf twice. Unique `(id, user_id)` so sessions can point at it safely.

**sessions**: one study session.
| column | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| user_id | text not null | default `auth.jwt()->>'sub'` |
| course | text not null | what was studied, 1–60 characters |
| minutes | integer not null | 5–600 |
| place | text not null | default `''` |
| day | date not null | the day studied |
| book_id | uuid | optional; `(book_id, user_id)` references `books(id, user_id)`, `on delete set null (book_id)`, so a session can only point at the same person's book |
| created_at | timestamptz | default `now()` |

Kept in the browser only, per signed-in user, not in the database: the form draft and the last-visit day for "Welcome back". These are about this device, not the person's data.

## Access rules
- Row-level security is on for every table. Policies use `(select auth.jwt()->>'sub') = user_id`, granted to `authenticated` only. `anon` gets nothing.
- books: select, insert, delete. sessions: select, insert, delete (Undo). No update policies until a feature needs one.
- Schema changes are SQL migrations in `supabase/migrations/`, applied through the Supabase MCP server.
- The browser talks to Supabase with the publishable key plus the Clerk token. Never use the Supabase secret key in this app.
- `src/proxy.ts` stays a bare `clerkMiddleware()` (Clerk 7 deprecates `createRouteMatcher`). Each private page calls `await auth.protect()` (signed out → sign-in), each Route Handler checks `auth()` and returns 401. Signed-out `/` is a landing page that shows no data.
- With `cacheComponents`, anything that reads auth or the URL (`auth()`, server `<Show>`, `usePathname()`, `<SignIn />`) renders inside `<Suspense>`, or next to a `loading.tsx` for pages that call `auth.protect()`.

## Where the API is called
On our server, in `src/app/api/books/route.ts`, for signed-in users only. It sets a 6-second timeout, caches results for a day, sends a User-Agent, and returns only the fields above. The browser never calls Open Library directly (covers are plain `<img>` tags). Every search shows a designed state: loading, results, nothing found, and "Open Library isn't answering".

## Keys
- Keys live in `.env.local` (and in Vercel's environment variables), never in code or commits. The agent can't read `.env*` files (deny rule in `.claude/settings.json`); the person creates `.env.local` themselves.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only `NEXT_PUBLIC_*` values may reach the browser.

## Rules
- Use the shared components in `src/components/` everywhere (Button, Field, Chip, Toast, Progress, WeekStrip, Nav, EmptyState).
- Style: the Calm design system from Assignment 2 (oat paper, Fraunces + DM Sans, 1px lines, no shadows). The clay accent is reserved for the primary action on each page.
- Form errors sit next to the field and say what to do next ("Enter how many minutes you studied."). Never clear what the person typed.
- Every control works by keyboard, every field has a real `<label>`, text contrast ≥ 4.5:1.
- Work on a branch; run `/security-review` before merging to `main`.

## Pages
- `/` signed out: landing + Sign in / Sign up. Signed in: Today (first visit starters, or Welcome back with progress).
- `/shelf` search Open Library, add books, see your shelf.
- `/log` log a session, optionally for a book on your shelf.
- `/week` this week (and last week), sessions by day, Undo.

## Commands
- `npm run dev`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npx playwright test`
