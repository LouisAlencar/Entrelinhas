import { test, expect } from "@playwright/test";
import { samplePdf } from "../fixtures/pdf";

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("prática completa, fontes, revisão e persistência do histórico", async ({ page }) => {
  await page.getByRole("button", { name: "Experimentar um caderno" }).click();
  await page.getByRole("button", { name: "3 questões", exact: true }).click();
  await page.screenshot({ path: "test-results/notebook.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Começar demonstração" }).click();
  await expect(page.getByRole("button", { name: "Confirmar resposta" })).toBeDisabled();
  await page.getByRole("radio", { name: /Mitocôndria/ }).check();
  await page.getByRole("button", { name: "Confirmar resposta" }).click();
  await page.screenshot({ path: "test-results/question.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Ver trecho da fonte" }).click();
  await expect(page.getByRole("dialog")).toContainText("fosforilação oxidativa");
  await page.getByRole("button", { name: "Voltar à questão" }).click();
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar resposta" }).click();
  await expect(page.getByRole("status")).toContainText("Vamos entender");
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Confirmar resposta" }).click();
  await page.getByRole("button", { name: "Ver meu resultado" }).click();
  await expect(page.locator(".result-stats")).toContainText("2/3");
  await page.screenshot({ path: "test-results/result.png", fullPage: true, animations: "disabled" });
  await page.getByLabel("Só as que errei").check();
  await expect(page.locator(".review-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Histórico de estudo" }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await expect(page.locator(".history-score")).toContainText("2/3");
});

test("caderno, PDF inválido, seleção válida e remoção", async ({ page }) => {
  await page.getByRole("button", { name: "Novo caderno" }).click();
  await page.getByLabel("Nome do caderno").fill("Minha apostila");
  await page.getByLabel("Área de estudo").fill("Programação");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minha apostila" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "invalido.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
  await expect(page.locator(".error-message")).toContainText("não parece ser um PDF válido");
  await page.locator('input[type="file"]').setInputFiles({ name: "exemplo.pdf", mimeType: "application/pdf", buffer: samplePdf() });
  await expect(page.getByText("páginas prontas", { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Remover exemplo.pdf" }).click();
  await expect(page.locator(".source-file")).toHaveCount(0);
  await page.reload();
  await page.getByRole("textbox", { name: "Buscar cadernos" }).fill("Minha apostila");
  await expect(page.locator(".notebook-card")).toHaveCount(1);
});

test("simulado não mostra correção durante a tentativa e confirma saída", async ({ page }) => {
  await page.getByRole("button", { name: "Experimentar um caderno" }).click();
  await page.getByRole("button", { name: "3 questões", exact: true }).click();
  await page.getByRole("button", { name: "Testar meu conhecimento", exact: false }).click();
  await page.getByRole("button", { name: "Começar demonstração" }).click();
  await page.getByRole("button", { name: "Sair da prática", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuar estudando" }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("radio").first().check();
    await expect(page.locator(".answer-feedback")).toHaveCount(0);
    await page.getByRole("button", { name: i === 2 ? "Concluir simulado" : "Próxima questão" }).click();
  }
  await expect(page.locator(".review-card")).toHaveCount(3);
});

test("celular: layout sem overflow, menu e busca vazia", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: /Seu próximo/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Histórico de estudo" }).click();
  await expect(page.getByRole("heading", { name: "Todo caminho tem um começo." })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: /Meus cadernos/ }).click();
  await page.getByRole("textbox", { name: "Buscar cadernos" }).fill("zzznãoexiste");
  await expect(page.getByRole("heading", { name: "Nenhum caderno encontrado" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await page.getByRole("heading", { name: /Seu próximo/ }).click();
  await page.screenshot({ path: "test-results/mobile-library.png", fullPage: true, animations: "disabled" });
});

test("desktop: captura da biblioteca e ausência de erros de execução", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.reload();
  await expect(page.locator(".notebook-card")).toHaveCount(3);
  await page.screenshot({ path: "test-results/desktop-library.png", fullPage: true, animations: "disabled" });
  expect(errors).toEqual([]);
});
