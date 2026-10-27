import { ButtonLink } from "@/components/Button";

const STEPS = [
  { title: "Find your books", body: "Search Open Library for the textbooks and readings on your syllabus." },
  { title: "Log your hours", body: "Note what you studied, for how long, and which book it was for." },
  { title: "Pick up anywhere", body: "Your shelf and your week follow your account to any device." },
];

/** What a signed-out visitor sees: what the tool does, and a way in. No one's data. */
export function Landing() {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">Your books and your study hours, in one place.</h1>
        <p className="mt-3 max-w-md text-calm-muted">Put what you&apos;re reading on a shelf, log the time you spend on it, and watch your week add up toward 10 hours.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ButtonLink href="/sign-up">Create a free account</ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </section>
      <ol className="grid gap-6 border-t border-calm-border pt-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <p className="font-display text-2xl text-calm-muted" aria-hidden>
              {i + 1}
            </p>
            <h2 className="mt-1 font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-calm-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
