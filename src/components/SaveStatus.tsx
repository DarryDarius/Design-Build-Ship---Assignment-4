"use client";

import { Show } from "@clerk/nextjs";
import { useStudyLog } from "@/lib/store";

/** Says where data lives, and warns plainly when this browser can't keep it. */
export function SaveStatus() {
  const store = useStudyLog();
  if (store && !store.canSave)
    return (
      <div role="alert" className="border-b border-calm-error/30 bg-[#f6e4df] px-5 py-3 text-center text-sm text-calm-error">
        This browser isn’t saving. Your sessions will disappear when you close the tab.
      </div>
    );
  return null;
}

export function SavedFooter() {
  const store = useStudyLog();
  return (
    <footer className="border-t border-calm-border">
      <p className="mx-auto max-w-2xl px-5 py-4 text-sm text-calm-muted sm:px-6">
        <Show when="signed-out">Sign in to keep your shelf and your sessions on every device.</Show>
        <Show when="signed-in">{store && !store.canSave ? "Not saving in this browser" : "Saved on this device."}</Show>
      </p>
    </footer>
  );
}
