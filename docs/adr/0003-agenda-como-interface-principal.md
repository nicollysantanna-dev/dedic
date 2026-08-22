# ADR 0003 — Agenda como interface principal

## Status

Aceita em 22/08/2026.

## Contexto

Disponibilidade, bloqueios, aulas, pacotes e pagamentos estavam distribuídos em
telas independentes. No uso móvel, isso exige navegação excessiva para operações
que normalmente começam pela escolha de uma data ou de um aluno.

## Decisão

A rota autenticada `/app` passa a ser uma agenda operacional. O calendário reúne
indicadores de aulas, horários disponíveis e bloqueios. A seleção de um dia abre
um painel contextual com compromissos, horários livres e atalhos para ações.

As páginas especializadas continuam responsáveis pelos formulários e operações
críticas. Assim, a agenda funciona como ponto de entrada sem duplicar no frontend
as regras transacionais de crédito, conflito, cancelamento e remarcação.

## Consequências

- A experiência principal passa a ser orientada por data e aluno.
- Personal e aluno compartilham o modelo visual com ações adequadas ao papel.
- O painel anterior permanece em `/app/resumo` para vínculos e indicadores.
- Formulários poderão migrar para painéis contextuais em incrementos futuros.
