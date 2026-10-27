-- ON PURPOSE, for Assignment 4 step 7: break row-level security so the
-- Playwright test can be watched failing. Any signed-in person can now read
-- everyone's books and sessions. Reverted by the next migration.
alter policy "People can see their own books" on public.books using (true);
alter policy "People can see their own sessions" on public.sessions using (true);
