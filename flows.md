# Study Shelf flows

**Main task:** I find my textbook → put it on my shelf → log 45 minutes of reading it → sign in on my laptop later, and the book and my week are still there.

```mermaid
flowchart TD
  open([Open Study Shelf]) --> signed{Signed in?}
  signed -- "no" --> landing["<b>/ Landing</b><br/>What it does · Create account · Sign in<br/>no one's data"]
  landing --> clerk["Clerk sign-up / sign-in"] --> load
  signed -- "yes" --> load{Load my shelf and sessions<br/>from Supabase}
  load -- "fails" --> failed["Banner: couldn't load · Try again"] --> load

  %% First visit
  load -- "nothing yet" --> first["<b>/ Today · first visit</b><br/>One-tap starters · Log a session · Find a book"]
  first -- "Find a book" --> shelf
  first -- "tap a starter" --> saved

  %% The shelf
  shelf["<b>/shelf</b><br/>Search Open Library"] --> search{Search}
  search -- "loading" --> skel["Placeholder rows<br/>'It can take a few seconds'"] --> search
  search -- "nothing found" --> none["No books match … · try the title or author"]
  search -- "Open Library down" --> down["Open Library isn't answering · Try again"]
  search -- "results" --> results["Add to shelf"] --> added[(Saved to Supabase)]
  added --> toastB["Toast: Added … · Undo"]
  added -- "Log time" --> form

  %% The form
  form["<b>/log</b><br/>What · Minutes · Which book? · Where · Day"] --> valid{Valid?}
  valid -- "no" --> errors["Errors next to each field · typed values kept"] --> form
  valid -- "yes" --> saved[(Saved to Supabase)]
  saved --> week["<b>/week</b><br/>Progress · 7-day strip · sessions with their book"]
  week --> toast["Toast: Logged … · Undo"]

  %% Coming back, any device
  load -- "has data" --> back["<b>/ Today · welcome back</b><br/>Progress · pace · Log again"]
  back -- "Log again" --> saved
  back --> week
```

## States per page

| Page | Empty / first | Loading | Error | Success |
|---|---|---|---|---|
| `/` signed out | Landing, no data | — | — | Sign up / Sign in |
| `/` signed in | Starters + Find a book | Skeleton | Couldn't load · Try again | Welcome back with progress |
| `/shelf` | "Your shelf is empty" | Placeholder rows, then "It can take a few seconds" | Nothing found · Open Library isn't answering · Signed out | Toast "Added … · Undo" |
| `/log` | Defaults, "No book" (links to the shelf) | Skeleton | Field errors with next step; "didn't save" banner | Redirect to `/week` with toast |
| `/week` | "No sessions this week yet" + Log a session | Skeleton | Couldn't load · Try again | Toast with Undo |
