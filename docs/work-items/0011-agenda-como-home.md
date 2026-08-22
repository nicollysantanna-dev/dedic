# Work item 0011 — Agenda como página principal

## Resultado esperado

Transformar `/app` na central operacional mobile-first do aluno e do personal,
reunindo visualmente aulas, disponibilidade e bloqueios.

## Requisitos relacionados

RF-04, RF-05, RF-07, RF-09, RF-18, RF-19 e RN-15.

## Critérios de aceite

- `/app` apresenta um calendário mensal para ambos os papéis.
- Aulas agendadas, realizadas, faltas, horários livres e bloqueios possuem legenda.
- Selecionar um dia apresenta aulas, bloqueios e quantidade de horários livres.
- O personal consegue filtrar a agenda por aluno e consultar o saldo no contexto.
- Ações de agendar, bloquear, editar disponibilidade, pacote e pagamento são
  acessíveis a partir da agenda.
- O painel de vínculos e indicadores permanece acessível em `/app/resumo`.

## Fora do escopo deste incremento

- Editar pacotes dentro de um modal do calendário.
- Arrastar aulas entre horários.
- Alterar regras transacionais existentes no Supabase.
