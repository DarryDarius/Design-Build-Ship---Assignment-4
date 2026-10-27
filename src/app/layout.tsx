import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SavedFooter, SaveStatus } from "@/components/SaveStatus";
import { calmAppearance } from "@/lib/clerkAppearance";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Study Shelf", template: "%s · Study Shelf" },
  description: "Keep the books you're studying on a shelf, log your hours, and watch your week add up.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="calm-grain flex min-h-full flex-col bg-calm-bg font-body text-calm-text">
        <ClerkProvider
          appearance={calmAppearance}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <Nav />
          <SaveStatus />
          <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-6 sm:py-12">{children}</main>
          <SavedFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
