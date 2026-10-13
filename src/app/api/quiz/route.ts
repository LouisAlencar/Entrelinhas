import { AppError } from "@/lib/ai-contract";
import { openQuiz } from "@/lib/server/session";
import { failure, json, readJson } from "@/lib/server/http";
import { grade } from "@/lib/demo";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const value = await readJson(request);
    if (!process.env.GEMINI_API_KEY) throw new AppError(503, "AI_NOT_CONFIGURED", "A IA não está configurada neste ambiente.");
    const questions = openQuiz(value?.token, process.env.GEMINI_API_KEY);
    if (value.action === "answer") {
      const question = questions.find(q => q.id === value.questionId);
      if (!question || !Number.isInteger(value.answer) || value.answer < 0 || value.answer > 3) throw new AppError(400, "INVALID_ANSWER", "Selecione uma alternativa válida.");
      return json({ question });
    }
    if (value.action !== "finish" || !value.answers || questions.some(q => !Number.isInteger(value.answers[q.id]) || value.answers[q.id] < 0 || value.answers[q.id] > 3)) throw new AppError(400, "INCOMPLETE_ANSWERS", "Responda todas as questões antes de concluir.");
    return json({ questions, score: grade(questions, value.answers) });
  } catch (error) { return failure(error); }
}
