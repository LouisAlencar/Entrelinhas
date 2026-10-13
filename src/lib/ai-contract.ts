export const LIMITS = { bytes: 5 * 1024 * 1024, pages: 20, chars: 60000, requestBytes: 260000 } as const;
export type SourcePage = { page: number; text: string };
export type SourceDocument = { name: string; pages: SourcePage[] };
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function normalizeText(text: string) { return text.normalize("NFKC").replace(/\s+/g, " ").trim(); }
export function parseGenerationInput(value: unknown): { document: SourceDocument; count: number } {
  const v = value as { document?: SourceDocument; count?: number; consent?: boolean };
  if (!v || v.consent !== true) throw new AppError(400, "CONSENT_REQUIRED", "Confirme o envio do texto ao Gemini antes de gerar.");
  if (![3, 5].includes(v.count ?? 0)) throw new AppError(400, "INVALID_COUNT", "Escolha 3 ou 5 questões.");
  const d = v.document;
  if (!d || typeof d.name !== "string" || !d.name.trim() || d.name.length > 160 || !Array.isArray(d.pages) || !d.pages.length || d.pages.length > LIMITS.pages) throw new AppError(400, "INVALID_DOCUMENT", "Envie um PDF textual de até 20 páginas.");
  let size = 0;
  const pages = d.pages.map((p, i) => {
    if (!p || p.page !== i + 1 || typeof p.text !== "string") throw new AppError(400, "INVALID_PAGES", "As páginas do documento são inválidas.");
    size += p.text.length;
    if (size > LIMITS.chars) throw new AppError(413, "TEXT_TOO_LONG", "O PDF ultrapassa o limite de 60 mil caracteres. Divida-o em partes.");
    return { page: p.page, text: normalizeText(p.text) };
  });
  if (pages.reduce((n, p) => n + p.text.length, 0) < 300) throw new AppError(422, "INSUFFICIENT_TEXT", "Texto insuficiente para gerar questões. Use um PDF com texto selecionável e mais conteúdo.");
  return { document: { name: d.name.trim(), pages }, count: v.count! };
}
