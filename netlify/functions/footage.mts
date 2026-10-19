// Global state for the ARG tapes (src/pages/footage/[slug].astro).
//
//   GET  /api/footage/:slug   → { solved: false } or the solved state
//   POST /api/footage/:slug   { password } → solved state, or 401
//
// The first correct guess records the solve time in Netlify Blobs; every
// visitor after that sees the same password and the same 24h countdown.

import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { tapes, ARG_TIMER_MS, normalizeArgPassword } from "../../src/data/arg";

interface SolveRecord {
  solvedAt: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export default async (req: Request, context: { params: Record<string, string> }) => {
  const tape = tapes.find((t) => t.slug === context.params.slug);
  if (!tape) return json({ error: "not_found" }, 404);

  const secret = process.env[tape.passwordEnv];
  if (!secret) return json({ error: "not_configured" }, 503);
  const password = normalizeArgPassword(secret);

  const store = getStore({ name: "arg-solves", consistency: "strong" });
  const respond = (record: SolveRecord | null, extra: Record<string, unknown> = {}) =>
    json(
      record
        ? {
            solved: true,
            password,
            solvedAt: record.solvedAt,
            endsAt: record.solvedAt + ARG_TIMER_MS,
            // Only revealed once solved, so the film can't be found in the page source.
            revealEmbedUrl: tape.revealEmbedUrl ?? null,
            now: Date.now(),
            ...extra,
          }
        : { solved: false, now: Date.now() },
    );

  if (req.method === "GET") {
    return respond(await store.get(tape.slug, { type: "json" }));
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let guess = "";
  try {
    const body = await req.json();
    guess = normalizeArgPassword(String(body?.password ?? ""));
  } catch {
    // Malformed body counts as a wrong guess.
  }
  if (!sameText(guess, password)) return json({ solved: false, error: "wrong" }, 401);

  // onlyIfNew makes "first solve" atomic: exactly one request ever gets modified=true.
  const record: SolveRecord = { solvedAt: Date.now() };
  const { modified } = await store.setJSON(tape.slug, record, { onlyIfNew: true });
  return respond(modified ? record : await store.get(tape.slug, { type: "json" }), { firstSolve: modified });
};

export const config = { path: "/api/footage/:slug" };
