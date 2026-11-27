/**
 * The library is data-driven: one entry per short, all media under /media/.
 * Files are served as static assets, so the browser range-requests them and
 * playback starts without downloading the whole video first.
 */
export type Short = {
  id: string;
  title: string;
  chyron: string;
  blurb: string;
  file: string;
  poster: string;
  seconds: number;
  width: number;
  height: number;
  tags: string[];
};

export const SHORTS: Short[] = [
  {
    id: "clockmakers-bird",
    title: "The Clockmaker's Bird",
    chyron: "Short · 02",
    blurb:
      "In a town where every clock keeps perfect time, one old clockmaker builds a brass bird that cannot sing. At dawn, with the window left open, something small and brown answers it.",
    file: "clockmakers-bird.mp4",
    poster: "clockmakers-bird-poster.jpg",
    seconds: 41,
    width: 1080,
    height: 1920,
    tags: ["Narrated", "Dawn", "Original score"],
  },
  {
    id: "kite-thief",
    title: "The Kite Thief",
    chyron: "Short · 01",
    blurb:
      "A red paper kite slips its string and rides the wind over the rooftops. One small kid, one long run, and a catch just as the town lights up.",
    file: "kite-thief.mp4",
    poster: "kite-thief-poster.jpg",
    seconds: 13,
    width: 810,
    height: 1440,
    tags: ["Dusk chase", "Kite", "Original score"],
  },
  {
    id: "unexpected-landing",
    title: "An Unexpected Landing",
    chyron: "Short · 00",
    blurb:
      "A paper plane takes a sightseeing flight through a painted town and lands on a passer-by. The earlier look test that started it all.",
    file: "unexpected-landing.mp4",
    poster: "unexpected-landing-poster.jpg",
    seconds: 10,
    width: 810,
    height: 1440,
    tags: ["Paper plane", "Town", "Original score"],
  },
];

export const feature = SHORTS[0];
