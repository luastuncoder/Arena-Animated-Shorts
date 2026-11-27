#!/usr/bin/env python3
"""Original 13-second score and foley for "The Kite Thief".

A whistled tune over a light plucked accompaniment, a wind gust when the string
snaps, a long rising sweep on the chase, and a warm little cadence as the town
lights up. Wordless; not the skill's narrated pipeline. All cues are newly
synthesized with the reusable upstream DSP kit.
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

TOTAL = 13.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    r = rng(614209)
    n = int(TOTAL * SR)
    music = np.zeros((2, n), dtype=np.float64)
    foley = np.zeros_like(music)
    beat = 60.0 / 100.0

    # --- accompaniment: warm plucked arpeggio, C - Am - F - G, doubling up at the chase
    chords = [(48, [0, 7, 12, 16]), (45, [0, 7, 12, 15]), (41, [0, 7, 12, 16]), (43, [0, 7, 12, 14])]
    bar = beat * 4
    for b in range(int(TOTAL / bar) + 1):
        root, intervals = chords[b % 4]
        t0 = b * bar
        for i, iv in enumerate(intervals):
            t = t0 + i * beat * 0.5
            if t >= TOTAL - 0.2:
                continue
            vel = 0.24 + 0.05 * (i == 0)
            note = instruments.pluck(instruments.m2f(root + iv + 12), vel=vel, r=r, dur=0.55, bright=0.35)
            place(music, pan(note, -0.35 + i * 0.18), t, 0.05)
        bass = instruments.vibes(instruments.m2f(root - 12), vel=0.16, r=r, dur=1.4)
        place(music, pan(bass, -0.05), t0, 0.06)

    # --- backing: a light shaker pulse that appears with the chase and a warm sub under the tune
    for i in range(int(8.0 / (beat * 0.5))):
        t = 2.0 + i * beat * 0.5
        if t > 9.0:
            break
        sh = instruments.brush(vel=0.07 if i % 2 else 0.05, r=r, dur=0.16, swish=bool(i % 4 == 2))
        place(music, pan(sh, 0.3), t, 0.03)
    for i in range(int(TOTAL / bar) + 1):
        t = i * bar
        if t >= TOTAL - 1.2:
            continue
        sub = instruments.vibes(instruments.m2f(chords[i % 4][0] - 24), vel=0.10, r=r, dur=1.8)
        place(music, sub, t, 0.05)

    # --- the tune: a whistled, rising little melody, in three phrases
    phrases = [
        (0.0, [(0.00, 0.40, 76, 0.5), (0.45, 0.40, 79, 0.5), (0.90, 0.40, 81, 0.55), (1.35, 0.40, 79, 0.5),
               (1.80, 0.55, 77, 0.5), (2.40, 0.40, 76, 0.45), (2.85, 0.90, 74, 0.4)]),
        (4.80, [(0.00, 0.40, 79, 0.5), (0.45, 0.40, 81, 0.55), (0.90, 0.85, 84, 0.6), (1.80, 0.40, 83, 0.5),
                (2.25, 0.40, 81, 0.5), (2.70, 0.40, 79, 0.45), (3.15, 0.85, 76, 0.45)]),
        (8.10, [(0.00, 0.40, 81, 0.55), (0.45, 0.40, 84, 0.6), (0.90, 0.40, 86, 0.65), (1.35, 0.40, 84, 0.55),
                (1.80, 0.40, 81, 0.5), (2.25, 0.95, 79, 0.45), (3.30, 1.20, 76, 0.4)]),
    ]
    for t0, notes_v in phrases:
        start, mono = instruments.whistle(notes_v, r, breath=0.045, bright=0.03)
        place(music, pan(mono, 0.12), t0 + start, 0.05)
        for t, _, midi, _ in notes_v[::3]:
            chime = instruments.glock(instruments.m2f(midi + 12), vel=0.09, r=r, dur=0.7)
            place(music, pan(chime, 0.42), t0 + t, 0.012)

    # --- foley: the plaza, the wind, the snap, the chase, the catch
    place(foley, sfx_gen.breeze(TOTAL, r, level=0.075), 0, 0.02)
    place(foley, pan(sfx_gen.bird_chirps(TOTAL, r, density=0.22), -0.6), 0, 0.012)
    # string hum, then the snap at frame 62
    hum = np.zeros(int(1.9 * SR))
    t = np.arange(len(hum)) / SR
    hum = 0.05 * np.sin(2 * np.pi * 210 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t))
    place(foley, pan(fades(hum, 0.1, 0.2), 0.1), 0.3, 0.02)
    snap_t = 62 / 30
    snap = 2.4 * sfx_gen.whoosh(0.5, r, peak=0.06, f_lo=900, f_hi=4200, width=0.5, tail=0.08, air=0.3)
    place(foley, pan(snap, 0.3), snap_t, 0.05)
    tick = np.exp(-np.arange(int(0.09 * SR)) / (0.008 * SR)) * r.standard_normal(int(0.09 * SR))
    place(foley, pan(fades(tick, 0.001, 0.02), 0.25), snap_t, 0.16)
    # a long airy sweep as the kite loops over the roofs
    for t0, p, pk in [(3.2, -0.2, 0.9), (4.6, 0.25, 0.8), (6.0, -0.25, 1.0)]:
        sweep = pk * sfx_gen.whoosh(0.9, r, peak=0.35, f_lo=520, f_hi=2400, width=0.9, tail=0.3, air=0.2)
        place(foley, pan(sweep, p), t0, 0.04)
    # the dive: a falling slide, then a soft paper catch in the kid's hands
    dive = 1.3 * sfx_gen.whoosh(1.1, r, peak=0.85, f_lo=2200, f_hi=700, width=0.85, tail=0.25, air=0.18)
    place(foley, pan(dive, -0.15), 9.2, 0.05)
    catch_t = 352 / 30
    t = np.arange(int(0.22 * SR)) / SR
    paper = np.exp(-t / 0.03) * (0.6 * np.sin(2 * np.pi * (260 * t - 320 * t * t)) + 0.4 * np.sin(2 * np.pi * 520 * t))
    paper += 0.12 * r.standard_normal(len(t)) * np.exp(-t / 0.01)
    place(foley, pan(fades(paper, 0.001, 0.05), 0.0), catch_t, 0.11)
    # the neighbour claps, the town lights up
    for i in range(5):
        clap = sfx_gen.stroll_step(r, scuff=0.7)
        place(foley, pan(clap * 0.7, -0.6), catch_t + 0.42 + i * 0.15, 0.06)
    place(foley, pan(instruments.glock(instruments.m2f(88), vel=0.24, r=r, dur=1.6), 0.28), catch_t + 0.5, 0.03)
    place(foley, pan(instruments.glock(instruments.m2f(84), vel=0.2, r=r, dur=1.8), -0.2), catch_t + 0.72, 0.03)

    # --- dusk cadence: warm pad + a single music-box note to end on
    pad = instruments.pad([48, 55, 64], 3.2, vel=0.22, r=r, att=0.8, rel=1.2, warm=800)
    place(music, pad * 0.9, 10.4, 0.05)
    box = instruments.musicbox(instruments.m2f(84), vel=0.3, r=r, dur=2.2)
    place(music, pan(box, 0.1), 11.4, 0.03)

    music = fades(music, 0.06, 0.7)
    music *= dbg(-20.5 - integrated(music))
    mix = music + foley
    mix = fades(mix, 0.04, 0.55)
    mix *= dbg(-17.5 - integrated(mix))
    peak = true_peak(mix)
    if peak > -2.2:
        mix *= dbg(-2.2 - peak)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_wav(str(args.output), mix)
    print(f"{args.output}: {TOTAL:.1f} s, {SR} Hz stereo, {integrated(mix):.1f} LUFS, {true_peak(mix):.1f} dBTP")


if __name__ == "__main__":
    main()
