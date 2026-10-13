"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock3, FileText, FolderOpen, GraduationCap, History, LayoutGrid, Leaf, Lightbulb, Menu, MoreHorizontal, Plus, Search, Shapes, Sparkles, Target, Trash2, UploadCloud, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { grade, notebooks, validateFile, type Attempt, type LocalFile, type Notebook, type Question } from "@/lib/demo";

type View = "library" | "notebook" | "quiz" | "result" | "history";
type Stored = { custom: Notebook[]; files: LocalFile[]; attempts: Attempt[] };
const STORAGE_KEY = "entrelinhas-demo-v1";
const initial: Stored = { custom: [], files: [], attempts: [] };
function NotebookIcon({ type, size = 25 }: { type: Notebook["icon"]; size?: number }) {
  return type === "leaf" ? <Leaf size={size} /> : type === "design" ? <Shapes size={size} /> : <History size={size} />;
}
function readStored(): Stored {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value || !Array.isArray(value.custom) || !Array.isArray(value.files) || !Array.isArray(value.attempts)) return initial;
    return {
      custom: value.custom.filter((n: Notebook) => n && typeof n.id === "string" && typeof n.title === "string" && typeof n.subject === "string" && Array.isArray(n.questions) && n.questions.length === 0 && ["sage", "peach", "lavender"].includes(n.color)),
      files: value.files.filter((f: LocalFile) => f && typeof f.id === "string" && typeof f.name === "string" && typeof f.notebookId === "string" && typeof f.size === "number"),
      attempts: value.attempts.filter((a: Attempt) => a && typeof a.id === "string" && typeof a.title === "string" && typeof a.date === "string" && Number.isFinite(a.score) && Number.isFinite(a.total) && a.total > 0 && a.score >= 0 && a.score <= a.total),
    };
  } catch { return initial; }
}

export function StudyApp() {
  const [view, setView] = useState<View>("library");
  const [store, setStore] = useState<Stored>(initial);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("biologia");
  const [createOpen, setCreateOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [notice, setNotice] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Question | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [pendingView, setPendingView] = useState<View>("library");
  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { setStore(readStored()); setReady(true); }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { setNotice("O navegador não permitiu salvar. Seus dados ficam disponíveis só nesta sessão."); } }
  }, [store, ready]);
  useEffect(() => { mainRef.current?.focus(); window.scrollTo({ top: 0, behavior: "instant" }); }, [view]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(timer); }, [notice]);

  const all = [...notebooks, ...store.custom];
  const active = all.find(n => n.id === activeId) || notebooks[0];
  const files = store.files.filter(f => f.notebookId === active.id);
  const current = questions[index];
  const totalAnswers = store.attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = store.attempts.reduce((s, a) => s + a.score, 0);
  const filtered = all.filter(n => `${n.title} ${n.subject}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  function navigate(next: View) {
    setMobileMenu(false);
    if (view === "quiz" && next !== "quiz") { setPendingView(next); setExitOpen(true); return; }
    setView(next);
  }
  function openNotebook(n: Notebook) { setActiveId(n.id); setFileError(""); setView("notebook"); }
  function createNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const book: Notebook = { id: crypto.randomUUID(), title: title.trim(), subject: subject.trim() || "MEUS ESTUDOS", description: "Um novo espaço para as suas descobertas.", color: "sage", icon: "leaf", source: "", questions: [] };
    setStore(s => ({ ...s, custom: [...s.custom, book] })); setCreateOpen(false); setTitle(""); setSubject(""); openNotebook(book); setNotice("Caderno criado neste navegador.");
  }
  async function addFiles(list: FileList | null) {
    if (!list) return;
    setFileError("");
    const added: LocalFile[] = []; const errors: string[] = [];
    for (const file of Array.from(list)) {
      const error = validateFile(file);
      if (error) { errors.push(`${file.name}: ${error}`); continue; }
      try {
        const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
        if (header !== "%PDF-") { errors.push(`${file.name}: o conteúdo não parece ser um PDF válido.`); continue; }
      } catch { errors.push(`Não foi possível abrir ${file.name}.`); continue; }
      if ([...files, ...added].some(f => f.name === file.name && f.size === file.size)) { errors.push(`${file.name} já foi adicionado.`); continue; }
      if (files.length + added.length >= 5) { errors.push("O limite da demonstração é 5 arquivos por caderno."); break; }
      added.push({ id: crypto.randomUUID(), notebookId: active.id, name: file.name, size: file.size });
    }
    if (added.length) { setStore(s => ({ ...s, files: [...s.files, ...added] })); setNotice("Arquivo selecionado. A demonstração salva apenas nome e tamanho, sem envio ou leitura por IA."); }
    if (errors.length) setFileError(errors.join(" "));
    if (fileRef.current) fileRef.current.value = "";
  }
  function startQuiz() {
    setQuestions(active.questions.slice(0, count)); setAnswers({}); setIndex(0); setConfirmed(false); setOnlyWrong(false); setView("quiz");
  }
  function finish() {
    const attempt: Attempt = { id: crypto.randomUUID(), notebookId: active.id, title: active.title, date: new Date().toISOString(), score: grade(questions, answers), total: questions.length };
    setStore(s => ({ ...s, attempts: [attempt, ...s.attempts].slice(0, 100) })); setView("result");
  }
  function nextQuestion() { if (index === questions.length - 1) finish(); else { setIndex(i => i + 1); setConfirmed(false); } }
  function showSource(q: Question) { setSelectedSource(q); setSourceOpen(true); }
  function downloadGuide() {
    const text = `${active.source}\nMaterial autoral de demonstração, dividido em seções de referência.\n\n${active.questions.map(q => `Seção ${q.page} — ${q.topic}\n${q.evidence}`).join("\n\n")}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `guia-${active.id}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Pular para o conteúdo</a>
    {mobileMenu && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
      <button className="brand" onClick={() => navigate("library")} aria-label="Entrelinhas, início"><span className="brand-mark"><BookOpen size={24} strokeWidth={1.6} /></span>entrelinhas<span className="brand-dot">.</span></button>
      <div className="workspace"><div className="workspace-avatar"><GraduationCap size={20} /></div><div><strong>Meu espaço de estudo</strong><span>Um pouco melhor, todo dia</span></div></div>
      <span className="nav-label">SEU APRENDIZADO</span>
      <nav aria-label="Navegação principal">
        <button className={`nav-item ${view !== "history" ? "active" : ""}`} onClick={() => navigate("library")}><LayoutGrid size={19} />Meus cadernos<span className="nav-count">{all.length}</span></button>
        <button className={`nav-item ${view === "history" ? "active" : ""}`} onClick={() => navigate("history")}><Clock3 size={19} />Histórico de estudo</button>
      </nav>
      <div className="sidebar-bottom"><div className="small-note"><span className="note-spark"><Sparkles size={18} /></span><strong>Conhecimento que fica.</strong><p>Leia, pratique, descubra.<br />No seu ritmo.</p><div className="note-lines"><span /><span /><span /></div></div><button className="demo-profile" onClick={() => setAboutOpen(true)}><span className="profile-avatar">V</span><span><strong>Visitante</strong><small>Explorando a demonstração</small></span><MoreHorizontal size={19} /></button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-toggle" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={22} /></button><span>Meu espaço</span><ChevronRight size={14} /><strong>{view === "history" ? "Histórico" : view === "library" ? "Meus cadernos" : active.title}</strong></div><button className="demo-badge" onClick={() => setAboutOpen(true)}><span />Modo demonstração</button></header>
      <main id="main" ref={mainRef} tabIndex={-1} className={`main-content ${view === "quiz" ? "quiz-content" : ""}`}>
        {view === "library" && <>
          <div className="page-heading"><div><p className="eyebrow">CURIOSIDADE É UM BOM COMEÇO</p><h1>Seu próximo <em>“entendi!”</em><br />começa aqui.</h1><p className="lead">Reúna seus materiais. Transforme leitura em aprendizado.</p></div><Button onClick={() => setCreateOpen(true)}><Plus size={18} />Novo caderno</Button></div>
          <section className="hero-card" aria-label="Conheça a demonstração"><div className="hero-copy"><span className="pill"><Sparkles size={13} />MENOS RELEITURA, MAIS DESCOBERTAS</span><h2>O que você lê.<br /><em>O que você aprende.</em></h2><p>Pratique com questões, entenda cada resposta<br className="desktop-break" /> e volte à fonte quando precisar.</p><Button className="hero-button" onClick={() => openNotebook(notebooks[0])}>Experimentar um caderno<ArrowRight size={17} /></Button><span className="hero-caption">Sem cadastro. No seu tempo.</span></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-star star-one">✳</span><span className="art-star star-two">✦</span><div className="paper paper-back"><div className="paper-tab" /><span className="paper-label">SUAS ANOTAÇÕES</span><div className="paper-line long" /><div className="paper-line" /><div className="paper-line short" /><div className="paper-diagram"><span /><span /><span /></div><div className="paper-line long" /><div className="paper-line" /></div><div className="paper paper-front"><span className="art-question">01 <span>UMA NOVA DESCOBERTA</span></span><strong>Conhecimento se constrói<br />uma questão de cada vez.</strong><div className="art-answer"><span />Ler com curiosidade</div><div className="art-answer chosen"><CheckCircle2 size={15} />Aprender praticando<Check size={13} /></div><div className="art-answer"><span />Conectar as ideias</div></div><div className="art-check"><Check size={25} /></div></div></section>
          <section className="stats-row" aria-label="Resumo de estudo"><div><span className="stat-icon"><BookOpen size={19} /></span><strong>{all.length}</strong><span>cadernos para explorar</span></div><div><span className="stat-icon"><CheckCircle2 size={19} /></span><strong>{totalAnswers}</strong><span>questões respondidas</span></div><div><span className="stat-icon"><Target size={19} /></span><strong>{totalAnswers ? `${Math.round(totalCorrect / totalAnswers * 100)}%` : "—"}</strong><span>de aproveitamento</span></div></section>
          <section aria-labelledby="notebooks-heading"><div className="section-toolbar"><div><h2 id="notebooks-heading">Meus cadernos <span>{all.length.toString().padStart(2, "0")}</span></h2><p>Um lugar para cada nova descoberta.</p></div><label className="search-field"><Search size={17} /><span className="sr-only">Buscar cadernos</span><input placeholder="Buscar cadernos..." value={query} onChange={e => setQuery(e.target.value)} /></label></div><div className="notebook-grid">{filtered.map(n => <button key={n.id} className={`notebook-card ${n.color}`} onClick={() => openNotebook(n)}><div className="notebook-card-top"><span className="notebook-icon"><NotebookIcon type={n.icon} /></span><span className="card-arrow"><ArrowRight size={19} /></span></div><span className="card-subject">{n.subject}</span><h3>{n.title}</h3><p>{n.description}</p><div className="card-footer"><span><FileText size={14} />{n.questions.length ? "1 guia de exemplo" : `${store.files.filter(f => f.notebookId === n.id).length} arquivos selecionados`}</span><span className="tiny-badge">{n.questions.length ? "EXEMPLO" : "PESSOAL"}</span></div></button>)}</div>{!filtered.length && <div className="empty-state"><Search size={30} /><h3>Nenhum caderno encontrado</h3><p>Tente outro nome ou crie um caderno para esse assunto.</p><Button variant="outline" onClick={() => setQuery("")}>Limpar busca</Button></div>}</section>
          <footer className="page-footer"><span><Leaf size={15} />Aprender é um hábito. Cultive o seu.</span><button onClick={() => setAboutOpen(true)}>Sobre a demonstração<ArrowRight size={13} /></button></footer>
        </>}

        {view === "notebook" && <>
          <button className="back-link" onClick={() => navigate("library")}><ArrowLeft size={16} />Todos os cadernos</button><div className="detail-heading"><span className={`detail-icon ${active.color}`}><NotebookIcon type={active.icon} size={30} /></span><div><p className="eyebrow">{active.subject}</p><h1>{active.title}</h1><p className="lead">{active.description}</p></div></div>
          <div className="detail-grid"><section className="panel materials"><div className="panel-title"><h2>Seus materiais</h2><span className="count-badge">{files.length + (active.questions.length ? 1 : 0)}</span></div><p className="muted">O ponto de partida para as suas próximas descobertas.</p>
            {active.questions.length > 0 && <div className="source-file"><span className="file-icon"><FileText size={23} /></span><div><strong>{active.source}</strong><span>5 seções · texto autoral de demonstração</span></div><button className="icon-button" onClick={downloadGuide} aria-label="Baixar guia de exemplo"><ArrowDownToLine size={18} /></button></div>}
            {files.map(f => <div className="source-file" key={f.id}><span className="file-icon neutral"><FileText size={22} /></span><div><strong>{f.name}</strong><span>{Math.max(1, Math.round(f.size / 1024))} KB · apenas selecionado, não processado</span></div><button className="icon-button" aria-label={`Remover ${f.name}`} onClick={() => setStore(s => ({ ...s, files: s.files.filter(item => item.id !== f.id) }))}><Trash2 size={17} /></button></div>)}
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" tabIndex={-1} onChange={e => void addFiles(e.target.files)} aria-label="Selecionar arquivos PDF" />
            <button className={`dropzone ${dragging ? "dragging" : ""}`} onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}><span className="upload-icon"><UploadCloud size={26} /></span><strong>Arraste seu PDF até aqui</strong><span>ou clique para selecionar um arquivo</span><small>PDF · até 5 MB · máximo de 5 arquivos</small></button>
            {fileError && <p className="error-message" role="alert">{fileError}</p>}
            <div className="info-note"><Lightbulb size={18} /><p><strong>Uma prévia do que vem por aí.</strong> Nesta versão, salvamos só o nome e o tamanho do PDF neste navegador. O arquivo não é enviado, lido ou usado nas questões.</p></div>
          </section><section className="panel practice-panel"><span className="eyebrow"><Sparkles size={14} />HORA DE PRATICAR</span><h2>Transforme curiosidade<br />em conhecimento.</h2><p className="muted">{active.questions.length ? "Experimente as questões prontas do guia demonstrativo deste caderno." : "Seu caderno está pronto para receber materiais. A geração por IA será conectada na próxima etapa."}</p>
            {active.questions.length > 0 ? <><fieldset className="form-group"><legend>Quantidade de questões</legend><div className="segmented">{[3, 5].map(value => <button key={value} aria-pressed={count === value} className={count === value ? "selected" : ""} onClick={() => setCount(value)}>{value} questões</button>)}</div></fieldset><fieldset className="form-group"><legend>Como você quer estudar?</legend><button className={`mode-option ${mode === "study" ? "selected" : ""}`} aria-pressed={mode === "study"} onClick={() => setMode("study")}><Lightbulb size={19} /><span><strong>Aprender no caminho</strong><small>Correção depois de cada resposta</small></span><span className="radio-dot" /></button><button className={`mode-option ${mode === "exam" ? "selected" : ""}`} aria-pressed={mode === "exam"} onClick={() => setMode("exam")}><Target size={19} /><span><strong>Testar meu conhecimento</strong><small>Resultado e explicações ao final</small></span><span className="radio-dot" /></button></fieldset><Button className="full-width" onClick={startQuiz}>Começar demonstração<ArrowRight size={17} /></Button><p className="microcopy">Questões prontas · sem uso de IA ou consumo de API</p></> : <Button className="full-width" variant="outline" onClick={() => openNotebook(notebooks[0])}>Experimentar um caderno de exemplo<ArrowRight size={16} /></Button>}
          </section></div>
        </>}

        {view === "quiz" && current && <>
          <div className="quiz-top"><button className="back-link" onClick={() => navigate("notebook")}><ArrowLeft size={16} />Sair da prática</button><span className="tiny-badge">{mode === "study" ? "MODO ESTUDO" : "MODO SIMULADO"} · EXEMPLO</span></div><div className="quiz-progress-label"><span>Questão <strong>{index + 1}</strong> de {questions.length}</span><span>{Math.round(index / questions.length * 100)}% concluído</span></div><div className="progress-track"><span style={{ width: `${index / questions.length * 100}%` }} /></div>
          <section className="question-panel" aria-labelledby="question-title"><div className="question-meta"><span>{current.topic}</span><span><BookOpen size={14} />{active.title}</span></div><h1 id="question-title">{current.prompt}</h1><p className="question-hint">Selecione uma alternativa.</p><fieldset className="answers"><legend className="sr-only">Alternativas</legend>{current.options.map((option, i) => {
            const reveal = confirmed && mode === "study"; const isSelected = answers[current.id] === i;
            return <label key={option} className={`answer ${isSelected ? "is-selected" : ""} ${reveal && i === current.correct ? "is-correct" : ""} ${reveal && isSelected && i !== current.correct ? "is-wrong" : ""} ${confirmed ? "is-locked" : ""}`}><input type="radio" name={current.id} value={i} checked={isSelected} disabled={confirmed} onChange={() => setAnswers(a => ({ ...a, [current.id]: i }))} /><span className="answer-letter">{"ABCD"[i]}</span><span>{option}</span>{reveal && i === current.correct ? <CheckCircle2 size={20} /> : reveal && isSelected ? <XCircle size={20} /> : <span className="answer-circle" />}</label>;
          })}</fieldset>
          {confirmed && mode === "study" && <div className={`answer-feedback ${answers[current.id] === current.correct ? "positive" : "negative"}`} role="status"><strong>{answers[current.id] === current.correct ? "Isso mesmo. Mais uma conexão feita!" : "Faz parte do caminho. Vamos entender?"}</strong><p>{current.explanation}</p><button className="text-link" onClick={() => showSource(current)}><BookOpen size={15} />Ver trecho da fonte<ArrowRight size={14} /></button></div>}
          <div className="question-bottom"><span><Lightbulb size={16} />{confirmed ? "Cada resposta é uma oportunidade de aprender." : "Não é uma corrida. Pense com calma."}</span>{!confirmed ? <Button disabled={answers[current.id] === undefined} onClick={() => { if (mode === "exam") nextQuestion(); else setConfirmed(true); }}>{mode === "exam" ? index === questions.length - 1 ? "Concluir simulado" : "Próxima questão" : "Confirmar resposta"}<ArrowRight size={16} /></Button> : <Button onClick={nextQuestion}>{index === questions.length - 1 ? "Ver meu resultado" : "Próxima questão"}<ArrowRight size={16} /></Button>}</div></section><p className="quiz-footnote">Questões demonstrativas baseadas no guia de exemplo. Seus PDFs não são utilizados.</p>
        </>}

        {view === "result" && <>
          <button className="back-link" onClick={() => navigate("notebook")}><ArrowLeft size={16} />Voltar ao caderno</button><section className="result-hero"><span className="result-spark"><Sparkles size={25} /></span><p className="eyebrow">UM PASSO A MAIS NO SEU APRENDIZADO</p><h1>Você fez novas <em>conexões.</em></h1><p className="lead">{active.title} · prática demonstrativa concluída</p><div className="result-stats"><div><strong>{grade(questions, answers)}<small>/{questions.length}</small></strong><span>respostas corretas</span></div><div><strong>{Math.round(grade(questions, answers) / questions.length * 100)}<small>%</small></strong><span>de aproveitamento</span></div><div><strong>{questions.length}</strong><span>ideias revisitadas</span></div></div><div className="result-actions"><Button onClick={startQuiz}>Praticar novamente<ArrowRight size={16} /></Button><Button variant="outline" onClick={() => navigate("library")}>Explorar cadernos</Button></div></section>
          <div className="section-toolbar review-toolbar"><div><h2>Aprenda com cada resposta</h2><p>Revisite as explicações e conecte os pontos.</p></div><label className="check-filter"><input type="checkbox" checked={onlyWrong} onChange={e => setOnlyWrong(e.target.checked)} />Só as que errei</label></div><div className="review-list">{questions.filter(q => !onlyWrong || answers[q.id] !== q.correct).map(q => <article className="review-card" key={q.id}><div className={`review-status ${answers[q.id] === q.correct ? "correct" : "wrong"}`}>{answers[q.id] === q.correct ? <Check size={19} /> : <X size={19} />}</div><div><span className="eyebrow">{q.topic}</span><h3>{q.prompt}</h3><p className={answers[q.id] === q.correct ? "correct-text" : "wrong-text"}>Sua resposta: {q.options[answers[q.id]]}</p>{answers[q.id] !== q.correct && <p className="correct-text">Resposta correta: {q.options[q.correct]}</p>}<p>{q.explanation}</p><button className="text-link" onClick={() => showSource(q)}><BookOpen size={15} />Consultar fonte · seção {q.page}<ArrowRight size={14} /></button></div></article>)}</div>{onlyWrong && grade(questions, answers) === questions.length && <div className="empty-state"><CheckCircle2 size={32} /><h3>Todas as conexões feitas!</h3><p>Você acertou todas as questões desta prática.</p></div>}
        </>}

        {view === "history" && <><div className="page-heading"><div><p className="eyebrow">CADA PASSO CONTA</p><h1>Seu caminho <em>até aqui.</em></h1><p className="lead">Práticas concluídas e pequenas conquistas.</p></div></div>{store.attempts.length ? <div className="history-list">{store.attempts.map(a => <article className="history-card" key={a.id}><span className="history-icon"><CheckCircle2 size={22} /></span><div><h3>{a.title}</h3><p>{new Date(a.date).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · demonstração</p></div><div className="history-score"><strong>{a.score}/{a.total}</strong><span>acertos</span></div><Button variant="ghost" size="sm" onClick={() => openNotebook(all.find(n => n.id === a.notebookId) || notebooks[0])}>Praticar<ArrowRight size={15} /></Button></article>)}</div> : <div className="empty-state history-empty"><Clock3 size={38} /><h2>Todo caminho tem um começo.</h2><p>Conclua sua primeira prática para acompanhar seu aprendizado aqui.</p><Button onClick={() => openNotebook(notebooks[0])}>Começar minha primeira prática<ArrowRight size={16} /></Button></div>}<p className="microcopy">Histórico salvo apenas neste navegador. Não há conta ou sincronização nesta versão.</p></>}
      </main>
    </div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen} title="Uma nova descoberta começa aqui." description="Dê um nome ao seu caderno e organize seu próximo assunto."><form onSubmit={createNotebook} className="create-form"><label>Nome do caderno<input autoFocus required maxLength={60} placeholder="Ex.: Fundamentos de programação" value={title} onChange={e => setTitle(e.target.value)} /></label><label>Área de estudo <span>(opcional)</span><input maxLength={35} placeholder="Ex.: Tecnologia" value={subject} onChange={e => setSubject(e.target.value)} /></label><p className="microcopy">Salvo neste navegador. A geração de questões por IA ainda não está conectada.</p><Button type="submit" disabled={!title.trim()} className="full-width"><Plus size={16} />Criar caderno</Button></form></Dialog>
    <Dialog open={aboutOpen} onOpenChange={setAboutOpen} title="Aprender entre as linhas." description="Entrelinhas é um projeto de portfólio em construção."><div className="about-content"><p>Esta é uma demonstração interativa: você pode explorar três guias autorais, responder questões prontas, consultar os trechos de referência e acompanhar seu histórico.</p><div className="info-note"><Lightbulb size={20} /><p>Não há IA, login ou envio de arquivos nesta etapa. Cadernos, nomes de arquivos e resultados ficam apenas no armazenamento local do seu navegador.</p></div><p>Próximos passos: leitura de PDFs, geração fundamentada por IA e conta com materiais privados.</p><Button className="full-width" onClick={() => setAboutOpen(false)}>Vamos explorar<ArrowRight size={16} /></Button></div></Dialog>
    <Dialog open={sourceOpen} onOpenChange={setSourceOpen} title="Volte à fonte." description={`${active.source} · seção ${selectedSource?.page ?? ""}`}><div className="source-content"><span className="eyebrow">{selectedSource?.topic}</span><blockquote>{selectedSource?.evidence}</blockquote><p className="microcopy">Trecho do guia autoral de exemplo. Esta referência não pertence a um PDF enviado.</p><Button variant="outline" onClick={() => setSourceOpen(false)}>Voltar à questão</Button></div></Dialog>
    <Dialog open={exitOpen} onOpenChange={setExitOpen} title="Sair desta prática?" description="As respostas desta sessão não serão salvas no histórico até você concluir."><div className="dialog-actions"><Button variant="outline" onClick={() => setExitOpen(false)}>Continuar estudando</Button><Button onClick={() => { setExitOpen(false); setView(pendingView); }}>Sair da prática</Button></div></Dialog>
    {notice && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fechar aviso"><X size={17} /></button></div>}
  </div>;
}
