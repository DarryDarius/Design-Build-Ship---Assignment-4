-- Fix for the previous migration: each person can read only their own rows again.
alter policy "People can see their own books" on public.books
  using ((select auth.jwt()) ->> 'sub' = user_id);
alter policy "People can see their own sessions" on public.sessions
  using ((select auth.jwt()) ->> 'sub' = user_id);
