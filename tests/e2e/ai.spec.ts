import { test, expect } from "@playwright/test";
import { samplePdf, sampleText } from "../fixtures/pdf";
const questions = Array.from({ length: 3 }, (_, i) => ({ id: `ai-${i}`, prompt: `Pergunta gerada ${i + 1}?`, options: ["ATP", "DNA", "RNA", "Amido"], correct: 0, explanation: "As mitocondrias produzem ATP.", evidence: sampleText.slice(0, 63), page: 1, topic: "Biologia", source: "biologia.pdf" }));
test("PDF real, consentimento, geração e correção pelo servidor", async ({ page }) => {
  await page.route("**/api/generate", async route => {
    const input = route.request().postDataJSON();
    expect(input.document.pages[0].text).toContain("mitocondrias"); expect(input.consent).toBe(true);
    await route.fulfill({ json: { token: "test-token", questions: questions.map(q => ({ ...q, correct: -1, explanation: "", evidence: "" })) } });
  });
  await page.route("**/api/quiz", async route => {
    const input = route.request().postDataJSON(); expect(input.token).toBe("test-token");
    await route.fulfill({ json: input.action === "answer" ? { question: questions.find(q => q.id === input.questionId) } : { questions, score: 3 } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Novo caderno" }).click();
  await page.getByLabel("Nome do caderno").fill("Biologia com IA");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "biologia.pdf", mimeType: "application/pdf", buffer: samplePdf() });
  await expect(page.getByRole("button", { name: "Gerar do meu PDF" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Gerar do meu PDF" })).toBeDisabled();
  await page.getByRole("combobox", { name: /Quantidade/ }).selectOption("3");
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check();
  await page.screenshot({ path: "test-results/ai-ready.png", fullPage: true });
  await page.getByRole("button", { name: "Gerar do meu PDF" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Confirmar resposta" }).click();
    await expect(page.locator(".answer-feedback")).toContainText("ATP");
    if (!i) {
      await page.getByRole("button", { name: "Ver trecho da fonte" }).click();
      await expect(page.getByRole("dialog")).toContainText("biologia.pdf · página 1");
      await page.getByRole("button", { name: "Voltar à questão" }).click();
    }
    await page.getByRole("button", { name: i === 2 ? "Ver meu resultado" : "Próxima questão" }).click();
  }
  await expect(page.locator(".result-stats")).toContainText("3/3");
  await page.getByRole("button", { name: "Histórico de estudo" }).click();
  await expect(page.locator(".history-card")).toContainText("gerado por IA");
});
test("erro de cota mantém o PDF disponível e não inicia um quiz falso", async ({ page }) => {
  await page.route("**/api/generate", route => route.fulfill({ status: 429, json: { error: "Cota atingida. Tente mais tarde." } }));
  await page.goto("/"); await page.getByRole("button", { name: "Experimentar um caderno" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "biologia.pdf", mimeType: "application/pdf", buffer: samplePdf() });
  await page.getByRole("checkbox", { name: /Autorizo enviar/ }).check({ timeout: 15000 });
  await page.getByRole("button", { name: "Gerar do meu PDF" }).click();
  await expect(page.locator(".ai-panel [role=alert]")).toContainText("Cota atingida");
  await expect(page.getByRole("button", { name: "Gerar do meu PDF" })).toBeEnabled();
  await expect(page.locator(".question-panel")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Experimentar um caderno" }).click();
  await expect(page.getByText("selecione novamente para ler", { exact: false })).toBeVisible();
});
