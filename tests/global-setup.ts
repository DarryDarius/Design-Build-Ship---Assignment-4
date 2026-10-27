import { clerkSetup } from "@clerk/testing/playwright";

// Gets a Clerk testing token, so test sign-ins aren't blocked as bots.
export default async function globalSetup() {
  await clerkSetup();
}
