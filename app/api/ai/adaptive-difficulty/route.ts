import { sanitizeText, sanitizeLangCode, enforceRateLimit } from "@/lib/security";

const LANG_NAMES: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  es: "Spanish",
  fr: "French",
  id: "Indonesian",
};

type Level = "beginner" | "intermediate" | "advanced";

function levelFromAverage(avg: number): Level {
  if (avg >= 80) return "advanced";
  if (avg >= 50) return "intermediate";
  return "beginner";
}

export async function POST(req: Request) {
  const rateLimit = enforceRateLimit(req, "/api/ai/adaptive-difficulty", 10, 60_000);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter ?? 60) },
    });
  }

  const { lang, recentScores } = await req.json();

  const safeLang = sanitizeLangCode(lang, Object.keys(LANG_NAMES), "en");
  const langName = LANG_NAMES[safeLang] ?? "the target language";

  const scores: number[] = Array.isArray(recentScores)
    ? recentScores.map(Number).filter((n) => !isNaN(n)).slice(0, 10)
    : [];

  if (scores.length === 0) {
    return Response.json({
      level: "beginner",
      recommendation: `Start with the beginner lessons in ${langName} to build a strong foundation.`,
    });
  }

  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const fallbackLevel = levelFromAverage(avg);

  const prompt = `A student learning ${langName} has recent quiz scores of: ${scores.join(", ")} (average ${avg}%).

Reply with exactly two lines, nothing else:
Line 1: one word — beginner, intermediate, or advanced
Line 2: one short encouraging sentence (under 20 words) of personalized advice for studying ${langName}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.5,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq adaptive-difficulty error:", JSON.stringify(data));
      return Response.json({ level: fallbackLevel, recommendation: null });
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);

    const levelWord = (lines[0] ?? "").toLowerCase();
    const level: Level = (["beginner", "intermediate", "advanced"] as const).find((l) =>
      levelWord.includes(l)
    ) ?? fallbackLevel;

    const recommendation = lines[1] ? sanitizeText(lines[1], 200) : null;

    return Response.json({ level, recommendation });
  } catch (error) {
    console.error("Adaptive-difficulty AI error:", error);
    return Response.json({ level: fallbackLevel, recommendation: null });
  }
}
