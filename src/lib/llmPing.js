// Minimal, side-effect-free LLM client used by the live smoke test.
// Kept out of App.jsx so tests don't have to boot React.

export function detectProvider(apiKey) {
  if (!apiKey) return null;
  const key = apiKey.trim();
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("sk-proj-") || key.startsWith("sk-")) return "openai";
  return null;
}

/**
 * Fire a minimal, cheap request at the detected provider to confirm:
 *   - the key is valid,
 *   - the network route works,
 *   - the provider responds with a parseable body.
 *
 * Uses ≤ 4 output tokens. Returns `{ provider, model, ok, latencyMs, text }`.
 * Throws on non-2xx or network failure.
 */
export async function pingLlm(
  apiKey,
  { signal, fetchImpl = globalThis.fetch } = {}
) {
  const provider = detectProvider(apiKey);
  if (!provider) {
    throw new Error(
      "Unknown API key format. Expected Anthropic (sk-ant-…) or OpenAI (sk-… / sk-proj-…)."
    );
  }

  const started = Date.now();

  if (provider === "anthropic") {
    const model = "claude-3-5-haiku-latest"; // cheapest Anthropic chat model
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4,
        messages: [{ role: "user", content: "Reply with the single word: pong" }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic ping ${res.status}: ${await safeText(res)}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    return { provider, model, ok: true, latencyMs: Date.now() - started, text };
  }

  // OpenAI
  const model = "gpt-4o-mini"; // cheapest chat-completions-compatible model
  const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4,
      temperature: 0,
      messages: [{ role: "user", content: "Reply with the single word: pong" }],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ping ${res.status}: ${await safeText(res)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { provider, model, ok: true, latencyMs: Date.now() - started, text };
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
