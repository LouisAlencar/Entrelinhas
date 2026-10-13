import { AppError, LIMITS } from "../ai-contract";
export async function readJson(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AppError(403, "INVALID_ORIGIN", "Origem não permitida.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError(415, "CONTENT_TYPE", "Envie dados em JSON.");
  const reader = request.body?.getReader(); if (!reader) throw new AppError(400, "EMPTY_BODY", "Requisição vazia.");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > LIMITS.requestBytes) { await reader.cancel(); throw new AppError(413, "BODY_TOO_LARGE", "O documento ultrapassa o limite de envio."); } chunks.push(value); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) { if (error instanceof AppError) throw error; throw new AppError(400, "INVALID_JSON", "Dados inválidos. Tente novamente."); }
}
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export function failure(error: unknown) { const e = error instanceof AppError ? error : new AppError(500, "INTERNAL_ERROR", "Não foi possível concluir a operação. Tente novamente."); return json({ error: e.message, code: e.code }, e.status); }
