#!/usr/bin/env python3
"""Generate a small original 10-second music/foley bed for the test short."""
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
    random = rng(6317)
    duration = 10.0
    bed = np.zeros((2, int(duration * SR)), dtype=np.float64)

    # Soft plucked chords: an original little four-bar progression.
    beat = 60 / 106
    chord_roots = [48, 53, 45, 55, 48]
    for bar, root in enumerate(chord_roots):
        start = bar * 4 * beat
        for i, interval in enumerate([0, 7, 12, 7]):
            t = start + i * beat
            if t >= duration - 0.25:
                break
            freq = instruments.m2f(root + interval)
            note = instruments.pluck(freq, vel=0.40, r=random, dur=0.62, bright=0.35)
            place(bed, pan(note, (-0.22 if i % 2 == 0 else 0.22)), t, 0.08)
    for t, midi in [(0.3, 76), (1.42, 79), (2.54, 81), (3.67, 79), (4.8, 76), (5.93, 74), (7.06, 76), (8.19, 79), (9.12, 84)]:
        note = instruments.glock(instruments.m2f(midi), vel=0.35, r=random, dur=0.75)
        place(bed, pan(note, 0.15), t, 0.028)

    # Footsteps stop with the walk; a little chime accompanies the star's arrival.
    for f in [10, 24, 38, 52, 66, 80, 94]:
        place(bed, pan(sfx_gen.boot(random, 0.55), -0.20), f / 30, 0.0065)
    for t, midi in [(2.7, 88), (4.35, 91), (8.45, 88)]:
        note = instruments.glock(instruments.m2f(midi), vel=0.42, r=random, dur=0.65)
        place(bed, pan(note, 0.45), t, 0.045)

    bed = fades(bed, 0.08, 0.45)
    current = integrated(bed)
    if not np.isfinite(current):
        raise RuntimeError("Generated soundtrack is silent")
    bed *= dbg(-17.0 - current)
    peak = true_peak(bed)
    if peak > -1.5:
        bed *= dbg(-1.5 - peak)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_wav(str(args.output), bed)
    print(f"{args.output}: {duration:.1f} s, {SR} Hz stereo, {integrated(bed):.1f} LUFS, {true_peak(bed):.1f} dBTP")


if __name__ == "__main__":
    main()
