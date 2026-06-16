import { sanitizeText, sanitizeLangCode, enforceRateLimit } from "@/lib/security";

const LANG_NAMES: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  es: "Spanish",
  fr: "French",
  id: "Indonesian",
};

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export async function POST(req: Request) {
  const rateLimit = enforceRateLimit(req, "/api/ai/generate-sentence", 10, 60_000);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter ?? 60) },
    });
  }

  const { topic, lang, level } = await req.json();

  const safeTopic = sanitizeText(topic, 100);
  const safeLang = sanitizeLangCode(lang, Object.keys(LANG_NAMES), "en");
  const safeLevel = (LEVELS as readonly string[]).includes(String(level))
    ? (String(level) as (typeof LEVELS)[number])
    : "beginner";

  if (!safeTopic) {
    return Response.json({ error: "Topic is required." }, { status: 400 });
  }

  const langName = LANG_NAMES[safeLang] ?? "the target language";

  const userPrompt = `Generate 3 short example sentences in ${langName} about "${safeTopic}" for a ${safeLevel} learner.

Format each line exactly like this (pipe separator):
${langName} sentence | English translation

Example format:
こんにちは。 | Hello.
元気ですか？ | How are you?
ありがとう。 | Thank you.

Output only the 3 lines, nothing else.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 300,
        temperature: 0.5,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq generate-sentence error:", JSON.stringify(data));
      return Response.json(
        { error: data?.error?.message ?? "AI error" },
        { status: 500 }
      );
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    console.log("Groq generate-sentence raw:", raw);

    const sentences = raw
      .split("\n")
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line: string) => line.includes("|"))
      .map((line: string) => {
        const pipe = line.indexOf("|");
        return {
          text: sanitizeText(line.slice(0, pipe).trim(), 300),
          translation: sanitizeText(line.slice(pipe + 1).trim(), 300),
        };
      })
      .filter((s: { text: string; translation: string }) => s.text && s.translation)
      .slice(0, 3);

    if (sentences.length === 0) {
      console.error("No sentences parsed. Raw:", raw);
      return Response.json(
        { error: "AI returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ sentences, topic: safeTopic, lang: safeLang, level: safeLevel });
  } catch (error) {
    console.error("Generate-sentence AI error:", error);
    return Response.json(
      { error: "AI service error. Please try again." },
      { status: 500 }
    );
  }
}