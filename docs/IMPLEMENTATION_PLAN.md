# Plano incremental do MVP

## Princípio

Cada marco entrega uma capacidade demonstrável. Um marco só avança quando seus critérios de saída estiverem atendidos.

## Marco 0 — Decisões do produto

### Resultado

Requisitos aprovados e decisões pendentes resolvidas.

### Entregas

- confirmar duração padrão da aula;
- definir janela máxima e mínima de agendamento;
- definir permanência dos créditos após a data de renovação;
- definir relação entre pagamento e ativação do pacote;
- escolher formato do convite;
- aprovar os fluxos principais.

### Critério de saída

O documento do MVP deixa o status de rascunho e não possui decisões bloqueantes.

## Marco 1 — Fundação executável

**Status:** concluído em 22/08/2026. A conexão com um projeto Supabase remoto será
feita no Marco 2, quando a autenticação exigir persistência real. O ambiente local
está configurado e requer Docker em execução para ser iniciado.

### Resultado

Aplicação React vazia, mas instalável, testável e publicável.

### Entregas

- React, TypeScript e Vite;
- estrutura por features;
- layout mobile-first e rotas básicas;
- configuração de PWA;
- Supabase local e remoto de desenvolvimento;
- lint, formatação, typecheck, testes, build e CI;
- tratamento base de erros e estados de carregamento.

### Critério de saída

`npm run validate` passa e uma página de preview pode ser acessada no celular.

## Marco 2 — Identidade e vínculo

**Status:** concluído e simplificado em 23/08/2026. O vínculo é automático por
e-mail no primeiro acesso ou pelo link privado enviado ao celular, sem aceite manual.

### Resultado

Personal e aluno entram no sistema e estabelecem uma relação segura.

### Entregas

- autenticação;
- escolha e persistência de papel;
- perfil;
- convite por e-mail ou celular;
- ativação automática e encerramento de vínculo;
- políticas RLS e testes de isolamento.

### Critério de saída

Um aluno vinculado acessa apenas seus dados e um usuário externo não acessa o vínculo.

## Marco 3 — Disponibilidade

**Status:** implementação e migração remota concluídas em 22/08/2026. A validação
final com um aluno vinculado permanece como cenário manual de aceite.

### Resultado

O personal publica horários e bloqueia exceções.

### Entregas

- duração padrão;
- disponibilidade semanal;
- bloqueios por data e intervalo;
- geração de slots;
- calendário mobile;
- tratamento de alterações com aulas existentes.

### Critério de saída

O aluno visualiza apenas slots futuros, livres e compatíveis com a duração configurada.

## Marco 4 — Pacote e extrato

**Status:** implementação e migração remota concluídas em 22/08/2026. A demonstração
com pacote real aguarda um aluno com vínculo ativo.

### Resultado

O personal ativa um pacote e ambas as partes veem o mesmo saldo auditável.

### Entregas

- criação e ativação do pacote;
- estados do pacote;
- extrato imutável;
- saldo derivado;
- ajustes compensatórios com justificativa;
- testes de autorização e consistência.

### Critério de saída

Toda variação de saldo pode ser explicada por lançamentos visíveis no extrato.

## Marco 5 — Agendamento autônomo

**Status:** concluído em 22/08/2026 e simplificado em 23/08/2026 para agendamento
imediato ao tocar no horário, sem confirmação adicional ou aprovação do personal.
Complementado em 23/08/2026 com agendamento pelo personal e créditos sem vencimento.

### Resultado

O aluno reserva uma aula sem aprovação do personal.

### Entregas

- seleção do slot com agendamento imediato;
- transação de horário e crédito;
- proteção contra conflito e clique duplicado;
- agenda do aluno e do personal;
- eventos de auditoria;
- testes de concorrência e jornada E2E.

### Critério de saída

Duas tentativas simultâneas não reservam o mesmo horário nem geram débito incorreto.

## Marco 6 — Cancelamento e remarcação

**Status:** concluído em 23/08/2026. Migração aplicada no Supabase remoto e cenários
transacionais validados com rollback, sem deixar aulas ou créditos de teste.

### Resultado

Aluno e personal reorganizam a agenda com saldo correto e histórico preservado.

### Entregas

- cancelamento por ambas as partes;
- devolução idempotente;
- remarcação atômica;
- vínculo entre aula original e nova;
- rollback quando o novo horário não estiver disponível;
- testes E2E dos fluxos.

### Critério de saída

Cancelar devolve um crédito apenas uma vez; remarcar mantém um consumo líquido e nunca perde a aula original em caso de falha.

## Marco 7 — Operação da aula

**Status:** concluído em 23/08/2026. Migração aplicada no Supabase remoto, regras
transacionais validadas com rollback e agenda compartilhada atualizada.

### Resultado

O personal conclui a agenda do dia.

### Entregas

- marcar realizada;
- registrar falta;
- histórico de estados;
- justificativa para correções;
- agenda do dia do personal.

### Critério de saída

Aulas realizadas e faltas permanecem auditáveis e mantêm o crédito consumido.

## Marco 8 — Pagamento e painéis

**Status:** concluído em 23/08/2026. Pagamentos, histórico, políticas RLS e painéis
foram aplicados e validados no Supabase remoto e em layout mobile.

### Resultado

Aluno e personal acompanham renovação e pagamento.

### Entregas

- registro manual do pagamento;
- estados de pagamento;
- painel do aluno;
- painel do personal;
- alertas visuais de vencimento;
- estados vazios e de erro.

### Critério de saída

As duas partes veem informações coerentes de pacote, saldo, próxima aula e pagamento.

## Marco 9 — Preparação para uso real

### Resultado

MVP pronto para um piloto controlado.

### Entregas

- revisão de acessibilidade e responsividade;
- revisão de RLS;
- testes de restauração e migração;
- monitoramento de erros;
- política de privacidade e termos mínimos;
- roteiro de piloto e coleta de feedback.

### Critério de saída

Todos os critérios de aceite do MVP foram demonstrados e o quality gate está verde.
