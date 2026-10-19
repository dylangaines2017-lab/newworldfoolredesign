// Homepage takeover for the ARG.
//
// Set the Netlify environment variable ARG_HOMEPAGE_TAPE to 1, 2 or 3 (then
// redeploy) and anyone opening newworldfoolproductions.com/ is sent to that
// tape's page. Leave it empty to turn the takeover off.
//
// The tape pages' "Go to homepage" button links to /?home, which sets a cookie
// so that browser can use the normal site for the rest of the session.

import { tapes } from "../../src/data/arg.ts";

declare const Netlify: { env: { get(name: string): string | undefined } };

const BYPASS_COOKIE = "nwf_home";

export default async (req: Request, context: { cookies: { get(name: string): string | undefined } }) => {
  const url = new URL(req.url);

  if (url.searchParams.has("home")) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `${BYPASS_COOKIE}=1; Path=/; SameSite=Lax; Secure`,
        "Cache-Control": "no-store",
      },
    });
  }

  const tapeNumber = Number(Netlify.env.get("ARG_HOMEPAGE_TAPE"));
  const tape = tapes.find((t) => t.number === tapeNumber);
  if (!tape || context.cookies.get(BYPASS_COOKIE)) return; // serve the normal homepage

  return new Response(null, {
    status: 302,
    headers: { Location: `/footage/${tape.slug}/`, "Cache-Control": "no-store" },
  });
};

export const config = { path: "/" };
