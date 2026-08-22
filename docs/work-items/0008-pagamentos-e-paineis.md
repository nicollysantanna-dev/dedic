# Unidade de trabalho — Pagamentos e painéis

## Resultado esperado

Personal registra pagamentos manualmente e as duas partes acompanham agenda, saldo,
vencimento e situação financeira em seus painéis.

## Requisitos relacionados

- RF-17, RF-18 e RF-19
- RNF-01, RNF-02, RNF-03 e RNF-04

## Cenários de aceite

- Personal cria e atualiza pagamento de pacote de aluno vinculado.
- Pagamento pago exige data; demais estados não aceitam data de pagamento.
- Aluno visualiza apenas os próprios pagamentos.
- Baixa de pagamento não altera pacote nem créditos.
- Painéis mostram próxima aula, saldo, vencimento e alertas coerentes.

## Fora do escopo

- Processamento de Pix, cartão ou assinatura.
- Ativação automática de pacote após pagamento.

## Verificação

- [x] Unidade de trabalho definida
- [x] Migração e autorização verificadas no banco remoto
- [x] Layout validado em celular
- [x] Testes adicionados
- [x] Quality gate executado
- [x] Critérios de aceite demonstrados com rollback
