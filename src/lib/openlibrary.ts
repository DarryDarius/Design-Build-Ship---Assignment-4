import { cacheLife } from "next/cache";
import type { BookResult } from "./books";

const FIELDS = "key,title,author_name,first_publish_year,cover_i";
const WORK_KEY = /^\/works\/OL\d+W$/;

type Doc = { key?: unknown; title?: unknown; author_name?: unknown; first_publish_year?: unknown; cover_i?: unknown };

/** Keep only well-formed works, and only the fields the app needs. */
function toResult(d: Doc): BookResult | null {
  if (typeof d.key !== "string" || !WORK_KEY.test(d.key) || typeof d.title !== "string" || !d.title.trim()) return null;
  const authors = Array.isArray(d.author_name) ? d.author_name.filter((a) => typeof a === "string").slice(0, 3).join(", ") : "";
  return {
    olKey: d.key,
    title: d.title.trim().slice(0, 200),
    authors: authors.slice(0, 200),
    coverId: Number.isInteger(d.cover_i) && (d.cover_i as number) > 0 ? (d.cover_i as number) : null,
    firstYear: Number.isInteger(d.first_publish_year) ? (d.first_publish_year as number) : null,
  };
}

/**
 * Search Open Library. Results are cached for a day per query, so the same
 * search from many people costs Open Library one request. Failures throw and
 * are not cached, so the next search tries again.
 */
export async function searchBooks(query: string): Promise<BookResult[]> {
  "use cache";
  cacheLife("days");

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${FIELDS}&limit=12`;
  const res = await fetch(url, {
    headers: { "User-Agent": "StudyShelf/0.1 (MPCS 51238 class project)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Open Library answered ${res.status}`);
  const body = (await res.json()) as { docs?: Doc[] };
  return (Array.isArray(body.docs) ? body.docs : []).map(toResult).filter((b): b is BookResult => b !== null);
}
