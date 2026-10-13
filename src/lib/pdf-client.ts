import { LIMITS, normalizeText, type SourceDocument } from "./ai-contract";
import { validateFile } from "./demo";

export async function extractPdf(file: File, onProgress: (text: string) => void): Promise<SourceDocument> {
  const error = validateFile(file);
  if (error) throw new Error(error);
  if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") throw new Error("O conteúdo não parece ser um PDF válido.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  const timeout = setTimeout(() => { void task.destroy(); }, 30000);
  try {
    const pdf = await task.promise;
    if (pdf.numPages > LIMITS.pages) throw new Error("O limite é 20 páginas por PDF. Divida o documento em partes.");
    const pages = []; let size = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      onProgress(`Lendo página ${page} de ${pdf.numPages}…`);
      const sheet = await pdf.getPage(page);
      const content = await sheet.getTextContent();
      const text = normalizeText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      size += text.length;
      if (size > LIMITS.chars) throw new Error("O PDF ultrapassa 60 mil caracteres. Divida o documento em partes.");
      pages.push({ page, text }); sheet.cleanup();
    }
    if (size < 300) throw new Error("Texto insuficiente. PDFs escaneados precisam de OCR, ainda não disponível. Escolha um PDF com texto selecionável.");
    return { name: file.name.slice(0, 160), pages };
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new Error("Este PDF tem senha. Envie uma cópia sem proteção.");
    if (error instanceof Error && error.name === "InvalidPDFException") throw new Error("Não foi possível ler esse PDF. O arquivo pode estar corrompido.");
    throw error;
  } finally { clearTimeout(timeout); await task.destroy(); }
}
