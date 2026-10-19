// ARG "recovered footage" pages, served at /footage/<slug>.
//
// Passwords are NOT stored here (this repo is public). Each tape's password
// lives in a Netlify environment variable named by `passwordEnv`, and is only
// ever checked server-side by netlify/functions/footage.mts. Nobody can see it
// in the browser until the tape has been solved.
//
// Slugs are the public URLs — they're random so one tape's URL doesn't give
// away the others.
//
// Homepage takeover: set the Netlify environment variable ARG_HOMEPAGE_TAPE to
// a tape number (1, 2 or 3) and newworldfoolproductions.com/ will send visitors
// to that tape (see netlify/edge-functions/arg-home.ts). Clear it to turn off.
//
// ⚠ Only the page template may read this file's presentational fields. The
// browser script must NOT import it — `revealEmbedUrl` has to stay server-side.

export const ARG_NOTIFY_EMAIL = "newworldfoolproductions@gmail.com";
export const ARG_PASSWORD_LENGTH = 10;
export const ARG_TIMER_MS = 24 * 60 * 60 * 1000;

/** Case-insensitive, ignores surrounding whitespace. Keep in sync with the copy in the page script. */
export const normalizeArgPassword = (s: string) => s.normalize("NFC").trim().toUpperCase();

export interface Tape {
  slug: string;
  number: number;
  /** Short line shown under the TV. */
  note: string;
  /** Netlify environment variable holding this tape's password. */
  passwordEnv: string;
  /** Vimeo/YouTube *embed* URL shown at the bottom of the page. Leave empty to hide. */
  videoEmbedUrl: string;
  /**
   * Optional: once solved, the TV plays this embed instead of showing the
   * countdown on screen (the countdown moves below the TV). Only ever sent to
   * the browser by the server after the tape is solved.
   */
  revealEmbedUrl?: string;
}

export const tapes: Tape[] = [
  {
    slug: "6fbk26",
    number: 1,
    note: "do not erase",
    passwordEnv: "ARG_PASSWORD_TAPE_1",
    videoEmbedUrl: "https://player.vimeo.com/video/1190989163?h=2950c25315&byline=0&title=0",
  },
  {
    slug: "gez3vt",
    number: 2,
    note: "don't watch alone",
    passwordEnv: "ARG_PASSWORD_TAPE_2",
    videoEmbedUrl: "https://player.vimeo.com/video/1190989163?h=2950c25315&byline=0&title=0",
  },
  {
    slug: "u8zryg",
    number: 3,
    note: "the last one",
    passwordEnv: "ARG_PASSWORD_TAPE_3",
    videoEmbedUrl: "https://player.vimeo.com/video/1190989163?h=2950c25315&byline=0&title=0",
    // PLACEHOLDER — swap in the film's embed URL.
    revealEmbedUrl: "https://player.vimeo.com/video/1190989163?h=2950c25315&byline=0&title=0",
  },
];
