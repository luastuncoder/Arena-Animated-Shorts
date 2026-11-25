#!/usr/bin/env python3
"""Create draft word timings for English narration; always review them by ear.

Usage: npm run py -- scripts/word-times.py voice.wav work/words.json
       npm run py -- scripts/word-times.py voice.wav work/words.json --transcript script.txt
The optional transcript forces alignment to known words (numbers must be spelled out).
JSON entries have `word`, `s` and `e`; the latter two match the upstream mixer.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from pocketsphinx import Decoder


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--transcript", type=Path, help="Plain spoken words; all numbers spelled out")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing output file")
    args = parser.parse_args()
    if not args.audio.is_file():
        parser.error(f"Audio not found: {args.audio}")
    if args.output.resolve() == args.audio.resolve():
        parser.error("Output must not overwrite the audio input")
    if args.output.exists() and not args.force:
        parser.error(f"Output already exists: {args.output}; use --force to replace it")

    decoder = Decoder(samprate=16000, loglevel="ERROR")
    if args.transcript:
        text = args.transcript.read_text(encoding="utf-8").replace("’", "'").lower()
        if re.search(r"\d", text):
            parser.error("Spell out numbers in the transcript before forced alignment")
        words = re.findall(r"[a-z]+(?:'[a-z]+)?", text)
        if not words:
            parser.error("The transcript contains no English words")
        unknown = sorted({word for word in words if decoder.lookup_word(word) is None})
        if unknown:
            parser.error("Words not in the English pronunciation dictionary: " + ", ".join(unknown))
        decoder.set_align_text(" ".join(words))

    try:
        audio = subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-i", str(args.audio), "-ac", "1", "-ar", "16000", "-f", "s16le", "-acodec", "pcm_s16le", "-"],
            check=True, capture_output=True,
        ).stdout
    except FileNotFoundError:
        parser.error("ffmpeg not found; run this through npm run py -- ...")
    except subprocess.CalledProcessError as exc:
        parser.error("ffmpeg could not decode the audio: " + exc.stderr.decode(errors="replace").strip())
    if not audio:
        parser.error("The audio decoded to an empty stream")

    decoder.start_utt()
    decoder.process_raw(audio, full_utt=True)
    decoder.end_utt()
    result = []
    for segment in decoder.seg():
        word = re.sub(r"\(\d+\)$", "", segment.word)
        if word.startswith(("<", "+", "[")):
            continue
        result.append({"word": word, "s": round(segment.start_frame / 100, 2), "e": round((segment.end_frame + 1) / 100, 2)})
    if not result:
        parser.error("No words were detected; check the audio and transcript")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(result)} draft word timings to {args.output}. Review words and timing by ear.", file=sys.stderr)


if __name__ == "__main__":
    main()
