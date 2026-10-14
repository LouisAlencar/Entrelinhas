import { AppError, parseGenerationInput } from "@/lib/ai-contract";
import { generateQuestions } from "@/lib/server/gemini";
import { reserveGeneration } from "@/lib/server/quota";
import { publicQuestions, sealQuiz } from "@/lib/server/session";
import { failure, json, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { document, count } = parseGenerationInput(await readJson(request));
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AppError(503, "AI_NOT_CONFIGURED", "A IA ainda não está configurada neste ambiente. Experimente os cadernos de exemplo.");
    await reserveGeneration(request.headers);
    const questions = await generateQuestions(document, count, key, process.env.GEMINI_MODEL || "gemini-3.5-flash-lite");
    return json({ questions: publicQuestions(questions), token: sealQuiz(questions, key), source: document.name });
  } catch (error) { return failure(error); }
}
