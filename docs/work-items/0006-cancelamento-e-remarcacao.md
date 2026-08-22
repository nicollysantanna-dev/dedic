# Unidade de trabalho — Cancelamento e remarcação

## Resultado esperado

Aluno e personal cancelam ou remarcam aulas futuras preservando saldo, histórico e
consistência mesmo em repetição ou falha concorrente.

## Requisitos relacionados

- RF-10, RF-11, RF-12 e RF-20
- RN-05, RN-07, RN-08, RN-09, RN-10 e RN-14
- RNF-01, RNF-02 e RNF-03

## Cenários de aceite

- Dada uma aula futura, quando uma parte cancela, então o horário é liberado e um
  único crédito é devolvido.
- Dado um cancelamento repetido, então nenhum crédito adicional é criado.
- Dada uma nova data válida, quando uma parte remarca, então a original é preservada
  como cancelada por remarcação e a substituta mantém o mesmo consumo líquido.
- Dado um novo slot que ficou indisponível, quando a remarcação confirma, então toda
  a operação falha e a aula original permanece agendada.
- Dado o reenvio da mesma remarcação, então a mesma aula substituta é retornada.

## Fora do escopo

- Marcar aula como realizada ou falta, entregue no Marco 7.
- Aplicar prazo mínimo ou multa de cancelamento; o MVP permanece flexível.

## Impacto previsto

### Interface

- Confirmação de cancelamento com efeito explícito no crédito.
- Tela compartilhada de seleção e confirmação da remarcação.

### Domínio e banco

- Função idempotente `cancel_appointment`.
- Função atômica e idempotente `reschedule_appointment`.
- Vínculo entre aula original e substituta.
- Índice único de devolução por cancelamento.

### Segurança e privacidade

- Apenas aluno e personal envolvidos podem executar as ações.
- Escrita permanece restrita às funções transacionais.

### Testes

- Unitários: mensagens seguras de falha na remarcação.
- Banco/integração: repetição, saldo líquido e rollback no Supabase.
- E2E: estados mobile de confirmação.

## Riscos e casos extremos

- Concorrência: a aula original é bloqueada antes da transição.
- Repetição/idempotência: devolução e substituição possuem chaves únicas.
- Datas e fuso: apenas aulas futuras e pacote válido na nova data.
- Falha intermediária: a exceção reverte atualização, nova aula e eventos.

## Verificação

- [x] Estados de carregamento, vazio e erro tratados
- [x] Testes adicionados
- [x] Migração e autorização verificadas no banco remoto
- [ ] Layout validado em celular
- [x] Quality gate executado
- [x] Documentação atualizada
- [x] Critérios transacionais demonstrados no banco com rollback
