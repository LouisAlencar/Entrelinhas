import { test } from "node:test";
import assert from "node:assert/strict";
import { grade, notebooks, validateFile } from "../src/lib/demo";

test("cada questão tem opções distintas, gabarito válido e evidência própria", () => {
  const ids = new Set<string>();
  for (const notebook of notebooks) for (const q of notebook.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(q.evidence.length > 40 && q.explanation.length > 40);
    assert.ok(!ids.has(q.id)); ids.add(q.id);
  }
});
test("correção usa IDs e não conta respostas ausentes", () => {
  const questions = notebooks[0].questions;
  assert.equal(grade(questions, {}), 0);
  assert.equal(grade([...questions].reverse(), Object.fromEntries(questions.map(q => [q.id, q.correct]))), 5);
  assert.equal(grade(questions, { [questions[0].id]: questions[0].correct, [questions[1].id]: 0 }), 1);
});
test("validação recusa arquivo vazio, extensão errada e tamanho excessivo", () => {
  assert.ok(validateFile({ name: "arquivo.exe", size: 100 }));
  assert.ok(validateFile({ name: "arquivo.pdf", size: 0 }));
  assert.ok(validateFile({ name: "arquivo.pdf", size: 5 * 1024 * 1024 + 1 }));
  assert.equal(validateFile({ name: "Apostila.PDF", size: 5 * 1024 * 1024 }), null);
});
