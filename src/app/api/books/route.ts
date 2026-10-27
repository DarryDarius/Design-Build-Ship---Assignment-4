import { auth } from "@clerk/nextjs/server";
import { searchBooks } from "@/lib/openlibrary";

// GET /api/books?q=algorithms → { books: BookResult[] }
// 401 when signed out, 400 for a missing or too-long query, 503 when Open Library is down or slow.
export async function GET(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return Response.json({ error: "Sign in to search." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return Response.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }
  try {
    const books = await searchBooks(q.toLowerCase());
    return Response.json({ books });
  } catch {
    return Response.json({ error: "Open Library isn't answering right now." }, { status: 503 });
  }
}
