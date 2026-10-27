"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { describedBy, Field, Input } from "@/components/Field";
import { focusRing } from "@/components/styles";
import { Toast, toastAction } from "@/components/Toast";
import { coverUrl, type BookResult } from "@/lib/books";
import { addBook, removeBook, useStudyLog, type Book } from "@/lib/store";
import { formatMinutes, total } from "@/lib/week";

type Search =
  | { kind: "idle" }
  | { kind: "loading"; q: string; slow: boolean }
  | { kind: "results"; q: string; books: BookResult[] }
  | { kind: "empty"; q: string }
  | { kind: "down"; q: string }
  | { kind: "signed-out" };

export function ShelfView() {
  const store = useStudyLog();
  const [query, setQuery] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  const [added, setAdded] = useState<Book | null>(null);
  const pending = useRef<AbortController | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (added) undoRef.current?.focus();
  }, [added]);

  async function run(q: string) {
    pending.current?.abort(); // a newer search replaces an older one
    const ctrl = new AbortController();
    pending.current = ctrl;
    setSearch({ kind: "loading", q, slow: false });
    // Open Library can take a few seconds; say so instead of looking stuck.
    const slowTimer = window.setTimeout(() => setSearch((s) => (s.kind === "loading" && s.q === q ? { ...s, slow: true } : s)), 3000);
    const giveUp = window.setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      if (res.status === 401) return setSearch({ kind: "signed-out" });
      if (!res.ok) return setSearch({ kind: "down", q });
      const { books } = (await res.json()) as { books: BookResult[] };
      setSearch(books.length ? { kind: "results", q, books } : { kind: "empty", q });
    } catch {
      // Aborted by a newer search: leave that one's state alone. Timed out or offline: say it's down.
      if (pending.current === ctrl) setSearch({ kind: "down", q });
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(giveUp);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setFieldError("Type at least 2 characters, like a title or an author.");
      document.getElementById("q")?.focus();
      return;
    }
    setFieldError(undefined);
    void run(q);
  }

  if (!store) return <Skeleton />;
  const { books, sessions } = store.data;

  const add = (b: BookResult) => setAdded(addBook(b));
  const undo = (b: Book) => {
    removeBook(b.id);
    setAdded(null);
  };

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl leading-tight">Your shelf</h1>
        <p className="mt-2 text-calm-muted">The books you’re studying. Log time against any of them.</p>

        <form role="search" noValidate onSubmit={onSubmit} className="mt-8 max-w-lg">
          <Field id="q" label="Find a book" hint="Search Open Library by title, author, or ISBN." error={fieldError}>
            <div className="flex gap-2">
              <Input
                id="q"
                name="q"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                invalid={!!fieldError}
                aria-describedby={describedBy("q", true, fieldError)}
              />
              <Button type="submit">Search</Button>
            </div>
          </Field>
        </form>

        <div className="mt-6" aria-live="polite">
          <SearchResults search={search} books={books} onAdd={add} onRetry={(q) => void run(q)} />
        </div>
      </section>

      <section aria-labelledby="shelf-h">
        <h2 id="shelf-h" className="font-display text-2xl">
          On your shelf{books.length > 0 && <span className="text-calm-muted"> · {books.length}</span>}
        </h2>
        <div className="mt-4">
          {books.length === 0 ? (
            <EmptyState title="Your shelf is empty">Search for a textbook or a reading above, then add it here.</EmptyState>
          ) : (
            <ul className="border-t border-calm-border">
              {books.map((b) => (
                <ShelfItem key={b.id} book={b} minutes={total(sessions.filter((s) => s.bookId === b.id))} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <div aria-live="polite" aria-atomic="true">
        {added && (
          <Toast
            onDismiss={() => setAdded(null)}
            action={
              <button ref={undoRef} type="button" className={toastAction} onClick={() => undo(added)}>
                Undo
              </button>
            }
          >
            Added {added.title} to your shelf.
          </Toast>
        )}
      </div>
      {added && <div aria-hidden className="h-20" />}
    </div>
  );
}

function SearchResults({
  search,
  books,
  onAdd,
  onRetry,
}: {
  search: Search;
  books: Book[];
  onAdd: (b: BookResult) => void;
  onRetry: (q: string) => void;
}) {
  switch (search.kind) {
    case "idle":
      return null;
    case "loading":
      return (
        <div role="status" className="space-y-3">
          <p className="text-sm text-calm-muted">
            Searching Open Library for “{search.q}”…{search.slow && " It can take a few seconds."}
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse-soft flex gap-4 border-b border-calm-border py-3" aria-hidden>
              <div className="h-18 w-12 rounded-sm bg-calm-border" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-2/3 rounded bg-calm-border" />
                <div className="h-3 w-1/3 rounded bg-calm-border/70" />
              </div>
            </div>
          ))}
        </div>
      );
    case "empty":
      return <EmptyState title={`No books match “${search.q}”`}>Check the spelling, or try just the title or the author’s last name.</EmptyState>;
    case "down":
      return (
        <EmptyState
          title="Open Library isn’t answering"
          action={
            <Button variant="secondary" onClick={() => onRetry(search.q)}>
              Try again
            </Button>
          }
        >
          Their search is down or slow right now. Your shelf and sessions are safe. Try again in a minute.
        </EmptyState>
      );
    case "signed-out":
      return (
        <EmptyState title="You’ve been signed out" action={<ButtonLink href="/sign-in">Sign in again</ButtonLink>}>
          Sign in to search for books.
        </EmptyState>
      );
    case "results":
      return (
        <div>
          <p className="text-sm text-calm-muted">
            {search.books.length} {search.books.length === 1 ? "book" : "books"} for “{search.q}”
          </p>
          <ul className="mt-2 border-t border-calm-border">
            {search.books.map((r) => {
              const saved = books.find((b) => b.olKey === r.olKey);
              return (
                <li key={r.olKey} className="flex items-center gap-4 border-b border-calm-border py-3">
                  <Cover id={r.coverId} title={r.title} />
                  <BookText book={r} />
                  {saved ? (
                    <span className="flex shrink-0 flex-col items-end gap-1 text-sm">
                      <span className="flex items-center gap-1 font-medium text-calm-sage">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M2.5 6.5 5 9l4.5-6" />
                        </svg>
                        On your shelf
                      </span>
                      <Link href={`/log?book=${saved.id}`} className={`rounded-sm text-calm-muted underline decoration-calm-border decoration-2 underline-offset-4 hover:text-calm-text ${focusRing}`}>
                        Log time
                      </Link>
                    </span>
                  ) : (
                    <Button variant="secondary" className="shrink-0" onClick={() => onAdd(r)} aria-label={`Add ${r.title} to your shelf`}>
                      Add to shelf
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );
  }
}

function ShelfItem({ book, minutes }: { book: Book; minutes: number }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-calm-border py-3">
      <Cover id={book.coverId} title={book.title} />
      <div className="min-w-0 flex-1">
        <BookText book={book} />
        <p className="mt-1 text-sm text-calm-muted tabular-nums">{minutes > 0 ? `${formatMinutes(minutes)} logged` : "No time logged yet"}</p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm" role="group" aria-label={`Remove ${book.title}?`}>
          <span className="text-calm-muted">Remove? Its sessions stay in your log.</span>
          <Button variant="secondary" onClick={() => removeBook(book.id)}>
            Remove
          </Button>
          <Button variant="quiet" onClick={() => setConfirming(false)} autoFocus>
            Keep
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <ButtonLink href={`/log?book=${book.id}`} variant="secondary" aria-label={`Log time for ${book.title}`}>
            Log time
          </ButtonLink>
          <Button variant="quiet" onClick={() => setConfirming(true)} aria-label={`Remove ${book.title} from your shelf`}>
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}

function BookText({ book }: { book: BookResult }) {
  const byline = [book.authors, book.firstYear].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 flex-1">
      <p className="font-display text-lg leading-snug">{book.title}</p>
      {byline && <p className="truncate text-sm text-calm-muted">{byline}</p>}
    </div>
  );
}

/** The cover from Open Library, or a plain stand-in with the first letter. The title is next to it, so it's decorative. */
function Cover({ id, title }: { id: number | null; title: string }) {
  if (!id)
    return (
      <div aria-hidden className="flex h-18 w-12 shrink-0 items-center justify-center rounded-sm border border-calm-border bg-calm-surface font-display text-xl text-calm-muted">
        {title.charAt(0)}
      </div>
    );
  return (
    // Plain <img>: covers come straight from Open Library's CDN, not through our server.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={coverUrl(id, "M")} alt="" width={48} height={72} loading="lazy" className="h-18 w-12 shrink-0 rounded-sm border border-calm-border bg-calm-surface object-cover" />
  );
}
