-- Performance advisor fixes, same rules as before (nothing is dropped):
-- 1. Read the Clerk user id as (select auth.jwt()) ->> 'sub', so Postgres
--    evaluates the token once per query instead of once per row.
-- 2. Index the (book_id, user_id) foreign key.

alter policy "People can see their own books" on public.books
  using ((select auth.jwt()) ->> 'sub' = user_id);
alter policy "People can add books to their own shelf" on public.books
  with check ((select auth.jwt()) ->> 'sub' = user_id);
alter policy "People can remove their own books" on public.books
  using ((select auth.jwt()) ->> 'sub' = user_id);

alter policy "People can see their own sessions" on public.sessions
  using ((select auth.jwt()) ->> 'sub' = user_id);
alter policy "People can log their own sessions" on public.sessions
  with check ((select auth.jwt()) ->> 'sub' = user_id);
alter policy "People can remove their own sessions" on public.sessions
  using ((select auth.jwt()) ->> 'sub' = user_id);

create index sessions_book_user_idx on public.sessions (book_id, user_id);
