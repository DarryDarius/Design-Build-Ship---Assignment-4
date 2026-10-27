// Shared by the server route and the browser.

/** What the app keeps from an Open Library search result. */
export type BookResult = {
  olKey: string; // "/works/OL4781294W"
  title: string;
  authors: string; // first three authors, joined
  coverId: number | null;
  firstYear: number | null;
};

export const coverUrl = (id: number, size: "S" | "M" | "L" = "M") => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
