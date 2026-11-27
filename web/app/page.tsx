import Link from "next/link";
import { SHORTS, feature } from "@/lib/shorts";
import Player from "./player";
import WatchButton from "./watch-button";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="dot" aria-hidden="true" />
          Arena Shorts
        </Link>
        <nav>
          <span className="hideSm">Streaming · no downloads</span>
          <a className="pill" href="#library">Library</a>
        </nav>
      </header>

      <main>
        <section className="stage" aria-labelledby="title">
          <div className="copy">
            <p className="chyron">Now showing · {feature.chyron.replace("Short · ", "No. ")}</p>
            <h1 id="title">
              The Kite <em>Thief</em>
            </h1>
            <p className="blurb">{feature.blurb}</p>
            <ul className="tags">
              {feature.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="actions">
              <WatchButton />
              <a className="btn" href={`/media/${feature.file}`} download={feature.file}>
                Save a copy
              </a>
            </div>
            <p className="note">
              It streams: the player pulls it in small pieces as it plays, so nothing is saved to your
              device unless you press “Save a copy”. Sound is on — give the volume a nudge.
            </p>
          </div>

          <div className="viewer" id="watch">
            <div className="frame">
              <div className="flare" aria-hidden="true" />
              <Player short={feature} />
            </div>
          </div>
        </section>

        <section className="shelf" id="library" aria-labelledby="library-title">
          <h2 id="library-title">In the library</h2>
          <div className="cards">
            {SHORTS.map((s) => (
              <Link className="card" href="/" aria-current={s.id === feature.id} key={s.id}>
                <span
                  className="thumb"
                  style={{ backgroundImage: `url(/media/${s.poster})` }}
                  aria-hidden="true"
                />
                <span className="meta">
                  <strong>{s.title}</strong>
                  <span>
                    {s.seconds}s · {s.width}×{s.height}
                  </span>
                  <em>{s.chyron}</em>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Original animated shorts, rendered with Remotion. Fictional stories.</span>
        <span>
          <a href={`/media/${feature.poster}`} target="_blank" rel="noreferrer">
            Poster
          </a>
          {" · "}
          <a href="https://github.com/luastuncoder/Arena-Animated-Shorts" target="_blank" rel="noreferrer">
            Source
          </a>
        </span>
      </footer>
    </div>
  );
}
