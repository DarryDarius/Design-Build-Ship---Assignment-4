import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ShelfView } from "./ShelfView";

export const metadata: Metadata = { title: "Your shelf" };

export default async function Page() {
  await auth.protect(); // signed out: sent to sign-in
  return <ShelfView />;
}
