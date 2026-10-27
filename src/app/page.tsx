import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/EmptyState";
import { Landing } from "./Landing";
import { TodayView } from "./TodayView";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Home />
    </Suspense>
  );
}

// Signed out: the landing page, with no one's data. Signed in: Today.
async function Home() {
  const { isAuthenticated } = await auth();
  return isAuthenticated ? <TodayView /> : <Landing />;
}
