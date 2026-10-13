"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import type { SourceDocument } from "@/lib/ai-contract";
import type { Question } from "@/lib/demo";
export function AiPanel({ documents, reading, onBusy, onStart }: {
  documents: Record<string, SourceDocument>; reading: boolean; onBusy: (busy: boolean) => void;
  onStart: (questions: Question[], token: string, mode: "study" | "exam") => void;
}) {
  const [selected, setSelected] = useState(""); const [count, setCount] = useState(5);
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const keys = Object.keys(documents);
  const id = documents[selected] ? selected : keys[0];
  useEffect(() => () => controller.current?.abort(), []);
  async function generate() {
    if (controller.current || !id || !consent) return;
    controller.current = new AbortController(); const current = controller.current;
    const timeout = setTimeout(() => current.abort(), 65000);
    setBusy(true); onBusy(true); setError("");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: documents[id], count, consent }), signal: current.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar as questões.");
      onStart(result.questions, result.token, mode);
    } catch (e) {
      setError(current.signal.aborted ? "A espera foi encerrada. A tentativa pode ter consumido cota. Tente novamente mais tarde." : e instanceof Error ? e.message : "Falha de conexão. Tente novamente.");
    } finally { clearTimeout(timeout); controller.current = null; setBusy(false); onBusy(false); }
  }
  return <section className="ai-panel" aria-labelledby="ai-panel-heading"><span className="eyebrow"><Sparkles size={14} />SEU MATERIAL, NOVAS DESCOBERTAS</span><h3 id="ai-panel-heading">Gerar questões com IA</h3><p>Selecione um PDF com texto. Vamos conferir os trechos citados antes de mostrar as questões.</p>
    {!keys.length ? <div className="ai-empty">{reading ? "Lendo o PDF…" : "Adicione um PDF ao lado para começar. Se você recarregou a página, selecione o arquivo novamente."}</div> : <>
      <label className="ai-field">Material<select value={id} disabled={busy} onChange={e => { setSelected(e.target.value); setConsent(false); }}>{keys.map(key => <option key={key} value={key}>{documents[key].name} ({documents[key].pages.length} páginas)</option>)}</select></label>
      <div className="ai-settings"><label className="ai-field">Quantidade<select value={count} disabled={busy} onChange={e => setCount(Number(e.target.value))}><option value={3}>3 questões</option><option value={5}>5 questões</option></select></label><label className="ai-field">Modo<select value={mode} disabled={busy} onChange={e => setMode(e.target.value as "study" | "exam")}><option value="study">Estudo</option><option value="exam">Simulado</option></select></label></div>
      <label className="ai-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /><span>Autorizo enviar o texto deste PDF ao Gemini para gerar as questões. Na camada gratuita, o Google pode usar os dados para melhorar seus produtos. Não envie conteúdo confidencial.</span></label>
      <Button className="full-width" disabled={busy || reading || !consent} onClick={() => void generate()}>{busy ? <><LoaderCircle size={17} className="spin" />Criando suas questões…</> : <>Gerar do meu PDF<ArrowRight size={17} /></>}</Button>
      {busy && <p className="microcopy" role="status">Pode levar até um minuto. Aguarde nesta tela.</p>}
    </>}
    {error && <p role="alert" className="error-message">{error}</p>}
    <p className="microcopy">A IA pode errar. Confira as explicações no material original.</p>
  </section>;
}
