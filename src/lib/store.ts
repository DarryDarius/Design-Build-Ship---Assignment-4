"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import type { BookResult } from "./books";
import { todayISO, type Session } from "./week";

// Sessions and books live in Supabase, under the signed-in person's Clerk id.
// Row-level security decides which rows come back: queries here never filter
// by user, so if RLS were off, the test in tests/ would catch it.
//
// Only device-specific things stay in this browser's localStorage, per user:
// the unsent form draft and the last-visit days for "Welcome back".

export type Book = BookResult & { id: string; createdAt: number };
export type Draft = { course: string; minutes: string; place: string; date: string; bookId: string };

export type Data = {
  sessions: Session[];
  books: Book[];
  lastVisit?: string; // the last day the Today page was opened
  prevVisit?: string; // the visit before that, for "Welcome back"
  draft?: Draft; // what was typed into the log form but not submitted
};

type Local = Pick<Data, "lastVisit" | "prevVisit" | "draft">;

/** loading → ready, or failed if the first load didn't work. saveError: the last change didn't reach the database. */
export type State = { status: "loading" | "ready" | "failed"; data: Data; saveError: boolean };

type Connection = { client: SupabaseClient; userId: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY: Data = { sessions: [], books: [] };

let conn: Connection | null = null;
let state: State | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(next: State | null) {
  state = next;
  emit();
}

function patch(change: (d: Data) => Data, saveError = state?.saveError ?? false) {
  if (!state) return;
  set({ ...state, data: change(state.data), saveError });
}

// ---- this device -------------------------------------------------------

const localKey = (userId: string) => `study-shelf:v1:${userId}`;

function readLocal(userId: string): Local {
  try {
    const r = JSON.parse(localStorage.getItem(localKey(userId)) ?? "{}") as Partial<Local>;
    return {
      lastVisit: typeof r.lastVisit === "string" && ISO.test(r.lastVisit) ? r.lastVisit : undefined,
      prevVisit: typeof r.prevVisit === "string" && ISO.test(r.prevVisit) ? r.prevVisit : undefined,
      draft: r.draft && typeof r.draft === "object" ? { ...r.draft, bookId: typeof r.draft.bookId === "string" ? r.draft.bookId : "" } : undefined,
    };
  } catch {
    return {};
  }
}

function writeLocal(d: Data) {
  if (!conn) return;
  try {
    const local: Local = { lastVisit: d.lastVisit, prevVisit: d.prevVisit, draft: d.draft };
    localStorage.setItem(localKey(conn.userId), JSON.stringify(local));
  } catch {
    // Storage blocked: the draft and visit days just aren't remembered on this device.
  }
}

// ---- rows <-> app types ------------------------------------------------

type SessionRow = { id: string; course: string; minutes: number; place: string; day: string; book_id: string | null; created_at: string };
type BookRow = { id: string; ol_key: string; title: string; authors: string; cover_id: number | null; first_year: number | null; created_at: string };

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  course: r.course,
  minutes: r.minutes,
  place: r.place,
  date: r.day,
  bookId: r.book_id,
  createdAt: Date.parse(r.created_at),
});

const toBook = (r: BookRow): Book => ({
  id: r.id,
  olKey: r.ol_key,
  title: r.title,
  authors: r.authors,
  coverId: r.cover_id,
  firstYear: r.first_year,
  createdAt: Date.parse(r.created_at),
});

// ---- connecting --------------------------------------------------------

/** Called when someone signs in (or switches account): load their rows. */
export function connect(client: SupabaseClient, userId: string) {
  if (conn?.userId === userId) return;
  conn = { client, userId };
  set({ status: "loading", data: { ...EMPTY, ...readLocal(userId) }, saveError: false });
  void load();
}

/** Called on sign-out: forget everything, so the next person sees nothing of it. */
export function disconnect() {
  conn = null;
  set(null);
}

/** Load (or reload) everything for the signed-in person. */
export async function load() {
  const c = conn;
  if (!c) return;
  if (state?.status === "failed") set({ ...state, status: "loading" });
  const [sessions, books] = await Promise.all([
    c.client.from("sessions").select("id, course, minutes, place, day, book_id, created_at").order("created_at", { ascending: false }).limit(2000),
    c.client.from("books").select("id, ol_key, title, authors, cover_id, first_year, created_at").order("created_at", { ascending: false }),
  ]);
  if (conn !== c || !state) return; // signed out or switched while loading
  if (sessions.error || books.error) {
    set({ ...state, status: "failed" });
    return;
  }
  set({
    status: "ready",
    saveError: false,
    data: { ...state.data, sessions: (sessions.data as SessionRow[]).map(toSession), books: (books.data as BookRow[]).map(toBook) },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in person's data once it has loaded, or null while loading, signed out, or during the server render. */
export function useStudyLog(): State | null {
  const s = useSyncExternalStore(subscribe, () => state, () => null);
  return s?.status === "ready" ? s : null;
}

/** Everything, including loading and failed, for the status banner. */
export function useStoreStatus(): State | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

const newId = () => crypto.randomUUID();

// ---- changes -----------------------------------------------------------
// Each change shows up right away, then is saved. If saving fails it's undone
// and the banner says so, so the screen never claims something that isn't saved.

export function addSession(s: Omit<Session, "id" | "createdAt">) {
  const session: Session = { ...s, id: newId(), createdAt: Date.now() };
  patch((d) => ({ ...d, sessions: [session, ...d.sessions] }));
  const c = conn;
  void c?.client
    .from("sessions")
    .insert({ id: session.id, course: s.course, minutes: s.minutes, place: s.place, day: s.date, book_id: s.bookId })
    .then(({ error }) => {
      if (error && conn === c) patch((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== session.id) }), true);
    });
  return session;
}

export function removeSession(id: string) {
  const removed = state?.data.sessions.find((s) => s.id === id);
  if (!removed) return;
  patch((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
  const c = conn;
  void c?.client
    .from("sessions")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error && conn === c) patch((d) => ({ ...d, sessions: [removed, ...d.sessions] }), true);
    });
}

/** Put a search result on the shelf. Returns the book (the existing one if it's already there). */
export function addBook(b: BookResult) {
  const existing = state?.data.books.find((x) => x.olKey === b.olKey);
  if (existing) return existing;
  const book: Book = { ...b, id: newId(), createdAt: Date.now() };
  patch((d) => ({ ...d, books: [book, ...d.books] }));
  const c = conn;
  void c?.client
    .from("books")
    .insert({ id: book.id, ol_key: b.olKey, title: b.title, authors: b.authors, cover_id: b.coverId, first_year: b.firstYear })
    .then(({ error }) => {
      if (!error || conn !== c) return;
      if (error.code === "23505") void load(); // already on the shelf from another device
      else patch((d) => ({ ...d, books: d.books.filter((x) => x.id !== book.id) }), true);
    });
  return book;
}

/** Take a book off the shelf. Its sessions stay in the log, without the book. */
export function removeBook(id: string) {
  const before = state?.data;
  if (!before?.books.some((b) => b.id === id)) return;
  patch((d) => ({
    ...d,
    books: d.books.filter((b) => b.id !== id),
    sessions: d.sessions.map((s) => (s.bookId === id ? { ...s, bookId: null } : s)),
  }));
  const c = conn;
  void c?.client
    .from("books")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error && conn === c) patch((d) => ({ ...d, books: before.books, sessions: before.sessions }), true);
    });
}

export function dismissSaveError() {
  if (state?.saveError) set({ ...state, saveError: false });
}

export function saveDraft(draft: Draft | undefined) {
  patch((d) => {
    const next = { ...d, draft };
    writeLocal(next);
    return next;
  });
}

/** Record today's visit, keeping the previous visit day for "Welcome back". */
export function markVisit(today: string) {
  if (state && state.data.lastVisit !== today)
    patch((d) => {
      const next = { ...d, prevVisit: d.lastVisit, lastVisit: today };
      writeLocal(next);
      return next;
    });
}

/** The last day before today that this person opened Today, if any. */
export function previousVisit(d: Data, today: string) {
  return d.lastVisit === today ? d.prevVisit : d.lastVisit;
}

/** The most recently logged session, for prefilling and "Log again". */
export function lastSession(sessions: Session[]) {
  return sessions.reduce<Session | undefined>((latest, s) => (!latest || s.createdAt > latest.createdAt ? s : latest), undefined);
}

// Today's date is read in the browser only (never during the prerender),
// and refreshes if the tab stays open past midnight.
function subscribeToday(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  return () => window.clearInterval(timer);
}

export function useToday(): string | null {
  return useSyncExternalStore(subscribeToday, todayISO, () => null);
}
