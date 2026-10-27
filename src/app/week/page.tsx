import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/EmptyState";
import { WeekView } from "./WeekView";

export const metadata: Metadata = { title: "This week" };

export default async function Page() {
  await auth.protect(); // signed out: sent to sign-in
  return (
    <Suspense fallback={<Skeleton />}>
      <WeekView />
    </Suspense>
  );
}
