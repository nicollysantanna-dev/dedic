# Work item 0015 — Agenda operacional unificada

## Objetivo

Reduzir a navegação necessária para o trabalho diário do personal, concentrando
agendamento, remarcação e cancelamento na agenda principal.

## Experiência

- Tocar em um dia abre o painel de criação de aula com a data preenchida.
- Tocar em um horário livre abre o mesmo painel com data e hora preenchidas.
- Tocar em uma aula abre seus detalhes e ações contextuais.
- Remarcação usa os horários livres sem sair da agenda.
- Cancelamento permite motivo e exige confirmação explícita.
- Sucessos de agendamento, remarcação e cancelamento exibem um aviso temporário.
- O filtro de aluno preenche automaticamente o aluno nas novas aulas.

## Segurança preservada

As operações continuam usando as funções transacionais existentes no banco. A
unificação altera somente a interface, sem duplicar regras de crédito ou conflito.

## Próximas etapas

- incorporar pacote, saldo e pagamento no painel contextual do aluno;
- trazer disponibilidade e bloqueio para o clique no calendário;
- remover rotas antigas apenas após validar o novo fluxo em produção.
