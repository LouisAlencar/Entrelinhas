import { createHmac } from "node:crypto";
import { AppError } from "../ai-contract";
export async function reserveGeneration(headers: Headers, env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch) {
  const url = env.SUPABASE_URL; const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new AppError(503, "QUOTA_NOT_CONFIGURED", "A geração por IA aguarda a configuração dos limites de uso. Enquanto isso, experimente um caderno de exemplo.");
  const ip = env.VERCEL ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local-development";
  if (!ip) throw new AppError(503, "CLIENT_UNAVAILABLE", "Não foi possível identificar a conexão. Tente novamente.");
  const client = createHmac("sha256", secret).update(`quota:${ip}`).digest("hex");
  try {
    const response = await fetcher(`${url.replace(/\/$/, "")}/rest/v1/rpc/reserve_ai_generation`, { method: "POST", headers: { "Content-Type": "application/json", apikey: secret, Authorization: `Bearer ${secret}` }, body: JSON.stringify({ p_client_hash: client }), signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw Error();
    const allowed = await response.json();
    if (allowed === false) throw new AppError(429, "APP_QUOTA", "O limite de geração desta conexão ou do site foi atingido. Tente mais tarde. Os cadernos de exemplo continuam disponíveis.");
    if (allowed !== true) throw Error();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "QUOTA_UNAVAILABLE", "O controle de uso está indisponível. Por segurança, nenhuma chamada à IA foi feita. Tente mais tarde.");
  }
}
