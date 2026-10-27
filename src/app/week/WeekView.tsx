"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { focusRing } from "@/components/styles";
import { ButtonLink } from "@/components/Button";
import { EmptyState, Skeleton } from "@/components/EmptyState";
import { Progress } from "@/components/Progress";
import { Toast, toastAction } from "@/components/Toast";
import { WeekStrip } from "@/components/WeekStrip";
import { removeSession, useStudyLog, useToday, type Book } from "@/lib/store";
import {
  addDays,
  byCourse,
  formatDay,
  formatMinutes,
  GOAL_MINUTES,
  sessionsInWeek,
  total,
  weekDays,
  weekStart,
  type Session,
} from "@/lib/week";

function rangeLabel(anyDay: string) {
  const fmt = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const start = weekStart(anyDay);
  return `${fmt(start)} – ${fmt(addDays(start, 6))}`;
}

export function WeekView() {
  const store = useStudyLog();
  const today = useToday();
  const router = useRouter();
  const params = useSearchParams();
  const added = params.get("added");
  const showLast = params.get("week") === "last";
  const here = showLast ? "/week?week=last" : "/week";
  const [undone, setUndone] = useState<Session | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  const sessions = store?.data.sessions ?? [];
  const addedSession = added ? sessions.find((s) => s.id === added) : undefined;

  // Right after saving, put keyboard focus on Undo so a mistaken save is one key away.
  const toastFor = store && today ? addedSession?.id : undefined;
  useEffect(() => {
    if (toastFor) undoRef.current?.focus();
  }, [toastFor]);

  function undo(s: Session) {
    removeSession(s.id);
    setUndone(s);
    router.replace(here, { scroll: false });
  }

  function dismiss() {
    setUndone(null);
    router.replace(here, { scroll: false });
  }

  const toast = undone ? (
    <Toast onDismiss={dismiss}>
      Removed {undone.minutes} min of {undone.course}.
    </Toast>
  ) : addedSession ? (
    <Toast
      onDismiss={dismiss}
      action={
        <button ref={undoRef} type="button" className={toastAction} onClick={() => undo(addedSession)}>
          Undo
        </button>
      }
    >
      Logged {addedSession.minutes} min of {addedSession.course}
      {today && addedSession.date !== today && (addedSession.date === addDays(today, -1) ? " yesterday" : ` on ${formatDay(addedSession.date, today)}`)}.
    </Toast>
  ) : null;

  return (
    <>
      {/* Present from the first paint so screen readers announce the toast. */}
      <div aria-live="polite" aria-atomic="true">
        {store && today && toast}
      </div>
      {!store || !today ? <Skeleton /> : <Week sessions={sessions} books={store.data.books} today={today} showLast={showLast} highlight={addedSession?.id} />}
      {/* Room at the bottom so the toast never covers the last row. */}
      {toast && <div aria-hidden className="h-20" />}
    </>
  );
}

const weekLink = `inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-calm-muted hover:bg-calm-surface hover:text-calm-text ${focusRing}`;

function Week({
  sessions,
  books,
  today,
  showLast,
  highlight,
}: {
  sessions: Session[];
  books: Book[];
  today: string;
  showLast: boolean;
  highlight?: string;
}) {
  const bookTitle = (id: string | null) => books.find((b) => b.id === id)?.title;
  // "Last week" shows the days before this Monday, so a session logged for Sunday is never out of sight.
  const anchor = showLast ? addDays(weekStart(today), -1) : today;
  const week = sessionsInWeek(sessions, anchor);
  const lastWeek = total(sessionsInWeek(sessions, addDays(weekStart(today), -1)));
  const minutes = total(week);
  const title = showLast ? "Last week" : "This week";

  const header = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-tight">{title}</h1>
          <p className="mt-1 text-calm-muted">{rangeLabel(anchor)}</p>
        </div>
        {week.length > 0 && !showLast && <ButtonLink href="/log">Log a session</ButtonLink>}
      </div>
      {showLast ? (
        <Link href="/week" className={weekLink}>
          Back to this week <span aria-hidden>→</span>
        </Link>
      ) : (
        <Link href="/week?week=last" className={weekLink}>
          <span aria-hidden>←</span> Last week{lastWeek > 0 ? ` · ${formatMinutes(lastWeek)}` : ""}
        </Link>
      )}
    </div>
  );

  if (week.length === 0)
    return (
      <div className="space-y-8">
        {header}
        <EmptyState title={showLast ? "Nothing logged last week" : "No sessions this week yet"} action={<ButtonLink href="/log">Log a session</ButtonLink>}>
          {showLast
            ? "You can still add a session from last week in the form."
            : lastWeek > 0
              ? `Last week you studied ${formatMinutes(lastWeek)}. Log one to start this week.`
              : "Log one and it shows up here."}
        </EmptyState>
        <WeekStrip days={weekDays(sessions, anchor, today)} />
      </div>
    );

  // Newest day first; within a day, newest session first.
  const days = [...new Set(week.map((s) => s.date))].sort().reverse();

  return (
    <div className="space-y-10">
      {header}

      <section aria-label="Progress" className="space-y-6 rounded-xl border border-calm-border bg-calm-surface p-5 sm:p-6">
        <Progress minutes={minutes} goal={GOAL_MINUTES} period={showLast ? "last week" : "this week"} />
        <WeekStrip days={weekDays(sessions, anchor, today)} />
      </section>

      <section aria-labelledby="sessions-h">
        <h2 id="sessions-h" className="font-display text-2xl">
          Sessions
        </h2>
        <div className="mt-4 space-y-6">
          {days.map((date) => {
            const list = week.filter((s) => s.date === date).sort((a, b) => b.createdAt - a.createdAt);
            return (
              <div key={date}>
                <h3 className="flex justify-between border-b border-calm-border pb-2 text-sm font-medium">
                  <span>{formatDay(date, today)}</span>
                  <span className="text-calm-muted tabular-nums">{formatMinutes(total(list))}</span>
                </h3>
                <ul>
                  {list.map((s) => {
                    const detail = [bookTitle(s.bookId), s.place].filter(Boolean).join(" · ");
                    return (
                    <li
                      key={s.id}
                      className={`flex items-baseline justify-between gap-4 border-b border-calm-border px-2 py-3 transition-colors ${
                        s.id === highlight ? "bg-calm-sage-tint" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-lg">{s.course}</span>
                        {detail && <span className="block truncate text-sm text-calm-muted">{detail}</span>}
                      </span>
                      <span className="shrink-0 text-calm-muted tabular-nums">{s.minutes} min</span>
                    </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="courses-h">
        <h2 id="courses-h" className="font-display text-2xl">
          By course
        </h2>
        <ul className="mt-4 space-y-3">
          {byCourse(week).map((c) => (
            <li key={c.course}>
              <div className="flex justify-between gap-4 text-sm">
                <span>{c.course}</span>
                <span className="text-calm-muted tabular-nums">{formatMinutes(c.minutes)}</span>
              </div>
              <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-calm-border/60">
                <div className="h-full rounded-full bg-calm-muted" style={{ width: `${(c.minutes / minutes) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
