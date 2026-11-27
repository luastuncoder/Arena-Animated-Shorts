"use client";

/** Scrolls to the player and starts it, so "Watch here" is one action. */
export default function WatchButton({ target = "watch" }: { target?: string }) {
  return (
    <button
      className="btn primary"
      onClick={() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
        const badge = document.querySelector<HTMLButtonElement>(".playBtn");
        if (badge) badge.click();
      }}
    >
      <svg width="13" height="14" viewBox="0 0 13 14" aria-hidden="true">
        <path d="M1 1.2v11.6c0 .5.55.8.98.53l9.1-5.8a.63.63 0 0 0 0-1.06L1.98.67A.63.63 0 0 0 1 1.2Z" fill="currentColor" />
      </svg>
      Watch here
    </button>
  );
}
