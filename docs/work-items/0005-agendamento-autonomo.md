# Unidade de trabalho — Agendamento autônomo

## Resultado esperado

O aluno reserva um horário disponível sem aprovação, consumindo exatamente um
crédito e atualizando imediatamente a agenda das duas partes.

## Requisitos relacionados

- RF-07, RF-08 e RF-20
- RN-01, RN-02, RN-03, RN-04, RN-08, RN-09, RN-10 e RN-14
- RNF-01, RNF-02 e RNF-03

## Cenários de aceite

- Dado vínculo, pacote e crédito válidos, quando o aluno confirma um slot, então a
  aula e o débito de um crédito são gravados na mesma transação.
- Dadas duas tentativas concorrentes para o mesmo personal e período, então somente
  uma reserva é aceita.
- Dado o reenvio do mesmo identificador de requisição, então a aula existente é
  retornada sem novo débito.
- Dado um slot reservado, então ele deixa de aparecer na disponibilidade.
- Dado um usuário não envolvido, então a RLS impede a consulta da aula e dos eventos.

## Fora do escopo

- Cancelamento e remarcação, entregues no Marco 6.
- Registro de realização e falta, entregue no Marco 7.
- Criação de aula pelo personal, prevista após o fluxo autônomo do aluno.

## Impacto previsto

### Interface

- Seleção e confirmação de slot no calendário do aluno.
- Mensagens para pacote, saldo e conflito concorrente.
- Agenda futura compartilhada entre personal e aluno.

### Domínio e banco

- `appointments` com exclusão de sobreposição por personal e por aluno.
- `appointment_events` imutável para auditoria.
- `book_appointment` transacional e idempotente.
- Geração de slots passa a excluir aulas reservadas.

### Segurança e privacidade

- Apenas o aluno vinculado agenda para si mesmo.
- Apenas personal e aluno envolvidos consultam aula e eventos.
- Escrita ocorre somente pela função transacional.

### Testes

- Unitários: tradução segura dos erros de reserva.
- Banco/integração: conflito, idempotência, saldo e rollback no Supabase.
- E2E: jornada de seleção e confirmação em celular.

## Riscos e casos extremos

- Concorrência: constraints GiST impedem sobreposição mesmo entre transações.
- Repetição/idempotência: `booking_request_id` é único e reaproveitado no retry.
- Datas e fuso: slots persistem em `timestamptz` e validade usa São Paulo.
- Falha intermediária: aula, débito e evento fazem parte da mesma transação.

## Verificação

- [x] Estados de carregamento, vazio e erro tratados
- [x] Testes adicionados
- [x] Migração, acesso anônimo e transação verificados no banco remoto
- [x] Layout validado em celular
- [x] Quality gate executado
- [x] Documentação atualizada
- [ ] Critérios de aceite demonstrados de ponta a ponta
