# Remover a sincronização diária automática do Hevy

## Objetivo

Deixar de sincronizar o Hevy automaticamente todos os dias. O Dedic passa a ser o lugar principal de registro dos treinos, e a sincronização acontece só quando o usuário pede ("Sincronizar agora").

## Contexto

- A sincronização diária foi entregue pelo item 0029: um cron da Vercel (`vercel.json`, `crons`) chama `/api/hevy-sync-cron` todo dia às 01h UTC.
- A lógica de sincronização por usuário (`api/hevy-sync-core.ts`, usada também pelo botão manual em `api/hevy-sync.ts`) continua necessária.
- Este item não afeta os agendamentos do banco (`pg_cron`): fechamento semanal da constância, cobranças vencidas e conclusão automática de aulas continuam como estão.

## Escopo

- Remover a entrada `crons` de `vercel.json` e a configuração de `api/hevy-sync-cron.ts`.
- Remover o endpoint `api/hevy-sync-cron.ts` e o que só ele usa (ex.: segredo do cron nas variáveis de ambiente da Vercel), mantendo o código compartilhado com a sincronização manual.
- Ajustar textos da interface que prometam sincronização automática.
- Atualizar a ADR 0007 e marcar o item 0029 como revertido.

## Critérios de aceite

- Nenhuma sincronização com o Hevy acontece sem ação do usuário.
- "Sincronizar agora" continua funcionando, sem duplicar treinos já importados.
- O build e a configuração da Vercel não referenciam mais o endpoint de cron.
- A remoção de arquivos é confirmada com a responsável pelo produto antes de ser feita.

## Estado da implementação

- Feito: entrada `crons` e configuração de `api/hevy-sync-cron.ts` removidas de `vercel.json`; rota removida do servidor de API local (`scripts/dev-api-server.ts`); comentários, ADR 0007 e item 0029 atualizados.
- A interface não prometia sincronização automática; nenhum texto de tela mudou.
- Pendente (aguarda confirmação): apagar `api/hevy-sync-cron.ts`. Enquanto existir, a Vercel publica o arquivo como função, mas ele só responde a quem tiver o `CRON_SECRET` e não é mais chamado por agendamento.
- Pendente (fora do código): remover a variável `CRON_SECRET` do projeto na Vercel depois do deploy.
- O agendamento só deixa de rodar depois do próximo deploy na Vercel.
