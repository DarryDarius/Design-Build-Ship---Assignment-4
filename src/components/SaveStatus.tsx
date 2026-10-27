"use client";

import { Show } from "@clerk/nextjs";
import { dismissSaveError, load, useStoreStatus } from "@/lib/store";
import { focusRing } from "./styles";

const banner = "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-calm-error/30 bg-[#f6e4df] px-5 py-3 text-center text-sm text-calm-error";
const bannerButton = `cursor-pointer rounded-sm font-medium underline decoration-2 underline-offset-4 ${focusRing}`;

/** Says plainly when the account can't be reached, or a change didn't save. */
export function SaveStatus() {
  const store = useStoreStatus();
  if (store?.status === "failed")
    return (
      <div role="alert" className={banner}>
        <span>We couldn’t load your shelf and sessions. Check your connection.</span>
        <button type="button" className={bannerButton} onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  if (store?.saveError)
    return (
      <div role="alert" className={banner}>
        <span>Your last change didn’t save, so we put things back. Try it again.</span>
        <button type="button" className={bannerButton} onClick={dismissSaveError}>
          OK
        </button>
      </div>
    );
  return null;
}

export function SavedFooter() {
  return (
    <footer className="border-t border-calm-border">
      <p className="mx-auto max-w-2xl px-5 py-4 text-sm text-calm-muted sm:px-6">
        <Show when="signed-out">Sign in to keep your shelf and your sessions on every device.</Show>
        <Show when="signed-in">Saved to your account. Book data from Open Library.</Show>
      </p>
    </footer>
  );
}
