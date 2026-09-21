# ADR 0005 — Decisões de produto para fechar o MVP

## Status

Aceita em 18/09/2026.

## Contexto

A auditoria de 18/09/2026 listou dez decisões em aberto que bloqueavam marcos do
plano de MVP (segurança e perfil, evolução física, integração Hevy, financeiro e
preparação para produção). Elas foram resolvidas com a responsável pelo produto.

## Decisões

| #   | Tema                     | Decisão                                                                                                    |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| D1  | Cadastro como personal   | Mantido o autocadastro: qualquer conta pode se declarar personal. Reavaliar após o piloto.                 |
| D2  | Janela de agendamento    | Sem limite máximo e com agendamento no mesmo dia permitido; cancelar e remarcar continuam travados no dia. |
| D3  | Edição de aula existente | Não há edição direta de horário: qualquer mudança é uma remarcação, inclusive arrastar no calendário.      |
| D4  | Fuso horário             | Fixo em `America/Sao_Paulo` no MVP. A coluna `profiles.timezone` e a variável `VITE_APP_TIMEZONE` saem.    |
| D5  | Fotos de evolução        | Sem edição nem ocultação de rosto; a privacidade vem do bucket privado e do acesso por vínculo ativo.      |
| D6  | Treinos                  | Substituída pela ADR 0006: treinos nativos com catálogo free-exercise-db; Hevy fica para depois do MVP.    |
| D7  | Tipos de cobrança        | Pacote e aula avulsa. Mensalidade fica fora do MVP.                                                        |
| D8  | Cancelamento tardio      | Sem penalidade: até o dia anterior devolve o crédito; no dia da aula não há cancelamento.                  |
| D9  | Exclusão de conta        | Anonimização do perfil preservando o histórico de negócio, conforme a LGPD.                                |
| D10 | Recorrência de aulas     | Fora do MVP.                                                                                               |

## Consequências

- O marco de RLS e perfil (M2) parametriza as funções do banco sem fuso por personal e remove a coluna e a variável.
- A evolução física (M4) entrega upload, comparação e exclusão pelo aluno sem editor de imagem.
- O financeiro (M7) precisa distinguir pacote de aula avulsa na cobrança e no consumo de crédito.
- A exclusão de conta (M7) será um RPC de anonimização, não um `delete` em cascata.
- Cada decisão pode ser revista por uma nova ADR após o piloto.
