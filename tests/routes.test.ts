import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as generate } from "../src/app/api/generate/route";
import { POST as quiz } from "../src/app/api/quiz/route";
import { sampleText } from "./fixtures/pdf";
function request(path: string, data: unknown) { return new Request(`https://entrelinhas.test/api/${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "https://entrelinhas.test", "x-vercel-forwarded-for": "192.0.2.100" }, body: JSON.stringify(data) }); }
test("rotas completas: reserva, geração, resposta individual e resultado final", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, VERCEL: process.env.VERCEL };
  Object.assign(process.env, { GEMINI_API_KEY: "fake-test-key", SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fake-service-key", VERCEL: "1" });
  const calls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    if (String(url).includes("supabase")) return Response.json(true);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Questão ${i + 1}?`, options: ["ATP", "DNA", "RNA", "Amido"], correct: 0, topic: "Biologia", explanation: "As mitocondrias produzem ATP.", evidence: "As mitocondrias participam da respiracao celular e produzem ATP.", page: 1 })) }) }] } }] });
  }) as typeof fetch;
  try {
    const response = await generate(request("generate", { document: { name: "sample.pdf", pages: [{ page: 1, text: sampleText }] }, count: 3, consent: true }));
    assert.equal(response.status, 200);
    const result = await response.json(); assert.equal(result.questions[0].correct, -1); assert.equal(calls.length, 2);
    assert.ok(calls[0].includes("supabase")); assert.ok(!JSON.stringify(result).includes("fake-test-key"));
    const one = await quiz(request("quiz", { action: "answer", token: result.token, questionId: result.questions[0].id, answer: 0 }));
    assert.equal((await one.json()).question.correct, 0);
    const missing = await quiz(request("quiz", { action: "finish", token: result.token, answers: {} })); assert.equal(missing.status, 400);
    const final = await quiz(request("quiz", { action: "finish", token: result.token, answers: Object.fromEntries(result.questions.map((q: { id: string }) => [q.id, 0])) }));
    assert.equal((await final.json()).score, 3);
    assert.equal(calls.length, 2, "correção não faz novas chamadas à IA");
    delete process.env.SUPABASE_URL;
    const blocked = await generate(request("generate", { document: { name: "sample.pdf", pages: [{ page: 1, text: sampleText }] }, count: 3, consent: true }));
    assert.equal(blocked.status, 503); assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(originalEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
