# ADR 0002 — Extrato imutável como fonte do saldo de aulas

- Status: aceita
- Data: 2026-08-22
- Responsáveis: equipe Dedic

## Contexto

O problema central do produto é evitar divergências sobre aulas contratadas, consumidas, canceladas e remarcadas. Um campo editável de saldo não explica como o valor atual foi alcançado e pode ficar inconsistente após falhas ou alterações simultâneas.

## Decisão

Representar toda entrada ou saída de crédito como uma movimentação imutável. O saldo disponível será derivado da soma das movimentações válidas do pacote.

Correções não editarão nem apagarão lançamentos anteriores. Elas criarão uma movimentação compensatória com autoria, justificativa e referência à origem.

Agendamento, cancelamento e remarcação executarão a alteração da aula e seus lançamentos de crédito na mesma transação do banco.

## Alternativas consideradas

### Campo `remaining_lessons` no pacote

É simples de consultar, mas perde rastreabilidade e pode divergir do histórico após concorrência ou falha intermediária.

### Recalcular apenas a partir do estado atual das aulas

Evita um contador manual, mas não representa ajustes, concessões, expiração e correções com clareza suficiente.

## Consequências

### Positivas

- saldo auditável pelas duas partes;
- correções preservam o histórico;
- comportamento idempotente pode ser protegido por chaves de origem;
- divergências podem ser investigadas.

### Negativas

- consultas de saldo exigem agregação ou projeção controlada;
- operações precisam de transações e restrições cuidadosas;
- exclusão física de registros de negócio deixa de ser uma opção comum.

## Validação

Os testes devem demonstrar que clique duplicado, cancelamento repetido, concorrência e falha na remarcação não produzem saldo incorreto.
