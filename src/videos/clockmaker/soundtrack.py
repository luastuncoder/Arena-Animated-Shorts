#!/usr/bin/env python3
"""Original score, foley and narration bed for "The Clockmaker's Bird" (41 s).

A music-box waltz for the town that keeps time, a small sad theme for the bird
that cannot sing, a growing tremolo through the dawn, and a bright resolution
when the sparrow answers. Narration is placed from the VO clips and the music
ducks under it. Every sound is synthesized here with the skill's DSP kit.
"""
import argparse
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / ".claude/skills/cartoon-3d-short/templates/audio"))
from dsp import SR, dbg, fades, integrated, pan, place, rng, true_peak, write_wav  # noqa: E402
import instruments  # noqa: E402
import sfx_gen  # noqa: E402

FPS = 30
TOTAL = 1230 / FPS  # 41.0 s
VO_START = [18, 192, 404, 560, 734, 866, 948, 1064]  # frames, mirrors story.ts
LANDING = 1000 / FPS
SPRING = 1046 / FPS
FINAL_TICK = 1120 / FPS


def midi(n):
    return instruments.m2f(n)


def duck(music, vo, depth=7.5, att=0.18, rel=0.45):
    """Sidechain the music under the narration with a smooth envelope."""
    env = np.abs(vo).mean(axis=0)
    # fast attack, slow release, normalised, one-pole
    a_att, a_rel = np.exp(-1.0 / (att * SR)), np.exp(-1.0 / (rel * SR))
    e = np.zeros_like(env)
    prev = 0.0
    for i, v in enumerate(env):
        a = a_att if v > prev else a_rel
        prev = a * prev + (1 - a) * v
        e[i] = prev
    peak = e.max() or 1.0
    g = dbg(-depth) ** (np.clip(e / peak * 1.6, 0, 1))
    return music * g


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--vo", type=Path, default=ROOT / "public/clockmaker/vo")
    args = parser.parse_args()
    r = rng(90210)
    n = int(TOTAL * SR)
    music = np.zeros((2, n))
    foley = np.zeros((2, n))
    beat = 60.0 / 96.0
    bar = beat * 3  # a waltz

    # --- the town's theme: a music-box waltz in G, bright and even
    town = [(67, 71, 74, 79), (64, 67, 71, 76), (60, 64, 67, 72), (62, 67, 71, 74)]
    for b in range(int(TOTAL / bar) + 1):
        t0 = b * bar
        chord = town[b % 4]
        for i, note in enumerate(chord[1:]):
            t = t0 + i * beat
            if t >= 6.2:
                continue
            place(music, pan(instruments.musicbox(midi(note + 12), vel=0.2, r=r, dur=0.9), -0.3 + i * 0.3), t, 0.02)
        place(music, pan(instruments.vibes(midi(chord[0] - 12), vel=0.14, r=r, dur=1.3), -0.05), t0, 0.04)

    # the town tune, hummed on a soft whistle over the opening and again at the end
    tune = [(0.00, 0.42, 83, 0.5), (0.46, 0.42, 86, 0.55), (0.92, 0.42, 88, 0.55), (1.38, 0.55, 86, 0.5),
            (1.96, 0.42, 83, 0.45), (2.42, 0.90, 81, 0.42)]
    start, mono = instruments.whistle(tune, r, breath=0.04, bright=0.02)
    place(music, pan(mono, 0.1), 0.6 + start, 0.05)

    # --- the bird's theme: a small, unresolved figure, music box and low vibes
    bird_theme = [(0.0, 0.6, 76, 0.34), (0.7, 0.6, 75, 0.32), (1.4, 0.6, 72, 0.3), (2.1, 1.1, 71, 0.28)]
    for t0, p in [(13.4, -0.15), (18.0, -0.05), (24.4, 0.0)]:
        for t, d, note, v in bird_theme:
            place(music, pan(instruments.musicbox(midi(note), vel=v, r=r, dur=d + 0.5), p), t0 + t, 0.03)
        place(music, pan(instruments.vibes(midi(52), vel=0.09, r=r, dur=2.6), 0.0), t0, 0.05)

    # --- a patient ticking pulse under the workshop, on the beat
    for i in range(int(21.0 / (beat * 0.5))):
        t = 6.0 + i * beat * 0.5
        if t >= 27.0:
            break
        tick = instruments.glock(midi(105 if i % 2 == 0 else 103), vel=0.045 if i % 2 == 0 else 0.03, r=r, dur=0.08)
        place(foley, pan(tick, 0.35 if i % 2 else -0.35), t, 0.004)

    # --- dusk to blue hour: a held pad, thinning out; then dawn
    place(music, instruments.pad([48, 55, 60], TOTAL - 24.6, vel=0.13, r=r, att=1.2, rel=2.0, warm=700), 24.6, 0.06)
    # a rising tremolo through the last beats before dawn
    rise_t0 = 28.0
    for i in range(46):
        t = rise_t0 + i * 0.075
        if t > 33.0:
            break
        k = (t - rise_t0) / 5.0
        cello = instruments.vibes(midi(55 + int(k * 7)), vel=0.035 + 0.05 * k, r=r, dur=0.35)
        place(music, pan(cello, -0.2 + 0.4 * k), t, 0.01)
    # dawn: a bright bloom of sound as the light comes up
    for i, note in enumerate([72, 76, 79, 84]):
        place(music, pan(instruments.glock(midi(note), vel=0.16, r=r, dur=2.2), -0.3 + i * 0.2), 31.6 + i * 0.12, 0.03)
    place(music, instruments.pad([52, 59, 64, 67], 7.5, vel=0.16, r=r, att=0.9, rel=1.6, warm=900), 31.4, 0.06)

    # --- the sparrow: real chirps, small and close, answering the silence
    place(foley, pan(sfx_gen.bird_chirps(TOTAL, r, density=0.10) * 0.35, -0.5), 0, 0.01)
    chirp = sfx_gen.bird_chirps(4.5, r, density=0.9)
    place(foley, pan(chirp * 0.9, 0.1), LANDING - 0.15, 0.01)
    # the spring catching: a small wound-metal ping
    t = np.arange(int(0.5 * SR)) / SR
    ping = np.exp(-t / 0.16) * (0.5 * np.sin(2 * np.pi * 1180 * t) + 0.3 * np.sin(2 * np.pi * 1770 * t) + 0.18 * np.sin(2 * np.pi * 2640 * t))
    place(foley, pan(fades(ping, 0.002, 0.3), 0.05), SPRING, 0.09)
    # the whole town's clocks agree: one clean bell, then the new song
    place(foley, pan(instruments.glock(midi(88), vel=0.28, r=r, dur=2.6), -0.1), FINAL_TICK, 0.03)
    place(music, pan(instruments.glock(midi(79), vel=0.2, r=r, dur=2.4), 0.25), FINAL_TICK + 0.26, 0.02)
    # the closing theme returns, brighter, with the whistle joining in
    for b in range(int(6.0 / bar) + 1):
        t0 = FINAL_TICK + 0.5 + b * bar
        chord = town[b % 4]
        for i, note in enumerate(chord[1:]):
            place(music, pan(instruments.musicbox(midi(note + 12), vel=0.22, r=r, dur=0.9), -0.3 + i * 0.3), t0 + i * beat, 0.02)
        place(music, pan(instruments.vibes(midi(chord[0] - 12), vel=0.16, r=r, dur=1.3), -0.05), t0, 0.04)
    start, mono = instruments.whistle([(0.0, 0.42, 86, 0.5), (0.46, 0.42, 88, 0.55), (0.92, 0.55, 91, 0.55), (1.6, 0.9, 88, 0.45)],
                                      r, breath=0.04, bright=0.03)
    place(music, pan(mono, 0.05), FINAL_TICK + 0.6 + start, 0.05)

    # --- room tone and foley: the workshop's dust, a chair creak, the window latch
    place(foley, sfx_gen.breeze(TOTAL, r, level=0.03), 0, 0.02)
    place(foley, pan(sfx_gen.stroll_step(r, scuff=0.5) * 0.25, -0.4), 7.2, 0.05)
    place(foley, pan(sfx_gen.stroll_step(r, scuff=0.8) * 0.2, -0.3), 25.4, 0.05)

    # --- narration, placed on the shot starts
    vo = np.zeros((2, n))
    for i, start in enumerate(VO_START):
        path = args.vo / f"{i + 1:02d}.mp3"
        if not path.exists():
            print(f"missing VO {path}", file=sys.stderr)
            continue
        pcm = instruments.load_audio(path, SR) if hasattr(instruments, "load_audio") else None
        if pcm is None:
            import subprocess
            raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                                 capture_output=True, check=True).stdout
            pcm = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
        pcm = fades(pcm, 0.02, 0.06)
        place(vo, pan(pcm, 0.0), start / FPS, 0.05)

    music = fades(music, 0.4, 1.2)
    music = duck(music, vo * 3.0, depth=7.0)
    foley = duck(foley * 1.0, vo * 3.0, depth=3.0)
    music *= dbg(-21.0 - integrated(music))
    foley *= dbg(-26.0 - integrated(foley))
    vo *= dbg(-15.0 - integrated(vo))
    mix = music + foley + vo
    mix = fades(mix, 0.03, 0.9)
    mix *= dbg(-16.5 - integrated(mix))
    peak = true_peak(mix)
    if peak > -1.8:
        mix *= dbg(-1.8 - peak)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_wav(str(args.output), mix)
    print(f"{args.output}: {TOTAL:.2f} s, {SR} Hz stereo, {integrated(mix):.1f} LUFS, {true_peak(mix):.1f} dBTP")


if __name__ == "__main__":
    main()
