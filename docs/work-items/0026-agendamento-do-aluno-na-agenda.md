# 0026 — Agendamento do aluno na agenda unificada

## Objetivo

Eliminar a página antiga de cartões de horários e usar a agenda como interface única de
consulta e agendamento também para o aluno.

## Decisões

- Os atalhos `Agendar aula` levam para `/app/agenda`.
- `/app/calendario` permanece apenas como redirecionamento para preservar links antigos.
- A agenda do aluno carrega os horários publicados pelo personal vinculado.
- O aluno só consegue iniciar um agendamento dentro de uma disponibilidade publicada.
- A confirmação usa a operação existente `book_appointment`, preservando validação de
  vínculo, conflito e consumo atômico do crédito no banco.
- O personal continua podendo criar aulas diretamente na mesma agenda.

## Critérios de aceite

- O botão da aba `Personal` não abre a interface antiga.
- Horários disponíveis aparecem destacados na grade do aluno.
- Clicar em um horário disponível abre o painel de confirmação.
- Horários fora da disponibilidade não abrem o fluxo de criação para o aluno.
- Após o sucesso, agenda, horários e saldo são atualizados.
