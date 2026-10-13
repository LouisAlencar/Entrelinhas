# Entrelinhas

Uma plataforma de estudos que transforma materiais em prática. **Esta primeira entrega é uma demonstração local e navegável, sem IA ou backend.**

## Executar

Requisitos: Node.js 20.9 ou superior e pnpm.

```sh
pnpm install
pnpm dev
```

Abra http://127.0.0.1:3000. Para compilar: `pnpm build`. Para executar a compilação: `pnpm start`.

Neste computador, com as dependências já instaladas, também é possível executar no PowerShell:

```powershell
& 'E:\roadmapAI\entrelinhas\Start-Entrelinhas.ps1'
```

O script usa pnpm no PATH ou o runtime fornecido pelo Codex. Mantenha o terminal aberto enquanto usa o site; Ctrl+C encerra a prévia.

## O que funciona

- Biblioteca com busca e três cadernos demonstrativos com conteúdo autoral.
- Criação de cadernos pessoais, persistidos no navegador.
- Seleção de PDFs por clique ou arrastar, com validação de extensão, tamanho, assinatura inicial e duplicação. A assinatura não representa validação completa do PDF.
- Prática com 3 ou 5 questões: estudo com correção imediata ou simulado com correção ao final.
- Explicações, trechos de referência, download dos guias em TXT, revisão de erros e histórico.
- Layout responsivo, alternativas acessíveis por teclado, diálogos com gestão de foco e respeito à redução de movimento.

## Limites honestos da demonstração

Não há login, upload ao servidor, leitura do conteúdo de PDFs, OCR, geração por IA ou banco remoto. Arquivos selecionados **não são persistidos**: apenas nome, tamanho e associação ao caderno ficam em `localStorage`. Os exercícios vêm de `src/lib/demo.ts`, nunca dos arquivos selecionados. Referências apontam a seções dos guias demonstrativos, não a páginas de PDFs. Dados locais são limitados a este navegador; apagá-los remove cadernos e histórico. Uma prática incompleta não é persistida. Resultados demonstrativos não medem domínio real de uma matéria.

Os gabaritos estão no cliente nesta versão demonstrativa. Antes de disponibilizar simulados reais, transferir correção, autorização e liberação de gabaritos para o servidor.

## Arquitetura

- Next.js App Router + React + TypeScript.
- Tailwind CSS e estilos próprios com tokens de cor.
- Componentes Button e Dialog com padrão shadcn/ui, Radix, CVA e Lucide.
- `src/components/study-app.tsx`: fluxo interativo e persistência local.
- `src/lib/demo.ts`: conteúdo de exemplo, validação básica e correção.
- Sem fontes, imagens ou APIs externas em tempo de execução.

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm build
# Com o servidor iniciado em outra janela e Microsoft Edge instalado:
pnpm test:e2e
```

Testes E2E cobrem prática, fontes, histórico, criação de caderno, validação de arquivo, simulado, navegação mobile e ausência de erros JS. As capturas ficam em `test-results/`. A configuração usa Edge para aproveitar o navegador do Windows; altere `channel` caso seu ambiente exija outro navegador.

## Próximas entregas

1. Extração de PDFs textuais preservando referências, com limite de páginas e tokens.
2. API Gemini exclusivamente no servidor, saída estruturada, evidências e validação de questões.
3. Supabase Auth, PostgreSQL e Storage privado, com políticas por usuário.
4. Limites globais e por usuário, tratamento de indisponibilidade e modo demo permanente.
5. Avaliação com materiais reais e publicação no Vercel Hobby, dentro das condições vigentes.

Não é necessária chave de API para executar esta demonstração. Não inclua segredos no código ou em variáveis `NEXT_PUBLIC_*`.
