# Roteiro do piloto

Piloto controlado do Dedic com **1 personal e seus alunos reais (3 a 10)**, por
**4 semanas**, com o Dedic como **controle principal** de agenda, créditos e pagamentos.
Fecha o Marco 9 do [plano incremental](IMPLEMENTATION_PLAN.md).

Responsável: Nicolly Cristine Santanna de Oliveira.

## 1. Objetivo e critérios de sucesso

Descobrir se o Dedic substitui o controle atual do personal (planilha, caderno, WhatsApp)
sem perder confiança no saldo de aulas e com os alunos agendando sozinhos.

| Critério                               | Meta em 4 semanas                                  | Como medir                   |
| -------------------------------------- | -------------------------------------------------- | ---------------------------- |
| Aulas agendadas pelo próprio aluno     | ≥ 70% das aulas criadas no período                 | Consulta 1                   |
| Divergência de saldo sem explicação    | 0 casos                                            | Consulta 3 + relato no grupo |
| Personal deixa o controle antigo       | Até a semana 2, sem voltar                         | Conversas 2 e 3              |
| Alunos ativos                          | ≥ 80% dos alunos com alguma ação por semana        | Consulta 4                   |
| Agendamentos e remarcações com sucesso | Nenhuma falha relatada que impeça a aula           | Grupo de suporte             |
| Mensagens para conferir saldo/horário  | Personal relata redução clara (conversa 3)         | Conversa 3                   |
| Instalação no celular                  | Todos os participantes com o Dedic na tela inicial | Checklist da semana 0        |

Se um critério de saldo ou de falha que impeça a aula for violado, aplicar a seção 7
antes de seguir.

## 2. Participantes e papéis

- **Personal:** usa o Dedic como fonte da verdade da agenda, dos pacotes e dos pagamentos.
- **Alunos (3 a 10):** agendam, cancelam e remarcam pelo Dedic; opcionalmente registram
  treinos e evolução.
- **Nicolly (suporte):** acompanha o grupo de WhatsApp, roda as consultas semanais,
  conduz as conversas e corrige bugs.

Antes de convidar alunos, alinhar com o personal: o piloto é um teste, os textos legais
são uma minuta ([ADR 0009](adr/0009-termos-e-privacidade-sem-registro-de-aceite.md)) e
alunos menores só participam com autorização do responsável.

## 3. Semana 0 — preparação

### 3.1 Checklist técnico

- [ ] Último deploy da `main` publicado na Vercel e todas as migrações aplicadas no
      remoto (`npx supabase migration list` sem pendências).
- [ ] Produção abre sem erros de "Content Security Policy" no console do navegador.
- [ ] `/termos` e `/privacidade` abrem sem login.
- [ ] "Write audit logs to the database" desligado no Supabase (Authentication → Audit Logs).
- [ ] Backup: confirmar o plano de backups do projeto Supabase e exportar um dump antes
      de começar (`npx supabase db dump --linked -f backup-inicio-piloto.sql`, guardado
      fora do repositório).
- [ ] Contas de teste antigas removidas ou fora do personal do piloto.

### 3.2 Teste em celulares reais

Validação pendente das auditorias mobile (work items 0030 e 0031). Fazer em **um iPhone
(Safari) e um Android (Chrome)**, de preferência os do personal e de um aluno:

- [ ] Instalar pelo card "Instale o Dedic no seu celular" (iPhone: Compartilhar →
      Adicionar à Tela de Início; Android: botão Instalar ou ⋮ → Instalar app) e abrir
      pelo ícone, em tela cheia.
- [ ] Entrar, sair e entrar de novo pelo app instalado.
- [ ] Personal: publicar disponibilidade, convidar aluno pelo link de WhatsApp, ativar
      pacote, registrar pagamento.
- [ ] Aluno: agendar tocando no horário, cancelar (dia anterior), remarcar.
- [ ] Personal: marcar aula realizada e falta.
- [ ] Treino: iniciar ficha, registrar séries, finalizar.
- [ ] Evolução: registrar, editar e excluir peso; enviar e excluir foto pela câmera.
- [ ] Teclado não cobre campos nem botões; nada exige rolagem horizontal; textos legíveis
      sem zoom.
- [ ] Sinal fraco: abrir o app com dados móveis ruins e confirmar que os erros aparecem
      como mensagem, não como tela em branco.

Registrar cada problema no grupo (seção 6.3) antes de abrir para os alunos.

### 3.3 Configuração com o personal

- [ ] Conversa 1 (abertura, seção 6.1).
- [ ] Personal cria a conta, define duração padrão e disponibilidade semanal.
- [ ] Personal migra o saldo atual de cada aluno como pacote inicial no Dedic
      (créditos restantes, não o histórico antigo).
- [ ] Personal convida os alunos; cada aluno cria a conta e instala o app.
- [ ] Criar o grupo de WhatsApp "Dedic — piloto" com personal, alunos e suporte.

## 4. Semanas 1 a 4

| Semana | Foco                                                             | Ritual                                   |
| ------ | ---------------------------------------------------------------- | ---------------------------------------- |
| 1      | Primeiros agendamentos; ajudar quem travar; corrigir bugs rápido | Consultas 1–4 na sexta                   |
| 2      | Cancelamentos e remarcações; conferir saldo com o personal       | Conversa 2 (meio); consultas na sexta    |
| 3      | Renovação de pacote e pagamentos; uso de treinos e evolução      | Consultas na sexta                       |
| 4      | Fechamento: formulário dos alunos; conversa final                | Conversa 3; formulário; consultas finais |

Toda sexta, registrar no fim deste documento (seção 9) os números da semana e os
problemas abertos.

## 5. Como medir

Rodar no **SQL Editor do Supabase**. Todas as consultas são **só leitura**. Trocar
`PERSONAL@EMAIL` pelo e-mail do personal e `2026-10-06` pela data de início do piloto.

### Consulta 1 — autonomia do agendamento

```sql
with params as (
  select u.id as trainer_id, date '2026-10-06' as start_on
  from auth.users u where u.email = 'PERSONAL@EMAIL'
)
select
  count(*) filter (where a.created_by = a.student_id) as pelo_aluno,
  count(*) filter (where a.created_by = a.trainer_id) as pelo_personal,
  round(100.0 * count(*) filter (where a.created_by = a.student_id)
    / nullif(count(*), 0), 1) as percentual_aluno
from public.appointments a, params p
where a.trainer_id = p.trainer_id
  and a.created_at >= p.start_on
  and a.rescheduled_from_id is null;
```

### Consulta 2 — cancelamentos, remarcações e faltas

```sql
with params as (
  select u.id as trainer_id, date '2026-10-06' as start_on
  from auth.users u where u.email = 'PERSONAL@EMAIL'
)
select a.status, count(*)
from public.appointments a, params p
where a.trainer_id = p.trainer_id and a.created_at >= p.start_on
group by a.status
order by a.status;
```

### Consulta 3 — ajustes manuais de saldo (possíveis divergências)

Todo ajuste manual deve ter explicação conhecida. Ajuste sem motivo claro conta como
divergência.

```sql
with params as (
  select u.id as trainer_id, date '2026-10-06' as start_on
  from auth.users u where u.email = 'PERSONAL@EMAIL'
)
select t.created_at, s.full_name as aluno, t.amount, t.reason
from public.credit_transactions t
join public.profiles s on s.id = t.student_id, params p
where t.trainer_id = p.trainer_id
  and t.transaction_type = 'manual_adjustment'
  and t.created_at >= p.start_on
order by t.created_at;
```

### Consulta 4 — alunos ativos por semana

Conta um aluno como ativo na semana se ele agendou uma aula, finalizou um treino ou
registrou evolução.

```sql
with params as (
  select u.id as trainer_id, date '2026-10-06' as start_on
  from auth.users u where u.email = 'PERSONAL@EMAIL'
),
students as (
  select r.student_id from public.trainer_student_relationships r, params p
  where r.trainer_id = p.trainer_id and r.status = 'active'
),
actions as (
  select a.student_id, a.created_at as at from public.appointments a
  where a.created_by = a.student_id
  union all
  select w.student_id, w.finished_at from public.workouts w
  where w.finished_at is not null and w.discarded_at is null
  union all
  select e.student_id, e.created_at from public.progress_entries e
  where e.recorded_by = e.student_id
)
select
  date_trunc('week', x.at at time zone 'America/Sao_Paulo')::date as semana,
  count(distinct x.student_id) as alunos_ativos,
  (select count(*) from students) as alunos_no_piloto
from actions x, params p
where x.student_id in (select student_id from students)
  and x.at >= p.start_on
group by 1
order by 1;
```

Tentativas de agendamento recusadas (horário ocupado, sem crédito) não ficam gravadas;
conflitos são medidos pelos relatos no grupo.

## 6. Feedback

### 6.1 Conversas com o personal (20 minutos cada)

- **Conversa 1 — abertura (semana 0):** como controla hoje aulas, créditos e pagamentos;
  o que mais dá trabalho; quantas mensagens por semana para combinar horário e conferir
  saldo; o que faria ele desistir do Dedic.
- **Conversa 2 — meio (semana 2):** ainda usa o controle antigo? Para quê? Algum saldo
  não bateu? Qual tela usa mais e qual evita? Algum aluno com dificuldade?
- **Conversa 3 — final (semana 4):** continuaria usando sem o piloto? Pagaria por isso?
  Quanto? O que faltou? Mudou o número de mensagens com os alunos? Nota de 0 a 10 para
  recomendar a outro personal, e por quê.

Anotar as respostas na seção 9, com frases literais quando possível.

### 6.2 Formulário dos alunos (semana 4)

Formulário gratuito (Google Forms ou similar), anônimo, 5 perguntas:

1. De 0 a 10, quão fácil foi agendar, cancelar e remarcar suas aulas?
2. Você confiou no saldo de aulas mostrado pelo Dedic? (Sim / Mais ou menos / Não)
3. Você instalou o Dedic no celular? Usou pelo ícone? (Sim / Tentei e não consegui / Não)
4. O que mais te atrapalhou ou faltou?
5. De 0 a 10, quanto você recomendaria o Dedic para outro aluno?

### 6.3 Bugs e pedidos no dia a dia

- Canal: grupo de WhatsApp do piloto. Pedir print e o horário do problema.
- Suporte responde no mesmo dia útil; problema que impede aula ou mexe em saldo tem
  prioridade sobre qualquer outra tarefa.
- Registrar cada item na seção 9 com: data, quem relatou, descrição, gravidade
  (impede aula / incomoda / sugestão) e situação.
- Correções seguem o fluxo normal do projeto (teste que falha antes, quality gate).

## 7. Riscos e contingência

| Situação                                           | O que fazer                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Saldo de um aluno diverge do que o personal espera | Conferir o extrato do aluno no app; corrigir com ajuste manual com justificativa; investigar a causa antes de seguir. |
| App fora do ar ou erro que impede agendar          | Personal combina pelo WhatsApp e registra no Dedic quando voltar; suporte avisa no grupo e acompanha até resolver.    |
| Dado registrado errado (aula, pagamento, peso)     | Aula: cancelar/remarcar; pagamento: registrar o correto; evolução: editar ou excluir.                                 |
| Aluno não consegue instalar ou entrar              | Suporte faz chamada de vídeo curta; se persistir, usa pelo navegador.                                                 |
| Personal quer voltar ao controle antigo            | Entender o motivo na hora (conta como achado do piloto); combinar se pausa ou segue em paralelo.                      |
| Pedido de exclusão de conta ou dos dados           | Pela própria conta (Conta → Excluir conta) ou pelo e-mail de contato da política.                                     |

## 8. Decisão ao fim do piloto

- **Seguir:** critérios de saldo e de falha cumpridos, autonomia ≥ 70% e o personal quer
  continuar. Próximos passos: itens no radar (monitoramento de erros, revisão de
  acessibilidade e RLS), registro do aceite dos termos ([ADR 0009](adr/0009-termos-e-privacidade-sem-registro-de-aceite.md)),
  revisão jurídica dos textos e convite a um segundo personal.
- **Ajustar:** critérios de confiança cumpridos, mas autonomia ou uso abaixo da meta.
  Priorizar os 3 problemas mais citados e repetir 2 semanas.
- **Pausar:** divergência de saldo sem causa encontrada, falhas que impediram aulas ou o
  personal desistiu. Corrigir a causa antes de qualquer novo piloto.

Registrar a decisão e os motivos numa ADR.

## 9. Registro do piloto

Preencher durante o piloto.

### Números por semana

| Semana | % agendado pelo aluno | Cancel./remarc./faltas | Ajustes manuais | Alunos ativos | Observações |
| ------ | --------------------- | ---------------------- | --------------- | ------------- | ----------- |
| 1      |                       |                        |                 |               |             |
| 2      |                       |                        |                 |               |             |
| 3      |                       |                        |                 |               |             |
| 4      |                       |                        |                 |               |             |

### Problemas relatados

| Data | Quem | Descrição | Gravidade | Situação |
| ---- | ---- | --------- | --------- | -------- |
|      |      |           |           |          |

### Conversas

- Conversa 1:
- Conversa 2:
- Conversa 3:
