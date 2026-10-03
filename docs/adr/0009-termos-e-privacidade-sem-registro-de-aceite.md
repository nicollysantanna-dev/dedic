# ADR 0009 — Termos e privacidade sem registro de aceite

- Status: aceita
- Data: 2026-10-02
- Responsáveis: Nicolly Cristine Santanna de Oliveira

## Contexto

O piloto precisa de termos de uso e política de privacidade públicos antes do uso real.
O Dedic trata dados de saúde (peso, medidas, fotos de evolução e metas), que a LGPD
classifica como sensíveis: o consentimento para eles deve ser específico e destacado
(art. 11, I), e cabe ao controlador provar que o obteve (art. 8º, §2º).

## Decisão

- Páginas públicas `/termos` e `/privacidade` (`src/features/legal/`), com versão
  `2026-10-02` e controladora pessoa física, contato `nicollyengenheira@gmail.com`.
- No cadastro, um aviso com links informa que criar a conta implica concordar com os dois
  documentos, inclusive com o tratamento dos dados de saúde registrados.
- **Nenhum aceite é gravado**: não há versão, data ou checkbox persistidos, e contas
  existentes não passam por tela de aceite.
- Menores podem usar o app com autorização do responsável legal, declarada nos termos e não
  verificada pelo app.
- Os textos são uma minuta técnica, sem revisão jurídica.

## Alternativas consideradas

### Registrar o aceite no banco

Checkbox obrigatório no cadastro, versão e data gravadas no perfil e tela de aceite para
contas existentes e a cada nova versão. Prova o consentimento, mas exige migração, mudança
no cadastro e um bloqueio de acesso. Adiada para depois do piloto.

### Só maiores de 18 anos

Evitaria as regras de tratamento de dados de crianças e adolescentes (art. 14), mas
impediria alunos adolescentes no piloto.

## Consequências

### Positivas

- Documentos públicos e acessíveis sem login, inclusive no celular, com links no
  cadastro, na entrada e em `/app/conta`.
- Uma nova versão troca só o texto e a data em `src/features/legal/`.

### Negativas

- Sem prova do consentimento específico para dados de saúde: em uma fiscalização ou
  disputa, o Dedic não consegue demonstrar quem aceitou qual versão.
- Contas criadas antes de 02/10/2026 não viram o aviso.
- A autorização do responsável por menores não é coletada nem verificada.
- "Mudanças relevantes serão avisadas no aplicativo" depende de uma notificação manual;
  não há mecanismo automático.

## Validação

Reavaliar ao fim do piloto ou antes de abrir o cadastro para pessoas fora do círculo do
piloto: registrar o aceite com versão e data, coletar a autorização do responsável por
menores e submeter os textos a revisão jurídica. E2E `tests/e2e/legal.spec.ts` garante que
as páginas abrem sem login, com sessão ativa e sem rolagem horizontal.
