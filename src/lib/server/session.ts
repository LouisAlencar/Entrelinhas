import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Question } from "../demo";
import { AppError } from "../ai-contract";
function key(secret: string) { return createHash("sha256").update(`entrelinhas-quiz-v1:${secret}`).digest(); }
export function sealQuiz(questions: Question[], secret: string, now = Date.now()) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ questions, expires: now + 2 * 60 * 60 * 1000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openQuiz(token: unknown, secret: string, now = Date.now()): Question[] {
  try {
    if (typeof token !== "string" || token.length > 100000) throw Error();
    const packed = Buffer.from(token, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", key(secret), packed.subarray(0, 12)); cipher.setAuthTag(packed.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([cipher.update(packed.subarray(28)), cipher.final()]).toString("utf8"));
    if (value.expires <= now || !Array.isArray(value.questions)) throw Error();
    return value.questions;
  } catch { throw new AppError(410, "SESSION_EXPIRED", "Esta prática expirou ou é inválida. Volte ao caderno e gere uma nova prática."); }
}
export function publicQuestions(questions: Question[]) { return questions.map(q => ({ ...q, correct: -1, explanation: "", evidence: "" })); }
