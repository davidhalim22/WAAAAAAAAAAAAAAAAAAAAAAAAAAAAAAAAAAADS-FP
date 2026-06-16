// app/api/debug/env-check/route.ts
// TEMPORARY DIAGNOSTIC — DELETE AFTER USE. Never commit this to main.
export async function GET() {
  const key = process.env.GROQ_API_KEY;

  const diagnosis = {
    // Does the variable exist at all?
    keyPresent: typeof key !== "undefined",
    // Is it a non-empty string?
    keyNonEmpty: typeof key === "string" && key.length > 0,
    // Show only the first 8 chars to confirm the value loaded (not a leak)
    keyPrefix: key ? `${key.substring(0, 8)}...` : null,
    // Reveal hidden whitespace corruption — the real bug
    keyLength: key?.length ?? 0,
    // Check for leading/trailing whitespace from heredoc corruption
    hasLeadingSpace: key ? key !== key.trimStart() : false,
    hasTrailingSpace: key ? key !== key.trimEnd() : false,
    // Full env var name check (in case the name itself was corrupted)
    rawKeyName: Object.keys(process.env).filter(k => k.includes("GROQ")),
    nodeEnv: process.env.NODE_ENV,
  };

  return Response.json(diagnosis, { status: 200 });
}