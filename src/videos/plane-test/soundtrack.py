#!/usr/bin/env python3
"""Original 10-second march, paper-plane foley and mix for the visual test.

This is a wordless look test, not the skill's full narrated factual-story pipeline.
The score and effects are newly synthesized with the reusable upstream DSP kit.
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    r = rng(291506)
    seconds = 10.0
    n = int(seconds * SR)
    music = np.zeros((2, n), dtype=np.float64)
    foley = np.zeros_like(music)
    beat = 60.0 / 112.0

    # A small, deliberately original jaunty march: tuba pulse, light snare,
    # and a short fife/glock motif. No upstream bridge melody or cues are reused.
    roots = [48, 53, 55, 48, 53]
    for b in range(19):
        t = b * beat
        if t >= 9.65:
            break
        root = roots[min(b // 4, len(roots) - 1)]
        bass = instruments.brass(instruments.m2f(root - (12 if b % 2 == 0 else 5)), 0.28, vel=0.30, r=r, kind="tuba")
        place(music, pan(bass, -0.20), t, 0.055)
        if b % 2:
            drum = instruments.snare(vel=0.24, r=r, dur=0.18, tune=1.03, snappy=0.7)
            place(music, pan(drum, 0.18), t, 0.045)
        chord = instruments.pluck(instruments.m2f(root + [0, 7, 12, 7][b % 4]), vel=0.32, r=r, dur=0.4, bright=0.3)
        place(music, pan(chord, 0.32 if b % 2 else -0.26), t, 0.035)

    melody = [(0, 76), (1, 79), (2, 81), (3, 79), (4, 77), (5, 76), (6, 74), (7, 76),
              (8, 79), (9, 81), (10, 84), (11, 81), (12, 79), (13, 77), (14, 76), (16, 79), (17, 76)]
    for b, midi in melody:
        t = b * beat + 0.07
        if t >= 9.4:
            continue
        lead = instruments.fife(instruments.m2f(midi), 0.28 if b != 14 else 0.55, vel=0.27, r=r)
        place(music, pan(lead, 0.06), t, 0.045)
        if b % 2 == 0:
            chime = instruments.glock(instruments.m2f(midi + 12), vel=0.16, r=r, dur=0.55)
            place(music, pan(chime, 0.38), t, 0.012)

    # Foley events follow the locked visual timeline: four steps, a few airy
    # flight passes, then a small paper-on-hair tap at frame 227 / 30.
    place(foley, sfx_gen.breeze(seconds, r, level=0.1), 0, 0.020)
    place(foley, pan(sfx_gen.bird_chirps(seconds, r, density=0.25), -0.65), 0, 0.012)
    for frame in [9, 24, 39, 54]:
        place(foley, pan(sfx_gen.stroll_step(r, scuff=0.25), -0.20), frame / 30, 0.035)
    for t, p in [(0.75, -0.6), (3.5, 0.1), (6.5, 0.5)]:
        swish = sfx_gen.whoosh(0.55, r, peak=0.18, f_lo=650, f_hi=2600, width=0.65, tail=0.14, air=0.12)
        place(foley, pan(swish, p), t, 0.028)
    # A soft, short cartoon tap with an airy paper flick, rather than a crash.
    t = np.arange(int(0.18 * SR)) / SR
    tap = np.exp(-t / 0.026) * (0.65 * np.sin(2 * np.pi * (310 * t - 420 * t * t)) + 0.35 * np.sin(2 * np.pi * 620 * t))
    tap += 0.10 * r.standard_normal(len(t)) * np.exp(-t / 0.008)
    place(foley, pan(fades(tap, 0.001, 0.03), 0.15), 227 / 30, 0.10)
    place(foley, pan(instruments.glock(instruments.m2f(88), vel=0.28, r=r, dur=0.8), 0.24), 7.59, 0.035)

    music = fades(music, 0.05, 0.45)
    # Balance the music against transient foley, then normalize the combined mix.
    if not np.isfinite(integrated(music)):
        raise RuntimeError("Generated score is silent")
    music *= dbg(-20.0 - integrated(music))
    mix = music + foley
    mix = fades(mix, 0.03, 0.35)
    mix *= dbg(-17.0 - integrated(mix))
    peak = true_peak(mix)
    if peak > -1.5:
        mix *= dbg(-1.5 - peak)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_wav(str(args.output), mix)
    print(f"{args.output}: {seconds:.1f} s, {SR} Hz stereo, {integrated(mix):.1f} LUFS, {true_peak(mix):.1f} dBTP")


if __name__ == "__main__":
    main()
