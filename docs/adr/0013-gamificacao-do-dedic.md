# ADR 0013 — Gamificação do Dedic

- Status: aceita
- Data: 2026-10-07
- Responsáveis: Nicolly

## Contexto

O Dedic depende de o aluno voltar ao app e manter constância, e o personal
precisa enxergar essa constância. A responsável pelo produto quer levar o
Dedic, para aluno e personal, para uma linha gamificada com visual de jogo 2D,
começando por um relatório mensal de check-ins compartilhável.

Restrições: público adulto (o visual não pode parecer infantil), dados de
frequência e saúde são sensíveis (LGPD), custo zero nesta fase e a agenda já é
a ferramenta de controle do personal.

## Decisão

### Princípios

1. **Constância, não intensidade.** Premiamos aparecer, nunca volume, carga ou
   dias seguidos. Descanso nunca é punido.
2. **O aluno se compara consigo mesmo.** Sem ranking nem comparação entre
   alunos.
3. **Conquista é permanente.** Medalha ganha não se perde.
4. **A regra fica no banco.** Check-ins, semanas, sequências e medalhas são
   calculados e concedidos no banco, como o saldo.
5. **Privacidade por padrão.** Nada sai do app sem o aluno escolher
   compartilhar, e o compartilhamento é só por imagem gerada no aparelho.
6. **O personal vê o mesmo que o aluno.** Não há painel extra para ele; a agenda
   continua sendo a ferramenta de controle.

### Vocabulário

- **Check-in**: um dia (fuso `America/Sao_Paulo`) com treino finalizado e não
  descartado ou aula concluída; no máximo um por dia.
- **Meta semanal**: a meta de frequência (`student_goals.kind = 'attendance'`)
  ativa do aluno; sem meta, vale o padrão de **3 check-ins por semana**.
- **Semana batida**: semana de segunda a domingo com check-ins ≥ meta semanal.
- **Sequência**: semanas batidas seguidas. A semana atual só soma quando é
  batida e só quebra quando termina sem ser batida.
- **Medalha**: conquista permanente e datada.

### Roteiro

- **Nível 1 (agora)**: check-ins, sequência de semanas, medalhas e relatório
  mensal compartilhável
  ([spec](../superpowers/specs/2026-10-07-relatorio-mensal-design.md)).
- **Nível 2 (direção)**: personagem 2D do aluno que sobe de nível com XP ganho
  por check-ins e conquistas.
- **Fora do escopo**: mapa ou jornada, desafios, ranking entre alunos e link
  público.

### Arquitetura

Check-ins são **derivados** de treinos e aulas (view), sem cópia. O que precisa
ser estável no tempo é **gravado**: o resultado de cada semana fechada, com a
meta que valia na época, e as medalhas concedidas. Assim, mudar a meta ou
descartar um treino não reescreve o passado.

## Alternativas consideradas

### Calcular tudo na leitura

Sem estado novo, mas medalhas sumiriam ao descartar um treino ou remarcar uma
aula, e alterar a meta reescreveria sequências passadas.

### Gravar também os check-ins

Histórico totalmente congelado, mas dois lugares para a mesma informação, que
divergem quando um treino é descartado. Reavaliar no nível 2, se o XP exigir.

### Gamificação profunda (mapa/jornada)

Muito apelo, mas é quase um segundo produto. Fica fora até o nível 2 provar
valor.

## Consequências

### Positivas

- Motivo concreto para o aluno voltar e compartilhar o Dedic.
- Personal enxerga a constância do aluno sem uma nova ferramenta.
- Base pronta para o personagem do nível 2.

### Negativas

- Duas tarefas agendadas novas (fechamento semanal e mensal) para manter.
- Treino descartado depois de a semana fechar não altera a semana nem as
  medalhas: o histórico gamificado pode divergir levemente do histórico de
  treinos.

## Em aberto

- Direção visual 2D: a responsável pelo produto traz um esboço. Até lá, os
  ícones das medalhas ficam num único catálogo trocável.
- Nome do personagem e do universo do nível 2.

## Validação

- Uso do relatório e do compartilhamento no piloto (docs/PILOT_PLAN.md).
- Percepção do personal do piloto sobre o visual e sobre a motivação dos
  alunos.
