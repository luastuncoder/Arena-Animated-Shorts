"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Short } from "@/lib/shorts";

export default function Player({ short }: { short: Short }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Only metadata is preloaded, so opening the page costs a few kilobytes.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onWait = () => setWaiting(true);
    const onPlay = () => setWaiting(false);
    const onEnd = () => setStarted(false);
    v.addEventListener("waiting", onWait);
    v.addEventListener("playing", onPlay);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("ended", onEnd);
    };
  }, []);

  const begin = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    setStarted(true);
    setWaiting(true);
    v.play().catch(() => setWaiting(false));
  }, []);

  return (
    <div className="screen">
      <video
        ref={ref}
        controls={started}
        playsInline
        preload="metadata"
        poster={`/media/${short.poster}`}
        aria-label={`${short.title} — ${short.seconds} second animated short`}
      >
        <source src={`/media/${short.file}`} type="video/mp4" />
        Your browser cannot play this video.
      </video>

      {!started && (
        <div className="posterWrap" style={{ backgroundImage: `url(/media/${short.poster})` }}>
          <button className="playBtn" onClick={begin} aria-label={`Play ${short.title}`}>
            <svg width="24" height="26" viewBox="0 0 13 14" aria-hidden="true">
              <path d="M1 1.2v11.6c0 .5.55.8.98.53l9.1-5.8a.63.63 0 0 0 0-1.06L1.98.67A.63.63 0 0 0 1 1.2Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}

      {started && waiting && <span className="spinner">buffering…</span>}
    </div>
  );
}
