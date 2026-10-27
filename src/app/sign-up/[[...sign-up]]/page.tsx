import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <Suspense>
        <SignUp />
      </Suspense>
    </div>
  );
}
