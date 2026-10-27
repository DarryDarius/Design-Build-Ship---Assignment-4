import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  );
}
