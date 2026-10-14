# Entrelinhas

Plataforma de estudos de portfólio: leia um PDF, gere questões com Gemini e revise respostas com referências ao texto. Três cadernos demonstrativos funcionam sem API.

## Executar

Node.js compatível com as dependências (recomendado: 22.13+ ou 24) e pnpm.

```sh
pnpm install
pnpm dev
```

Abra http://127.0.0.1:3000. `pnpm build` compila; `pnpm start` executa a compilação. Os scripts `predev` e `prebuild` copiam o worker PDF.js para `public/`.

Neste computador, `Start-Entrelinhas.ps1` também encontra o runtime do Codex. Mantenha o terminal aberto durante o uso local.

## Configurar na Vercel

1. No SQL Editor do Supabase, execute [001_ai_quota.sql](supabase/migrations/001_ai_quota.sql).
2. Em Settings → Environment Variables da Vercel, configure em Production:

| Variável | Valor |
|---|---|
| `GEMINI_API_KEY` | Chave da Gemini Developer API |
| `GEMINI_MODEL` | Opcional; padrão `gemini-3.5-flash-lite` |
| `SUPABASE_URL` | URL HTTPS do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta `service_role` do Supabase |

3. Faça um novo deploy. Localmente, copie `.env.example` para `.env.local` e preencha no computador.

Nunca use `NEXT_PUBLIC_` nessas variáveis nem envie chaves ao GitHub. O modo demo não precisa delas. Disponibilidade gratuita e cotas do Gemini dependem da conta. A aplicação não ativa faturamento nem muda de provedor automaticamente.

## Fluxo

- Até 5 PDFs por caderno, cada um com até 5 MB, 20 páginas e 60 mil caracteres.
- O navegador extrai o texto; um PDF é escolhido por geração, com 3 ou 5 questões.
- O usuário autoriza o envio do texto ao Gemini. Na camada gratuita, o Google pode usar os dados para melhoria dos produtos; não envie materiais confidenciais.
- O servidor valida a entrada, reserva uma cota atômica e chama Gemini uma vez, sem retries automáticos.
- Questões exigem quatro alternativas distintas, gabarito válido, enunciado único e trecho literal presente na página citada.
- A validação confere estrutura e referência; não prova correção pedagógica ou factual. Revise o material original.
- A referência usa a posição física da página no PDF, não necessariamente a numeração impressa.
- Sem OCR ou interpretação de imagens, diagramas e fórmulas complexas. Páginas sem texto são sinalizadas.

## Cotas e segurança

A RPC SQL reserva atomicamente até **20 tentativas/dia no site, 3 por conexão/dia e 2 por minuto no site**, usando UTC. Tentativas com erro também contam. A cota do provedor pode ser inferior.

Na Vercel, a conexão é identificada pelo cabeçalho sobrescrito pela plataforma `x-vercel-forwarded-for`, convertido em HMAC. O banco não recebe texto de PDF nem IP bruto. Redes compartilhadas dividem a cota: isso não substitui autenticação de usuário. Sem configuração ou disponibilidade da RPC, nenhuma chamada ao Gemini é feita.

Gabaritos de IA ficam em token AES-256-GCM, válido por duas horas. O cliente recebe perguntas sem gabarito; a rota de correção revela uma resposta no modo estudo ou todas após receber a tentativa completa. Refazer reutiliza as perguntas, sem consumo extra de IA. Este é um produto de autoestudo, não uma prova fiscalizada: o cliente pode consultar a rota de correção.

## Persistência e privacidade

PDFs, texto e sessão de questões ficam na memória da aba. Recarregar exige selecionar o PDF novamente; práticas incompletas não são recuperadas. Cadernos, nomes/tamanhos de arquivos e resultados ficam no `localStorage`, sem login ou sincronização. O servidor não persiste documentos ou perguntas. A política de retenção do provedor continua aplicável.

## Arquitetura e testes

Next.js App Router, React, TypeScript, Tailwind, componentes no padrão shadcn/ui/Radix e PDF.js sob demanda. `POST /api/generate` gera e valida; `POST /api/quiz` corrige sem chamar IA. Supabase guarda apenas contadores de uso, protegidos por RLS; a RPC é restrita à `service_role`.

```sh
pnpm test
pnpm build
# Com servidor iniciado e Microsoft Edge instalado:
pnpm test:e2e
```

`PLAYWRIGHT_BASE_URL` permite testar outra porta. Testes cobrem validação, erros do provedor, cotas, sessões alteradas/expiradas, correção, PDFs, interface e persistência local. Os E2E usam PDF real de fixture e IA simulada para não consumir API. Capturas ficam em `test-results/`; verificação real em produção é separada.

Próximas etapas: login, sincronização, retomada de práticas, extração mais rica, avaliação pedagógica e busca em coleções maiores.
