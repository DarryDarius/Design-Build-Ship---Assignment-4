# /security-review on `feature/full-stack` (2026-10-27)

Run with Claude Code's `/security-review` on the branch, against `main`, before merging.

**Result: no findings at or above the confidence bar.** Nothing to fix.

What it checked:

- **RLS, final state after all four migrations:** on for both tables. select / insert (`with check`) / delete all require `(select auth.jwt()) ->> 'sub' = user_id`. The on-purpose `using (true)` break is undone by `…_restore_rls.sql`.
- **Grants:** `anon` has nothing; `authenticated` has only select, insert, delete. No update, so `user_id` can't be rewritten.
- **`user_id`** defaults to the token's `sub`; the client never sends it; a forged one fails the insert check.
- **Composite FK** `sessions(book_id, user_id) → books(id, user_id)`: a session can only point at the same person's book.
- **Cached search:** the cache key is only the query; no user data inside the cached function, so nothing crosses between people. Fixed host, `encodeURIComponent`, validated fields.
- **XSS:** no `dangerouslySetInnerHTML` / `innerHTML` / `eval`; cover URLs are built from an integer on a fixed host.
- **Auth:** `clerkMiddleware()` everywhere, `auth.protect()` on pages, 401 from `/api/books`.
- **Secrets:** no `.env*` tracked; no service-role or `sk_` key in the diff.

Outside the code, checked in the dashboards: Supabase third-party auth accepts only this Clerk instance (`merry-sloth-9459.clerk.accounts.dev`), and Clerk's Supabase integration adds `role: authenticated` to the token.
