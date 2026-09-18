# 0024 — Créditos no perfil do aluno

## Objetivo

Permitir que o personal renove aulas ou corrija créditos sem sair do perfil do aluno.

## Requisitos atendidos

- RF-06 — Pacote de aulas.
- RF-15 — Extrato de créditos.
- RF-16 — Ajuste manual.
- RN-12 — Novos pacotes acumulam créditos.

## Decisões

- **Novo pacote** é o fluxo principal para compra e renovação de aulas.
- O pacote é criado e ativado na mesma interação da interface; a ativação gera o
  lançamento positivo no extrato.
- **Ajuste** fica separado e exige justificativa, sendo destinado apenas a bônus e
  correções.
- O saldo continua derivado do extrato imutável; a interface não edita um contador.
- Após o sucesso, perfil, listagem de alunos, pacotes e extrato são invalidados para
  refletir o novo saldo.

## Critérios de aceite

- O perfil do aluno exibe a ação `Adicionar aulas`.
- O personal consegue criar e ativar um pacote informando quantidade, valor, início e
  renovação prevista.
- O personal consegue registrar ajuste positivo ou negativo com justificativa.
- O aluno e o personal continuam vendo o histórico das movimentações.
- A interface apresenta carregamento, erro e confirmação de sucesso.
