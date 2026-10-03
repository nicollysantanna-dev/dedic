# Termos de uso e política de privacidade — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** páginas públicas `/termos` e `/privacidade` com o texto da spec, aviso com links
no cadastro e links na entrada e em `/app/conta`.

**Architecture:** feature nova `src/features/legal/` com um layout de leitura
(`LegalDocumentLayout`) e duas páginas com o texto fixo; rotas públicas lazy em
`src/app/App.tsx`; links em `AuthPage` e `AccountPage`. Sem banco.

**Tech Stack:** React 19, React Router, Tailwind, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-termos-e-privacidade-design.md`

## Global Constraints

- Texto dos documentos: copiado **literalmente** das seções "Texto — Política de
  privacidade" e "Texto — Termos de uso" da spec (títulos numerados viram `h2`; listas viram `ul`).
- Linha de vigência: `Vigente desde 2 de outubro de 2026.` Constante `LEGAL_VERSION = '2026-10-02'`.
- Contato: `nicollyengenheira@gmail.com`, como link `mailto:`.
- Rotas: `/termos`, `/privacidade`, fora de `RequireAuth`, acessíveis com ou sem sessão.
- Aviso do cadastro (literal): `Ao criar sua conta, você concorda com os Termos de uso e a
Política de privacidade, inclusive com o tratamento dos dados de saúde que você registrar.`
  com `Termos de uso` → `/termos` e `Política de privacidade` → `/privacidade`, ambos
  `target="_blank"` e `rel="noopener noreferrer"`.
- UI em português, código em inglês, TS estrito, mobile-first, sem rolagem horizontal.

## Review Focus

1. **Texto divergente da spec** — esperado: idêntico. Testes da Task 1 conferem `h1`,
   vigência, contato e um trecho distintivo de cada seção (todas as 10 / 13 seções por `h2`).
2. **Abrir a página logado redireciona para `/app`** — esperado: não redireciona. E2E da Task 3
   abre `/privacidade` com sessão ativa.
3. **Link do cadastro perde o formulário** — esperado: nova aba. Teste da Task 2 confere
   `target="_blank"`.
4. **Celular estreito (360px) com rolagem horizontal** — esperado: nenhuma. E2E mobile da
   Task 3 confere `scrollWidth <= clientWidth`.
5. **"Voltar" sem histórico (link direto)** — esperado: vai para `/`. Teste da Task 1.

---

### Task 1: Páginas `/termos` e `/privacidade`

**Files:**

- Create: `src/features/legal/LegalDocumentLayout.tsx`, `src/features/legal/TermsPage.tsx`,
  `src/features/legal/PrivacyPage.tsx`, `src/features/legal/legal.ts`,
  `src/features/legal/LegalPages.test.tsx`
- Modify: `src/app/App.tsx` (rotas públicas junto de `/recuperar`)

**Interfaces:**

- Produces: `LEGAL_VERSION`, `LEGAL_CONTACT_EMAIL`, `LEGAL_EFFECTIVE_LABEL` em `legal.ts`;
  `LegalDocumentLayout({ title, children }: { title: string; children: ReactNode })`;
  `export function TermsPage()` e `export function PrivacyPage()` (named exports, lazy via
  `.then((m) => ({ default: m.TermsPage }))` como as demais rotas).

- [ ] **Step 1: Testes** em `LegalPages.test.tsx` (com `MemoryRouter`):
  - `política mostra título, vigência e contato` — `heading level 1` `Política de privacidade do Dedic`;
    texto `Vigente desde 2 de outubro de 2026.`; link `nicollyengenheira@gmail.com` com
    `href` `mailto:nicollyengenheira@gmail.com`; 10 `heading level 2`.
  - `termos mostram título, vigência e 13 seções` — `Termos de uso do Dedic`; 13 `h2`;
    texto `O Dedic não presta serviço de saúde` presente.
  - `voltar sem histórico leva à entrada` — com `initialEntries={['/termos']}`, clicar
    `Voltar` navega para `/`.
- [ ] **Step 2: Rodar** — `npx vitest run src/features/legal` → FAIL (módulos ausentes).
- [ ] **Step 3: Implementar.** Layout com fundo `var(--app-bg)`, cartão branco legível
      (`max-w-3xl`, `px-5`), `h1`, linha de vigência, `<main>`; botão/link `Voltar`:
      `navigate(-1)` se `window.history.state?.idx > 0`, senão `navigate('/')`. Texto literal da spec.
- [ ] **Step 4: Rotas** em `App.tsx`.
- [ ] **Step 5: Rodar** — teste passa; `npm run lint && npm run typecheck`.
- [ ] **Step 6: Commit** — `feat: páginas de termos de uso e política de privacidade`.

### Task 2: Aviso no cadastro e links na entrada e na conta

**Files:**

- Create: `src/features/legal/LegalLinks.tsx`
- Modify: `src/features/auth/AuthPage.tsx`, `src/features/account/AccountPage.tsx`
- Test: `src/features/legal/LegalLinks.test.tsx` (ou o teste existente de `AuthPage`, se houver)

**Interfaces:**

- Consumes: rotas da Task 1.
- Produces: `SignUpLegalNotice()` (aviso literal com os dois links em nova aba) e
  `LegalFooterLinks()` (links `Termos de uso` e `Política de privacidade`, mesma aba).

- [ ] **Step 1: Testes**
  - `aviso do cadastro tem os dois links em nova aba` — texto do aviso; links com `href`
    `/termos` e `/privacidade`, `target="_blank"`, `rel` contendo `noopener`.
  - `rodapé tem os dois links` — `href` corretos, sem `target`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** os componentes; `SignUpLegalNotice` em `AuthPage` só no modo
      `signup`, logo acima do botão `Criar conta`; `LegalFooterLinks` abaixo do formulário no
      modo `login` e no fim de `AccountPage`.
- [ ] **Step 4: Rodar** — passa; `npm run lint && npm run typecheck && npm run test`.
- [ ] **Step 5: Commit** — `feat: aviso de termos no cadastro e links legais`.

### Task 3: E2E e documentação

**Files:**

- Create: `tests/e2e/legal.spec.ts`, `docs/adr/0009-termos-e-privacidade-sem-registro-de-aceite.md`
- Modify: `docs/MVP_REQUIREMENTS.md`

**Interfaces:**

- Consumes: Tasks 1 e 2. Importar `test`/`expect` de `./fixtures` (falha em violação de CSP).

- [ ] **Step 1: E2E** (roda nos projetos mobile e desktop):
  - `termos e privacidade abrem sem login` — `/termos` e `/privacidade` mostram o `h1`;
    `document.documentElement.scrollWidth <= clientWidth`.
  - `link do cadastro abre a política em nova aba` — em `/cadastro`, clicar
    `Política de privacidade` com `context.waitForEvent('page')`; nova página em `/privacidade`.
  - `página legal abre com sessão ativa` — `login(page, users.student.email)` (helper
    existente), `goto('/privacidade')`, URL continua `/privacidade` e `h1` visível.
- [ ] **Step 2: Rodar** — `npm run test:e2e` → todos passam, sem violação de CSP.
- [ ] **Step 3: ADR 0009** (modelo `0000-template.md`): decisão de só avisar, sem registrar
      aceite; risco (sem prova de consentimento para dados de saúde, LGPD art. 8º §2º e art. 11 I);
      revisitar após o piloto; textos são minuta sem revisão jurídica. `MVP_REQUIREMENTS.md`:
      requisito novo em RNF-02 (termos e política públicos, aviso no cadastro, ADR 0009).
- [ ] **Step 4: Gate** — `npm run validate`.
- [ ] **Step 5: Commit** — `test: páginas legais ponta a ponta e ADR 0009`.
