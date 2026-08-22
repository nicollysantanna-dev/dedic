# AGENTS.md

## Missão

Construir o Dedic de forma incremental, segura e mobile-first, mantendo como fonte de verdade os requisitos em `docs/MVP_REQUIREMENTS.md`.

## Antes de alterar código

1. Leia `docs/MVP_REQUIREMENTS.md` e `docs/DEVELOPMENT_HARNESS.md`.
2. Identifique o requisito funcional e o critério de aceite atendidos pela mudança.
3. Não amplie o escopo do MVP sem registrar a decisão.
4. Preserve alterações existentes que não façam parte da tarefa.

## Invariantes do domínio

- O saldo é derivado do extrato de créditos; não é um contador livremente editável.
- Movimentações de crédito são imutáveis. Correções geram lançamentos compensatórios.
- Reserva de horário e consumo de crédito são uma operação atômica.
- Remarcação preserva exatamente um consumo líquido de crédito.
- Falha na remarcação preserva a aula original.
- Cancelar a mesma aula mais de uma vez nunca devolve créditos adicionais.
- Um personal e um aluno não podem possuir aulas sobrepostas.
- Eventos relevantes registram autoria e data/hora.
- Exclusões não apagam histórico de negócio.

## Segurança

- Todas as tabelas expostas pelo Supabase devem ter Row Level Security habilitado.
- Nunca coloque `service_role`, senhas ou segredos em variáveis `VITE_*`.
- O navegador recebe apenas a URL do projeto e a chave pública/publicável do Supabase.
- Regras críticas de saldo e agenda pertencem ao banco, não apenas à interface.
- Migrações e políticas devem ser versionadas e testadas.
- Logs não devem conter tokens, senhas, dados médicos ou informações pessoais desnecessárias.

## Organização esperada

Quando a aplicação for inicializada, prefira esta estrutura:

```text
src/
  app/             composição, rotas e providers
  components/      componentes compartilhados
  features/        funcionalidades organizadas por domínio
  lib/             integrações e utilitários
  test/            configuração e factories de teste
supabase/
  migrations/      esquema, funções e políticas versionadas
  tests/           testes de banco e autorização
tests/
  e2e/             cenários Playwright
docs/
  adr/             decisões arquiteturais
```

Uma feature pode conter `components`, `hooks`, `queries`, `schemas`, `services`, `types` e testes. Evite criar essas pastas antes de existir conteúdo real.

## Convenções

- Use TypeScript estrito e evite `any`.
- Use nomes de domínio em inglês no código e português na interface.
- Valide entradas externas com Zod.
- Centralize chaves de consulta do TanStack Query por feature.
- Componentes de página orquestram; regras de negócio ficam fora do JSX.
- Datas persistidas usam tipos com fuso explícito; a apresentação inicial usa `America/Sao_Paulo`.
- Toda tela deve representar carregamento, vazio, erro e sucesso quando aplicável.
- Comece pela experiência de celular e valide também a versão desktop.

## Testes obrigatórios

- Regra pura: teste unitário.
- Componente com interação: Testing Library.
- Permissão, saldo ou concorrência: teste no banco/integração.
- Jornada crítica: Playwright.
- Correção de bug: inclua teste que falha antes da correção.

Os cenários prioritários são agendamento, clique duplicado, conflito simultâneo, cancelamento idempotente, remarcação com sucesso, rollback de remarcação e isolamento entre usuários.

## Quality gate

Após a inicialização do app, toda entrega deve passar por:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Mudanças em jornadas críticas também executam:

```bash
npm run test:e2e
```

Não declare um comando como executado se o script ainda não existir ou não tiver sido executado.

## Definição de pronto

Uma entrega está pronta quando:

- atende ao requisito e aos critérios de aceite relacionados;
- possui estados de interface e mensagens de erro adequados;
- respeita acessibilidade e layout mobile-first;
- protege dados com autorização no banco;
- inclui testes proporcionais ao risco;
- não quebra o quality gate;
- atualiza documentação ou ADR quando houver nova decisão.
