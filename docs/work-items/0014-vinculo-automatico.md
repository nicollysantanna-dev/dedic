# Work item 0014 — Vínculo automático

## Objetivo

Reduzir a burocracia para vincular personal e aluno, eliminando a etapa de aceite
manual sem perder a comprovação de posse do contato convidado.

## Regras

- O personal escolhe e-mail ou celular ao criar o convite.
- No e-mail, a conta autenticada precisa possuir exatamente o endereço convidado.
- No celular, o token do link privado enviado por WhatsApp comprova o convite.
- O vínculo é ativado no primeiro acesso elegível.
- Cada aluno continua podendo possuir apenas um vínculo ativo.
- Um vínculo antigo entre o mesmo par pode ser reativado, preservando seu histórico.

## Entregas

- contato alternativo por celular no convite;
- função transacional para reivindicar o convite;
- captura segura do token durante cadastro ou login;
- remoção da ação de aceite no painel do aluno;
- comunicação do estado pendente no painel do personal.

## Critérios de aceite

- Uma conta com o e-mail convidado recebe o vínculo automaticamente.
- Outra conta não consegue usar o link de um convite por e-mail.
- O link privado de um convite por celular ativa o vínculo após autenticação.
- Um personal autenticado não reivindica convite de aluno.
- Um usuário sem convite continua usando o sistema normalmente.
