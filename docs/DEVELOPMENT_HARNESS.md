# Harness de desenvolvimento

## 1. Finalidade

O harness é o conjunto de limites, verificações e artefatos que permite desenvolver o Dedic em pequenas entregas sem perder requisitos, segurança ou consistência do domínio.

Ele responde, para cada mudança:

1. O que estamos entregando?
2. Qual requisito justifica a mudança?
3. Como saberemos que funciona?
4. Quais invariantes não podem ser quebradas?
5. Quais verificações precisam passar?

## 2. Fontes de verdade

| Assunto                                  | Fonte                                                    |
| ---------------------------------------- | -------------------------------------------------------- |
| Escopo e comportamento                   | `docs/MVP_REQUIREMENTS.md`                               |
| Processo e qualidade                     | `docs/DEVELOPMENT_HARNESS.md`                            |
| Instruções para agentes e contribuidores | `AGENTS.md`                                              |
| Ordem das entregas                       | `docs/IMPLEMENTATION_PLAN.md`                            |
| Decisões arquiteturais                   | `docs/adr/`                                              |
| Banco de dados                           | Migrações em `supabase/migrations/` após a inicialização |
| Contrato executável                      | Testes automatizados                                     |

Em caso de conflito, os requisitos aprovados prevalecem sobre detalhes de implementação. Uma mudança deliberada no produto deve atualizar o documento de requisitos.

## 3. Unidade de trabalho

Cada entrega deve ser uma fatia vertical pequena, observável na interface e verificável por teste. Use o template `docs/templates/WORK_ITEM.md`.

Uma unidade de trabalho deve conter:

- problema e resultado esperado;
- requisitos relacionados, como `RF-08` e `RN-04`;
- cenários de aceite;
- riscos de segurança e consistência;
- alterações previstas em interface, banco e testes;
- itens explicitamente fora do escopo.

Evite tarefas horizontais extensas como “fazer todo o backend” ou “criar todas as telas”.

## 4. Ciclo de desenvolvimento

### 4.1 Entender

- Leia o requisito e as regras relacionadas.
- Percorra o fluxo do usuário principal e os fluxos de falha.
- Identifique autorização, concorrência, datas e movimentações financeiras ou de crédito.
- Registre uma ADR se a solução introduzir uma decisão estrutural duradoura.

### 4.2 Especificar

- Preencha uma unidade de trabalho.
- Transforme critérios de aceite em cenários testáveis.
- Defina primeiro o menor resultado demonstrável.

### 4.3 Implementar

- Faça a menor alteração completa que atravesse as camadas necessárias.
- Coloque validações de segurança e invariantes no servidor/banco.
- Use a interface para antecipar erros, não como única proteção.
- Não introduza abstrações sem um uso concreto no MVP.

### 4.4 Verificar

- Execute testes focados durante o desenvolvimento.
- Execute o quality gate completo antes de concluir.
- Verifique manualmente a experiência em largura de celular.
- Para agenda e créditos, teste também repetição, concorrência e falha intermediária.

### 4.5 Documentar

- Atualize requisito, ADR ou plano quando uma decisão mudar.
- Registre limitações conhecidas que permaneçam dentro do escopo.
- Informe exatamente quais verificações foram executadas.

## 5. Pirâmide de testes

### Testes unitários

Protegem funções puras e regras locais:

- cálculo de intervalos;
- formatação e interpretação de datas;
- validações Zod;
- transições permitidas de estado;
- apresentação do extrato.

### Testes de componente

Protegem comportamento visível:

- formulários e mensagens de validação;
- estados vazio, carregando e erro;
- confirmação de cancelamento;
- resumo da remarcação;
- navegação acessível.

### Testes de banco e integração

Protegem o núcleo do produto:

- políticas de Row Level Security;
- restrições contra sobreposição;
- consumo e devolução de créditos;
- idempotência;
- transações e rollback;
- acesso permitido e negado por perfil.

### Testes ponta a ponta

Cobrem poucas jornadas de alto valor:

1. Personal convida aluno e ativa pacote.
2. Aluno agenda sem aprovação.
3. Aluno cancela e recupera o crédito.
4. Aluno remarca sem consumo adicional.
5. Personal registra realização, falta e pagamento.

## 6. Matriz mínima de cenários críticos

| Operação        | Sucesso                             | Repetição              | Concorrência             | Falha intermediária      | Autorização               |
| --------------- | ----------------------------------- | ---------------------- | ------------------------ | ------------------------ | ------------------------- |
| Agendar         | Cria aula e debita 1                | Não duplica            | Só uma reserva vence     | Nenhum débito órfão      | Apenas vínculo ativo      |
| Cancelar        | Libera horário e credita 1          | Não credita novamente  | Estado permanece válido  | Sem crédito órfão        | Apenas envolvidos         |
| Remarcar        | Move horário e mantém saldo líquido | Não duplica nova aula  | Novo horário é exclusivo | Aula original preservada | Apenas envolvidos         |
| Ajustar saldo   | Cria lançamento compensatório       | Requisição idempotente | Saldo consistente        | Sem lançamento parcial   | Apenas personal vinculado |
| Consultar dados | Retorna registros próprios          | Resultado estável      | Não aplicável            | Erro seguro              | RLS isola usuários        |

## 7. Quality gate planejado

Os seguintes scripts serão criados junto com a inicialização do React:

| Script                  | Responsabilidade                          |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Iniciar ambiente local                    |
| `npm run format`        | Formatar arquivos                         |
| `npm run format:check`  | Verificar formatação sem alterar          |
| `npm run lint`          | Análise estática                          |
| `npm run typecheck`     | Verificar TypeScript estrito              |
| `npm run test`          | Executar testes unitários e de componente |
| `npm run test:coverage` | Gerar cobertura para diagnóstico          |
| `npm run test:e2e`      | Executar jornadas Playwright              |
| `npm run build`         | Validar build de produção                 |
| `npm run validate`      | Executar o gate local não destrutivo      |

O script `validate` deve executar, nesta ordem, formatação, lint, tipos, testes e build. E2E pode permanecer separado por depender do ambiente local completo.

## 8. Ambientes

| Ambiente | Uso                     | Dados                          |
| -------- | ----------------------- | ------------------------------ |
| Local    | Desenvolvimento diário  | Dados fictícios e descartáveis |
| Preview  | Revisão de cada entrega | Projeto Supabase não produtivo |
| Produção | Uso real                | Dados reais protegidos         |

Nunca reutilizar dados reais em testes locais. Banco de preview e produção devem usar projetos e credenciais distintos.

## 9. Variáveis de ambiente planejadas

Somente estas variáveis públicas poderão ser consumidas pelo frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_TIMEZONE
```

Segredos administrativos pertencem exclusivamente a ambientes de servidor e não devem usar o prefixo `VITE_`.

## 10. Dados de teste

O seed local deve criar, no mínimo:

- um personal;
- dois alunos vinculados;
- um aluno sem vínculo;
- disponibilidade semanal;
- um bloqueio;
- pacote ativo, vencido e esgotado;
- aulas em todos os estados suportados;
- pagamento pendente, pago e atrasado.

Factories devem permitir criar cenários específicos sem depender da ordem global dos testes.

## 11. Observabilidade de desenvolvimento

- Erros devem preservar contexto técnico suficiente para diagnóstico.
- Mensagens mostradas ao usuário devem ser claras e não expor detalhes internos.
- Operações críticas devem retornar ou registrar um identificador de correlação.
- Logs locais podem ser detalhados, mas não devem registrar tokens ou senhas.

## 12. Estratégia de entrega

- Cada incremento deve deixar a aplicação executável.
- Migrações devem ser compatíveis com o estado anterior sempre que houver dados persistidos.
- Flags de funcionalidade só serão adicionadas quando houver necessidade concreta.
- Refatorações maiores devem ser separadas de mudanças de comportamento quando possível.
- O primeiro fluxo vertical completo será o agendamento, precedido apenas pela fundação necessária.

## 13. Estado do harness

O harness documental e seu quality gate estão operacionais desde o Marco 1. A fundação criou:

- aplicação Vite;
- scripts do `package.json`;
- configurações de lint, formatação e TypeScript;
- Vitest e Testing Library;
- Playwright;
- configuração do Supabase local, a ser iniciada com Docker quando necessário;
- pipeline de integração contínua.

Migrações serão adicionadas a partir do Marco 2. O pipeline local completo usa
`npm run validate`; jornadas de navegador usam `npm run test:e2e`.
