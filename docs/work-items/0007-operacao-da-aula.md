# Unidade de trabalho — Operação da aula

## Resultado esperado

O personal conclui aulas iniciadas ou passadas como realizadas ou falta do aluno,
sem devolver o crédito e preservando um histórico auditável.

## Requisitos relacionados

- RF-13, RF-14 e RF-20
- RN-06 e RN-14
- RNF-01, RNF-02 e RNF-03

## Cenários de aceite

- Dada uma aula iniciada, quando o personal marca realizada, então o estado muda e
  o saldo permanece igual.
- Dada uma aula iniciada, quando o personal registra falta, então o crédito não é
  devolvido.
- Dada uma aula futura, então sua conclusão é rejeitada.
- Dado um aluno envolvido, então ele consulta o resultado, mas não pode alterá-lo.
- Dado um resultado final, uma correção exige justificativa e gera novo evento.

## Fora do escopo

- Pagamentos e indicadores do painel, entregues no Marco 8.
- Agendamento pelo personal, requisito RF-09 complementar ao Marco 5.

## Impacto previsto

### Interface

- Ações de realização e falta na agenda do personal.
- Estado final visível para as duas partes.
- Correção explícita com justificativa obrigatória.

### Domínio e banco

- Função protegida `complete_appointment`.
- Função protegida `correct_appointment_outcome`.
- Eventos imutáveis sem movimentação adicional de crédito.

## Verificação

- [x] Unidade de trabalho definida
- [x] Migração e autorização verificadas no banco remoto
- [ ] Interface mobile validada
- [x] Testes adicionados
- [x] Quality gate executado
- [x] Critérios transacionais demonstrados com rollback
