export const sampleText = "As mitocondrias participam da respiracao celular e produzem ATP. Os ribossomos realizam a sintese de proteinas. A membrana plasmatica regula a passagem de substancias. O nucleo armazena o material genetico das celulas eucarioticas. Os lisossomos participam da digestao intracelular. A osmose e o movimento de agua atraves de uma membrana seletivamente permeavel. O complexo golgiense modifica e distribui moleculas.";
export function samplePdf(text = sampleText) {
  const lines = text.match(/.{1,85}(?:\s|$)/g) || [text];
  const stream = "BT /F1 12 Tf 50 740 Td " + lines.map((line, i) => `${i ? "0 -18 Td " : ""}(${line.replace(/[()\\]/g, "\\$&")}) Tj`).join("\n") + " ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
