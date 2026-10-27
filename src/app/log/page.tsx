import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { LogView } from "./LogView";

export const metadata: Metadata = { title: "Log a session" };

export default async function Page() {
  await auth.protect(); // signed out: sent to sign-in
  return <LogView />;
}
