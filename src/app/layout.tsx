import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SavedFooter, SaveStatus } from "@/components/SaveStatus";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Study Log", template: "%s · Study Log" },
  description: "Log your study sessions and watch them add up toward a weekly goal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="calm-grain flex min-h-full flex-col bg-calm-bg font-body text-calm-text">
        <ClerkProvider>
          <Nav />
          <SaveStatus />
          <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-6 sm:py-12">{children}</main>
          <SavedFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}