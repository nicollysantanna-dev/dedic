# Unidade de trabalho — Agenda interativa unificada

## Resultado esperado

O personal cria, consulta, cancela e remarca aulas diretamente na grade temporal da agenda, sem navegar para uma tela separada.

## Requisitos relacionados

- RF-07
- RF-09
- RF-11
- RF-12
- ADR-0003

## Cenários de aceite

- Dado um personal com aluno vinculado e crédito, quando ele seleciona um horário futuro na grade e confirma o painel, então a aula é criada atomicamente.
- Dada uma aula futura, quando o personal arrasta seu card para um horário disponível, então a remarcação preserva um único consumo líquido.
- Dado um conflito durante a remarcação, quando o banco rejeita a operação, então o card retorna ao horário original.
- Dado o dia da própria aula, quando alguém tenta cancelar ou remarcar, então a interface bloqueia a ação e o banco rejeita tentativas diretas.
- Dado um celular, quando o personal toca em um horário ou aula, então as ações aparecem em um painel inferior utilizável sem drag-and-drop.

## Fora do escopo

- Redimensionamento livre da duração de uma aula.
- Recorrência de aulas.
- Arrastar alunos externos para dentro da grade.

## Impacto previsto

### Interface

- Grade diária, de três dias ou semanal com seleção de intervalos.
- Painel lateral no desktop e painel inferior no celular.
- Drag-and-drop para remarcação no desktop.
- A rota antiga de criação redireciona para a agenda.

### Domínio e banco

- As RPCs existentes continuam responsáveis por crédito, conflito, autoria e rollback.
- Um trigger impede cancelamento e remarcação a partir do dia local da aula.

### Segurança e privacidade

- RLS e as RPCs validam usuário, vínculo e acesso à aula.
- Nenhum dado de aluno sem vínculo ativo é disponibilizado.

### Testes

- Unitários: elegibilidade de uma aula para drag-and-drop e tradução de erros.
- Componentes: interações protegidas pelos componentes existentes e pelo typecheck.
- Banco/integração: trigger versionado para o bloqueio no dia da aula.
- E2E: smoke responsivo do acesso e build completo.

## Riscos e casos extremos

- Concorrência: uma remarcação rejeitada executa `revert` e preserva o evento original.
- Repetição/idempotência: cada criação e remarcação usa uma chave UUID própria.
- Datas e fuso: o corte diário usa `America/Sao_Paulo` no banco.
- Falha intermediária: criação e remarcação continuam transacionais nas RPCs.

## Verificação

- [x] Critérios de aceite atendidos
- [x] Layout responsivo implementado
- [x] Estados de carregamento, vazio e erro tratados
- [x] Autorização preservada no banco
- [x] Testes adicionados
- [x] Quality gate executado
- [x] Documentação atualizada
