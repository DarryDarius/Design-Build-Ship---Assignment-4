"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Skeleton } from "@/components/EmptyState";
import { WeekStrip } from "@/components/WeekStrip";
import { Progress } from "@/components/Progress";
import { addSession, lastSession, markVisit, previousVisit, useStudyLog, useToday, type Data } from "@/lib/store";
import { addDays, formatMinutes, GOAL_MINUTES, isSameWeek, pace, perDayToGoal, sessionsInWeek, total, weekDays, weekStart } from "@/lib/week";

// One tap logs a real session, so the first visit is useful right away.
const STARTERS = [
  { course: "Reading", minutes: 25 },
  { course: "Problem set", minutes: 50 },
  { course: "Review notes", minutes: 30 },
];

export function TodayView() {
  const store = useStudyLog();
  const router = useRouter();
  const today = useToday();

  useEffect(() => {
    if (store && today) markVisit(today);
  }, [store, today]);

  if (!store || !today) return <Skeleton />;
  const { sessions } = store.data;

  const quickLog = (course: string, minutes: number, place = "", bookId: string | null = null) => {
    // Only keep the book if it's still on the shelf.
    const book = bookId && store.data.books.some((b) => b.id === bookId) ? bookId : null;
    const s = addSession({ course, minutes, place, date: today, bookId: book });
    router.push(`/week?added=${s.id}`);
  };

  if (sessions.length > 0) return <WelcomeBack data={store.data} today={today} onLog={quickLog} />;

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">What did you study today?</h1>
        <p className="mt-3 max-w-md text-calm-muted">Log a session and watch your week add up toward 10 hours.</p>
        <ButtonLink href="/log" className="mt-6">
          Log a session
        </ButtonLink>

        <div className="mt-8 border-t border-calm-border pt-6">
          <h2 className="font-medium">Or start with one tap</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <li key={s.course}>
                <Button variant="secondary" onClick={() => quickLog(s.course, s.minutes)}>
                  <span aria-hidden>+</span> {s.course} · {s.minutes} min
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-calm-muted">Tap one, and it counts toward today.</p>
        </div>

        <div className="mt-8 border-t border-calm-border pt-6">
          <h2 className="font-medium">Studying from a textbook?</h2>
          <p className="mt-1 text-sm text-calm-muted">Put it on your shelf, and you can log time against it.</p>
          <ButtonLink href="/shelf" variant="secondary" className="mt-3">
            Find a book
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="week-h">
        <h2 id="week-h" className="font-display text-2xl">
          This week
        </h2>
        <div className="mt-4">
          <WeekStrip days={weekDays(sessions, today)} />
        </div>
        <p className="mt-3 text-sm text-calm-muted">Your week fills in as you log.</p>
      </section>
    </div>
  );
}

/** Coming back: progress first, then the fastest way to log again. */
function WelcomeBack({
  data,
  today,
  onLog,
}: {
  data: Data;
  today: string;
  onLog: (course: string, minutes: number, place?: string, bookId?: string | null) => void;
}) {
  const { sessions } = data;
  const week = sessionsInWeek(sessions, today);
  const minutes = total(week);
  const todayMinutes = total(sessions.filter((s) => s.date === today));
  const left = Math.max(0, GOAL_MINUTES - minutes);
  const diff = pace(minutes, today);
  const last = lastSession(sessions)!;
  const prev = previousVisit(data, today);
  const newWeek = !!prev && !isSameWeek(prev, today);
  const lastWeek = total(sessionsInWeek(sessions, addDays(weekStart(today), -1)));

  const summary: string[] = [];
  if (newWeek) summary.push("It’s a new week.");
  if (newWeek && lastWeek > 0) summary.push(`Last week you studied ${formatMinutes(lastWeek)}.`);
  if (todayMinutes > 0) summary.push(`You’ve studied ${formatMinutes(todayMinutes)} today.`);
  else if (!newWeek) summary.push("Nothing logged today yet.");

  // Behind pace is framed as what's still doable, not as a shortfall.
  const paceText =
    minutes >= GOAL_MINUTES
      ? "Goal reached this week"
      : diff >= 0 && minutes > 0
        ? "On pace for 10 hours"
        : `About ${formatMinutes(perDayToGoal(minutes, today))} a day reaches 10h by Sunday`;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">{prev ? "Welcome back." : "Good start."}</h1>
        <p className="mt-3 text-calm-muted">{summary.join(" ")}</p>
      </section>

      <section aria-label="This week's progress" className="space-y-5 rounded-xl border border-calm-border bg-calm-surface p-5 sm:p-6">
        <Progress minutes={minutes} goal={GOAL_MINUTES} />
        <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <span className={diff >= 0 && minutes > 0 ? "font-medium text-calm-sage" : "text-calm-muted"}>{paceText}</span>
          {left > 0 && <span className="text-calm-muted">{formatMinutes(left)} to go</span>}
        </p>
        <WeekStrip days={weekDays(sessions, today)} />
      </section>

      <section aria-labelledby="next-h">
        <h2 id="next-h" className="font-medium">
          Pick up where you left off
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button onClick={() => onLog(last.course, last.minutes, last.place, last.bookId)}>
            Log again: {last.course} · {last.minutes} min
          </Button>
          <ButtonLink href="/log" variant="secondary">
            Log something else
          </ButtonLink>
        </div>
        <p className="mt-3 text-sm text-calm-muted">Log again adds it for today.</p>
      </section>
    </div>
  );
}
