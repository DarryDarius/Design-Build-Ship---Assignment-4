-- Study Shelf: books on someone's shelf, and their study sessions.
-- Every row belongs to one Clerk user. user_id is filled in from the Clerk
-- session token (auth.jwt() ->> 'sub'), so the browser never sends it.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  ol_key text not null check (ol_key ~ '^/works/OL[0-9]+W$'),
  title text not null check (char_length(title) between 1 and 200),
  authors text not null default '' check (char_length(authors) <= 200),
  cover_id integer check (cover_id > 0),
  first_year integer,
  created_at timestamptz not null default now(),
  unique (user_id, ol_key), -- the same book can't be on one shelf twice
  unique (id, user_id)      -- lets sessions point at a book of the same person
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  course text not null check (char_length(btrim(course)) between 1 and 60),
  minutes integer not null check (minutes between 5 and 600),
  place text not null default '' check (char_length(place) <= 60),
  day date not null,
  book_id uuid,
  created_at timestamptz not null default now(),
  -- A session can only point at a book on the same person's shelf.
  -- Removing the book keeps the session and clears only book_id.
  foreign key (book_id, user_id) references public.books (id, user_id) on delete set null (book_id)
);

create index sessions_user_day_idx on public.sessions (user_id, day);
create index sessions_book_idx on public.sessions (book_id);

-- Row-level security: each person sees and changes only their own rows.
alter table public.books enable row level security;
alter table public.sessions enable row level security;

create policy "People can see their own books" on public.books
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "People can add books to their own shelf" on public.books
  for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "People can remove their own books" on public.books
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);

create policy "People can see their own sessions" on public.sessions
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "People can log their own sessions" on public.sessions
  for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "People can remove their own sessions" on public.sessions
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);

-- Signed-out visitors (anon) get nothing; signed-in people only what the app uses.
revoke all on public.books, public.sessions from anon, authenticated;
grant select, insert, delete on public.books, public.sessions to authenticated;
