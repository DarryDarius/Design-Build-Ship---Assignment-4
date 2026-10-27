"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Skeleton } from "@/components/EmptyState";
import { describedBy, Field, Input, Select } from "@/components/Field";
import { PLACES } from "@/lib/places";
import { focusRing } from "@/components/styles";
import { addSession, lastSession, saveDraft, useStudyLog, useToday, type Book, type Draft } from "@/lib/store";
import { FIELD_ORDER, validateSession } from "@/lib/validate";
import { addDays, earliestDay, isSameWeek, type Session } from "@/lib/week";

export function LogView() {
  const store = useStudyLog();
  const today = useToday();
  const bookParam = useSearchParams().get("book"); // from "Log time" on the shelf
  if (!store || !today) return <Skeleton />;

  const { sessions, books, draft } = store.data;
  const onShelf = (id: string | null | undefined) => (id && books.some((b) => b.id === id) ? id : "");
  const last = lastSession(sessions);
  // Pick up an unfinished draft, or prefill from the last session. The course
  // starts empty (typing into a prefilled name appended to it); recent courses
  // are one tap away as chips.
  const base: Draft = draft ?? {
    course: "",
    minutes: last ? String(last.minutes) : "",
    place: last?.place ?? "",
    date: today,
    bookId: "",
  };
  const picked = books.find((b) => b.id === bookParam);
  const initial: Draft = picked
    ? { ...base, bookId: picked.id, course: base.course || picked.title.slice(0, 60) }
    : { ...base, bookId: onShelf(base.bookId) };
  // The key starts the form over when "Log time" is pressed for a different book.
  return <LogForm key={bookParam ?? ""} initial={initial} sessions={sessions} books={books} today={today} />;
}

function recentCourses(sessions: Session[]) {
  const seen: string[] = [];
  for (const s of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!seen.includes(s.course)) seen.push(s.course);
    if (seen.length === 4) break;
  }
  return seen;
}

function LogForm({ initial, sessions, books, today }: { initial: Draft; sessions: Session[]; books: Book[]; today: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Draft>(initial);
  const [submitted, setSubmitted] = useState(false);

  // Errors appear after the first submit, then update as the person fixes them.
  const errors = submitted ? validateSession(values, today) : {};
  const recent = recentCourses(sessions);
  const yesterday = addDays(today, -1);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    saveDraft(next); // what they typed survives leaving the page
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const found = validateSession(values, today);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    const bookId = books.some((b) => b.id === values.bookId) ? values.bookId : null;
    const s = addSession({ course: values.course.trim(), minutes: Number(values.minutes), place: values.place, date: values.date, bookId });
    saveDraft(undefined);
    router.push(isSameWeek(s.date, today) ? `/week?added=${s.id}` : `/week?week=last&added=${s.id}`);
  }

  return (
    <div>
      <h1 className="font-display text-4xl leading-tight">Log a session</h1>
      <p className="mt-2 text-calm-muted">It counts toward this week as soon as you save it.</p>

      <form noValidate onSubmit={onSubmit} className="mt-8 max-w-md space-y-7">
        <Field
          id="course"
          label="What did you study?"
          hint="A course or topic, like Algorithms."
          error={errors.course}
          after={
            recent.length > 0 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Recent courses">
                {recent.map((c) => (
                  <Chip key={c} selected={values.course === c} onClick={() => set("course", c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            )
          }
        >
          <Input
            id="course"
            name="course"
            autoComplete="off"
            value={values.course}
            onChange={(e) => set("course", e.target.value)}
            invalid={!!errors.course}
            aria-describedby={describedBy("course", true, errors.course)}
          />
        </Field>

        <Field
          id="minutes"
          label="Minutes"
          hint="Between 5 and 600."
          error={errors.minutes}
          after={
            <div className="flex flex-wrap gap-2" role="group" aria-label="Common lengths">
              {["25", "50", "90"].map((m) => (
                <Chip key={m} selected={values.minutes === m} onClick={() => set("minutes", m)}>
                  {m} min
                </Chip>
              ))}
            </div>
          }
        >
          <Input
            id="minutes"
            name="minutes"
            inputMode="numeric"
            autoComplete="off"
            className="max-w-32"
            onFocus={(e) => e.target.select()}
            value={values.minutes}
            onChange={(e) => set("minutes", e.target.value)}
            invalid={!!errors.minutes}
            aria-describedby={describedBy("minutes", true, errors.minutes)}
          />
        </Field>

        <Field
          id="book"
          label="Which book?"
          optional
          hint={
            books.length === 0 ? (
              <>
                Put a book on{" "}
                <Link href="/shelf" className={`rounded-sm underline decoration-calm-border decoration-2 underline-offset-4 hover:decoration-calm-accent ${focusRing}`}>
                  your shelf
                </Link>{" "}
                to log time against it.
              </>
            ) : undefined
          }
        >
          <Select
            id="book"
            name="book"
            value={values.bookId}
            disabled={books.length === 0}
            aria-describedby={describedBy("book", books.length === 0)}
            onChange={(e) => {
              const book = books.find((b) => b.id === e.target.value);
              // Picking a book fills in an empty "What did you study?" with its title.
              const next = { ...values, bookId: e.target.value, course: values.course.trim() || !book ? values.course : book.title.slice(0, 60) };
              setValues(next);
              saveDraft(next);
            }}
          >
            <option value="">No book</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
                {b.authors ? ` · ${b.authors.split(", ")[0]}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="place" label="Where?" optional>
          <Select id="place" name="place" value={values.place} onChange={(e) => set("place", e.target.value)}>
            <option value="">Choose a place</option>
            {PLACES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>

        <Field id="date" label="Day" error={errors.date}>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="date"
              name="date"
              type="date"
              min={earliestDay(today)}
              max={today}
              className="max-w-48"
              value={values.date}
              onChange={(e) => set("date", e.target.value)}
              invalid={!!errors.date}
              aria-describedby={describedBy("date", false, errors.date)}
            />
            <div className="flex gap-2" role="group" aria-label="Quick days">
              <Chip selected={values.date === today} onClick={() => set("date", today)}>
                Today
              </Chip>
              <Chip selected={values.date === yesterday} onClick={() => set("date", yesterday)}>
                Yesterday
              </Chip>
            </div>
          </div>
        </Field>

        <div className="border-t border-calm-border pt-6">
          <Button type="submit">Log session</Button>
        </div>
      </form>
    </div>
  );
}
