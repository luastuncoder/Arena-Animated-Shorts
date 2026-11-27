# Arena Animated Shorts

A production workspace for planning and creating original animated story shorts, based on [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts). Two original 10-second tests are included; the upstream bridge example remains a technical reference.

## What's here

- `.claude/skills/cartoon-3d-short/SKILL.md` — the upstream workflow and visual recipe, at revision [`e3b817b`](https://github.com/mromidev/claude-animated-shorts/tree/e3b817b6afc6cd413466d43f11ba31209e034bbf); its MIT license and code templates are alongside it. One small TypeScript compatibility adjustment preserves the original effect order.
- `src/` — the Remotion entry point, the revised `PlaneTest` look test, the earlier `TenSecondTest` composition, and the upstream `BridgeShort` technical sample.
- `public/bridge/kenney/` — the 26 small CC0 Kenney models and the texture used by the sample; attribution and license texts are included there.
- `scripts/` — portable still/video rendering, FFmpeg/FFprobe, Python, and draft word-timing helpers. `requirements.txt` and `package-lock.json` make reinstalling the tools repeatable.
- The upstream style-study frames, contact sheets and reports are deliberately **not copied here**. Consult them separately in temporary/private storage; do not publish or include them in deliverables.

The sample was tested with the reference's Three.js/React Three Fiber versions and a newer patched Remotion release. The upstream audio templates and cues are **bridge-specific**: copy and adapt their timing, effects and music for each new story, rather than mixing them unchanged.

## Install

Requires Node.js 20+ (tested with Node 22) and Python 3.11. From the repository root:

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run typecheck
npm test
```

The npm dependencies supply FFmpeg and FFprobe for the helpers. On Linux x64 the render scripts also supply headless Chromium and software WebGL, including the libraries needed in a minimal sandbox. On other systems Remotion uses its usual browser setup, or set `REMOTION_BROWSER_EXECUTABLE` to an existing Chrome/Chromium executable. Rendering runs locally, not on Vercel. A software-only machine can be substantially slower and more memory-constrained than a GPU-equipped workstation.

Dependencies, temporary bundles and most generated outputs are ignored by Git and may need to be reinstalled or regenerated after an environment reset. The explicitly requested test videos are exceptions. No API keys are required for the local examples.

## Revised 10-second look test

`PlaneTest` is a new, wordless look test: a paper plane crosses a town and lands on a character. It has three original shots, the skill's 2D bean-head drawing and card shader, painted 3D town assets, two-tone lighting, ink, depth of field, bloom, tone mapping and grade, plus a newly synthesized march and sound effects. Its simplified story is fictional; **it is a visual test, not the skill's full researched and narrated story pipeline**.

The retained file is `deliverables/animated-test-v2.mp4` (300 frames at 30 fps, 810 × 1440 test render, 48 kHz stereo AAC). `deliverables/animated-test-v2-preview.gif` is a small silent preview. Run `npm run preview:video` for a local browser player; this is a temporary local server, not a persistent public URL.

The scene copies reusable code from the MIT-licensed skill template into `src/videos/plane-test/`, with a new town layout, character, flight path, camera plan and sound cues. For practical software rendering the draft uses fewer depth-of-field samples and a cached static town shadow. The skill's original sampling settings remain in `.claude/skills/cartoon-3d-short/templates/bridge/` for higher-quality production renders. To regenerate this draft:

```sh
npm run py -- src/videos/plane-test/soundtrack.py work/plane-test/soundtrack.wav
npm run render -- --id PlaneTest --output work/plane-test/picture.mp4 --scale 0.75 --dpr 0.75 --concurrency 1
npm run ffmpeg -- -y -i work/plane-test/picture.mp4 -i work/plane-test/soundtrack.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -t 10 -movflags +faststart deliverables/animated-test-v2.mp4
npm run py -- .claude/skills/cartoon-3d-short/templates/scripts/short_qa.py deliverables/animated-test-v2.mp4 work/plane-test/qa src/videos/plane-test/shots.json
```

The previous, less faithful explorer-and-star test remains available as `deliverables/animated-test-10s.mp4` and the `TenSecondTest` composition; it is no longer the player default.

## Streaming player (`web/`)

The shorts now play in a small web player instead of arriving as downloads. It is a
Next.js app in `web/` — a static page plus static video files, so it can be hosted on
Vercel's free tier and nothing is stored on the viewer's device unless they ask for a copy.

```sh
npm --prefix web install     # only needed once
npm run player:dev           # http://localhost:3000
npm run player:media         # copy deliverables into web/public/media
npm run player:build         # production build
```

`web/lib/shorts.ts` is the library: one object per short (title, blurb, file, poster,
duration). Adding a short means rendering it, adding the entry, and running `npm run player:media`. The player itself only preloads metadata (`preload="metadata"`), so the
page stays light on a slow connection; playback streams in chunks via byte ranges.

## The Clockmaker's Bird (new short)

`ClockmakerBird` is the first **narrated** short: 41 seconds, eight shots, delivered at 810 × 1440 (composed for 1080 × 1920) at 30 fps.
In a town where every clock keeps perfect time, an old clockmaker builds a brass songbird that
ticks, hops and turns — and cannot sing. He sets it on the window sill and leaves the window
open. At dawn a sparrow lands beside it, answers it, and the town keeps time to a new song.

- Narration: eight synthesized lines (`work/bird/vo/01..08.mp3`) placed on the shot starts in
  `src/videos/clockmaker/story.ts` (`VO_START`).
- Score and foley: `src/videos/clockmaker/soundtrack.py` — a music-box waltz for the town, a
  small unresolved figure for the bird, a tremolo through the blue hour, a sparrow answering the
  silent bird, and a bright golden-hour reprise. The music ducks under the narration.
- Art: `src/videos/clockmaker/art.ts` (the clockmaker, the brass songbird with a wind-up key,
  the live sparrow, the painted clock faces). Set and staging: `world.ts`; cameras and light
  curve: `story.ts`.
- Render: `python3 src/videos/clockmaker/soundtrack.py public/clockmaker/mix.wav`, then
  `npm run render -- --id ClockmakerBird --output work/bird/final.mp4 --scale 0.75 --dpr 0.6 --concurrency 1`,
  then mux `public/clockmaker/mix.wav` over the picture (AAC 128k, faststart).
- Deliverable: `deliverables/clockmakers-bird.mp4` (41.0 s, 810 × 1440, 30 fps, −17.3 LUFS,
  −1.9 dB peak, no unplanned pops, black or frozen frames). Poster:
  `deliverables/clockmakers-bird-poster.jpg`; silent preview: `deliverables/clockmakers-bird-preview.gif`.

The light is part of the story: afternoon inside the workshop, dusk and a blue hour at the open
window, a warm sunrise on the sill, then a golden-hour wide shot of the town. `duskAt`,
`nightAt`, `dawnAt` and `goldenAt` in `story.ts` drive the sky, the window view, the room's lamp
and the exposure, so every change lands on a cut.

## The Kite Thief (previous short)

`KiteShort` is the third original short: 13 seconds, four shots. A red paper kite slips
its string in a cobbled square, rides the wind over the rooftops, and dives back into a
small kid's hands exactly as the town switches on its lamps. It reuses the skill's painted
town kit, card shader, ink, depth of field, bloom, tone map and grade, with a new street
layout, kite, two hand-drawn characters (`src/videos/kite-short/art.ts`) and a new
whistled score with foley.

- Render: `npm run py -- src/videos/kite-short/soundtrack.py work/kite/soundtrack.wav`,
  then `npm run render -- --id KiteShort --output work/kite/picture.mp4 --scale 0.75 --dpr 0.75 --concurrency 1`,
  then mux the WAV over the picture with the FFmpeg helper.
- Deliverable: `deliverables/kite-thief.mp4` (13.0 s, 810 × 1440, 30 fps, 48 kHz stereo AAC,
  −17.7 LUFS, −3.8 dB peak, no silence or black frames, 3.5 MB web encode).
- Stills: `deliverables/kite-thief-poster.jpg` and `deliverables/kite-thief-dusk.jpg`.

This one is wordless: no narration, rendered at 810 × 1440 rather than the skill's
1440 × 2560 final size.

## Common commands

```sh
# Open Remotion Studio with the upstream example (binds to all interfaces).
npm run studio -- --port 3100

# Preview a low-resolution still of the upstream technical example.
npm run still -- --id BridgeShort --frame 60 --output out/example/frame.png --scale 0.25 --dpr 0.5

# Short test clip; omit --from/--to to render a full composition.
npm run render -- --id BridgeShort --from 0 --to 29 --output out/example/test.mp4 --scale 0.25 --dpr 0.5

# For a finished composition, 4/3 of 1080×1920 is 1440×2560.
npm run render -- --id YOUR_COMPOSITION --output out/YOUR_SHORT/picture.mp4 --scale 1.3333333333333333
```

Set `REMOTION_TMP` to a dedicated folder on a drive with plenty of space before long renders; Remotion creates temporary bundles. Do not delete shared temporary files while anything is rendering. `--dpr` is a low-resolution testing override for the bridge template; omit it for a final.

For narration, obtain or record an original voice after the script is approved. The following produces **draft** English word times in the upstream mixer's `{word, s, e}` format. A transcript improves alignment but must have numbers spelled out; unknown words must be resolved against PocketSphinx's dictionary. Review and correct all words and times by ear.

```sh
npm run py -- scripts/word-times.py work/YOUR_SHORT/voice.wav work/YOUR_SHORT/words.json --transcript work/YOUR_SHORT/script.txt
```

After creating the short-specific 48 kHz mix, explicitly replace Remotion's silent audio track and run QA:

```sh
npm run ffmpeg -- -i out/YOUR_SHORT/picture.mp4 -i work/YOUR_SHORT/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac out/YOUR_SHORT/final.mp4
npm run py -- .claude/skills/cartoon-3d-short/templates/scripts/short_qa.py out/YOUR_SHORT/final.mp4 out/YOUR_SHORT/qa
```

Pass a shot metadata JSON file as the last QA argument to exempt planned cuts, flashes and transitions. Check duration, picture, loudness and the final audio/video synchronization by hand too. `npm run ffprobe -- ...` exposes the installed FFprobe. The original upstream still and sandbox-merge scripts contain example-specific paths; use the local wrappers or adapt those scripts before relying on them.

## Workflow

1. Choose a visually explainable story and research its facts and sources.
2. Write a strong hook, escalation, explanation and payoff; get the script approved.
3. Choose/record narration and check the word timings.
4. Create an original shot plan, world, characters and camera moves from the reusable templates.
5. Review stills, lock timing, build an original music/SFX mix, render, mux and QA.

Vercel can be useful later for a review or presentation site. The existing Vercel project inspected during setup is connected to a **different** GitHub repository and has not been modified or deployed from this workspace.
