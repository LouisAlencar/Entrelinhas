import { test } from "node:test";
import assert from "node:assert/strict";
import { AppError, parseGenerationInput } from "../src/lib/ai-contract";
import { generateQuestions, validateQuestions } from "../src/lib/server/gemini";
import { openQuiz, publicQuestions, sealQuiz } from "../src/lib/server/session";
import { reserveGeneration } from "../src/lib/server/quota";
import { readJson } from "../src/lib/server/http";
import { sampleText } from "./fixtures/pdf";
const document = { name: "biologia.pdf", pages: [{ page: 1, text: sampleText }] };
const generated = { questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Questão ${i + 1} sobre o conteúdo?`, options: ["ATP", "DNA", "RNA", "Amido"], correct: 0, explanation: "As mitocondrias produzem ATP.", evidence: "As mitocondrias participam da respiracao celular e produzem ATP.", page: 1, topic: "Biologia" })) };
const mockFetch = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as typeof fetch;
test("entrada exige consentimento, páginas sequenciais e limites de texto", () => {
  assert.equal(parseGenerationInput({ document, count: 3, consent: true }).count, 3);
  for (const bad of [{ document, count: 3 }, { document, count: 99, consent: true }, { document: { ...document, pages: [{ page: 2, text: sampleText }] }, count: 3, consent: true }, { document: { ...document, pages: [{ page: 1, text: "x".repeat(60001) }] }, count: 3, consent: true }]) assert.throws(() => parseGenerationInput(bad), AppError);
});
test("validação exige evidência literal na página certa e opções únicas", () => {
  const questions = validateQuestions(generated, document, 3);
  assert.equal(questions.length, 3); assert.equal(questions[0].source, document.name);
  for (const change of [{ evidence: "Esta referencia nao existe no documento original." }, { page: 2 }, { correct: 4 }, { options: ["ATP", "atp", "RNA", "DNA"] }, { prompt: generated.questions[1].prompt }]) {
    const bad = structuredClone(generated); Object.assign(bad.questions[0], change);
    assert.throws(() => validateQuestions(bad, document, 3), AppError);
  }
});
test("Gemini retorna perguntas validadas e traduz erros sem revelar chave", async () => {
  const result = await generateQuestions(document, 3, "test-secret", "gemini-3.5-flash-lite", mockFetch({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(generated) }] } }] }));
  assert.equal(result.length, 3);
  await assert.rejects(generateQuestions(document, 3, "test-secret", "gemini-3.5-flash-lite", mockFetch({}, 404)), (e: unknown) => e instanceof AppError && e.code === "MODEL_UNAVAILABLE");
  for (const status of [400, 403, 404, 429, 500]) await assert.rejects(generateQuestions(document, 3, "test-secret", "gemini-3.5-flash-lite", mockFetch({ error: "test-secret" }, status)), (e: unknown) => e instanceof AppError && !e.message.includes("test-secret"));
});
test("gabarito é cifrado; sessão alterada, expirada ou com chave errada falha", () => {
  const qs = validateQuestions(generated, document, 3);
  const token = sealQuiz(qs, "test-secret", 1000);
  assert.equal(openQuiz(token, "test-secret", 2000)[0].correct, 0);
  assert.equal(publicQuestions(qs)[0].correct, -1); assert.equal(publicQuestions(qs)[0].evidence, "");
  assert.throws(() => openQuiz(token, "other-secret", 2000), AppError);
  assert.throws(() => openQuiz(token, "test-secret", 1000 + 7200001), AppError);
  assert.throws(() => openQuiz("invalid" + token, "test-secret", 2000), AppError);
});
test("cota falha fechada sem configuração e ao receber resposta inválida", async () => {
  const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key", VERCEL: "1" };
  const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1" });
  await assert.rejects(reserveGeneration(headers, {}, mockFetch(true)), AppError);
  await assert.rejects(reserveGeneration(new Headers(), env, mockFetch(true)), AppError);
  await assert.rejects(reserveGeneration(headers, env, mockFetch(false)), (e: unknown) => e instanceof AppError && e.status === 429);
  await assert.rejects(reserveGeneration(headers, env, mockFetch("true")), AppError);
  await assert.rejects(reserveGeneration(headers, env, mockFetch({}, 500)), AppError);
  await reserveGeneration(headers, env, mockFetch(true));
});
test("quota envia hash de IP, nunca documento nem IP bruto", async () => {
  const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "forged" });
  await reserveGeneration(headers, { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key", VERCEL: "1" }, (async (_url, init) => {
    const body = JSON.parse(String(init?.body)); assert.match(body.p_client_hash, /^[a-f0-9]{64}$/); assert.equal(Object.keys(body).length, 1); return Response.json(true);
  }) as typeof fetch);
});
test("HTTP rejeita origem externa, JSON inválido e excesso de tamanho", async () => {
  for (const request of [new Request("https://site.test/api", { method: "POST", headers: { origin: "https://other.test", "content-type": "application/json" }, body: "{}" }), new Request("https://site.test/api", { method: "POST", headers: { "content-type": "application/json" }, body: "no" }), new Request("https://site.test/api", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(260001) })]) await assert.rejects(readJson(request), AppError);
});
