# Arena Animated Shorts

A production workspace for planning and creating original animated story shorts, based on [mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts). An original 10-second test is included; the upstream bridge example remains a technical reference.

## What's here

- `.claude/skills/cartoon-3d-short/SKILL.md` — the upstream workflow and visual recipe, at revision [`e3b817b`](https://github.com/mromidev/claude-animated-shorts/tree/e3b817b6afc6cd413466d43f11ba31209e034bbf); its MIT license and code templates are alongside it. One small TypeScript compatibility adjustment preserves the original effect order.
- `src/` — the Remotion entry point, the original `TenSecondTest` composition, and the upstream `BridgeShort` technical sample.
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

Dependencies, temporary bundles and most generated outputs are ignored by Git and may need to be reinstalled or regenerated after an environment reset. The small test video below is an explicit exception. No API keys are required for the local example.

## 10-second animation test

`TenSecondTest` is an original, caption-free animation with a 2D explorer, a star, a small 3D world, and a synthesized music/SFX bed. It is 300 frames at 30 fps; the test export is 1080 × 1920 with 48 kHz stereo audio. The small, explicitly requested test video is retained at `deliverables/animated-test-10s.mp4` so it survives workspace resets. Run `npm run preview:video` to watch it in the browser or use the download button. To regenerate it from source:

```sh
npm run py -- src/videos/test-short/soundtrack.py work/test-short/soundtrack.wav
npm run render -- --id TenSecondTest --output work/test-short/picture.mp4 --scale 1 --dpr 1 --concurrency 1
mkdir -p deliverables
npm run ffmpeg -- -y -i work/test-short/picture.mp4 -i work/test-short/soundtrack.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -t 10 -movflags +faststart deliverables/animated-test-10s.mp4
```

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
