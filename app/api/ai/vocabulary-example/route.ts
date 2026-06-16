import { sanitizeText, enforceRateLimit } from "@/lib/security";

export async function POST(req: Request) {
  const rateLimit = enforceRateLimit(req, "/api/ai/vocabulary-example", 20, 60_000);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter ?? 60) },
    });
  }

  const { word, partOfSpeech, language } = await req.json();

  const safeWord = sanitizeText(word, 100);
  const safePOS = sanitizeText(partOfSpeech, 50);
  const safeLang = sanitizeText(language, 50);

  if (!safeWord || !safeLang) {
    return Response.json({ error: "Word and language are required." }, { status: 400 });
  }

  const prompt = `Generate one short, natural example sentence in ${safeLang} using the ${safePOS || "word"} "${safeWord}". The sentence should be beginner-friendly (under 12 words).

Respond with ONLY valid JSON in this exact format, no extra text:
{"sentence": "the sentence in ${safeLang}", "translation": "English translation of the sentence"}`;

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
        max_tokens: 120,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq vocabulary-example error:", JSON.stringify(data));
      return Response.json({ error: data?.error?.message ?? "AI error" }, { status: 500 });
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
    let sentence = "";
    let translation = "";
    try {
      const parsed = JSON.parse(raw);
      sentence = sanitizeText(parsed.sentence, 300);
      translation = sanitizeText(parsed.translation, 300);
    } catch {
      sentence = raw;
    }

    if (!sentence) {
      return Response.json({ error: "Empty response from AI." }, { status: 502 });
    }

    return Response.json({ sentence, translation });
  } catch (error) {
    console.error("Vocabulary-example AI error:", error);
    return Response.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
}
