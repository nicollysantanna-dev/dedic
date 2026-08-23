# Documento de Requisitos do MVP — Dedic

## 1. Controle do documento

| Campo              | Valor                                       |
| ------------------ | ------------------------------------------- |
| Produto            | Dedic                                       |
| Versão             | 0.1                                         |
| Status             | Rascunho inicial                            |
| Data               | 22/08/2026                                  |
| Plataforma inicial | Aplicação web responsiva e instalável (PWA) |
| Público inicial    | Personal trainer e seus alunos              |

## 2. Visão do produto

O Dedic é um sistema mobile-first para organizar a relação entre aluno e personal trainer. O MVP deve substituir controles informais de agenda, saldo de aulas, remarcações, renovações e pagamentos, oferecendo autonomia ao aluno sem retirar do personal o controle da própria disponibilidade.

O produto deve manter um histórico confiável de todas as ações. Nenhuma alteração relevante de aula ou crédito deve desaparecer quando uma remarcação, cancelamento ou ajuste ocorrer.

## 3. Problema

Aluno e personal atualmente precisam conferir mensagens, contar aulas manualmente, comparar dias disponíveis e recalcular saldos quando há cancelamentos ou remarcações. Isso gera:

- risco de prejuízo para uma das partes;
- divergência sobre quantas aulas ainda estão disponíveis;
- dificuldade para encontrar horários livres;
- perda do histórico de alterações;
- esquecimento da data de renovação e do pagamento.

## 4. Objetivos do MVP

O MVP deve permitir que:

1. O personal disponibilize seus horários de atendimento.
2. O aluno agende, cancele e remarque aulas sem depender de aprovação manual, desde que respeite as regras vigentes.
3. Aluno e personal consultem a mesma agenda e o mesmo saldo.
4. O sistema controle pacotes e créditos de aulas automaticamente.
5. Toda alteração relevante fique registrada em histórico.
6. O personal registre a realização das aulas e os pagamentos.
7. O aluno visualize a próxima aula, o saldo, a renovação prevista e a situação do pagamento.

## 5. Não objetivos do MVP

Não fazem parte desta primeira versão:

- criação de fichas de treino;
- biblioteca de exercícios;
- registro de séries, cargas ou repetições;
- medidas corporais e fotos de evolução;
- gráficos de desempenho;
- chat interno;
- videochamadas;
- integração automática com Pix, cartão ou assinatura;
- integração com Google Calendar ou Apple Calendar;
- aplicativo nativo publicado nas lojas;
- gestão de academias, equipes ou funcionários;
- marketplace para descoberta de profissionais;
- planos comerciais e cobrança pelo uso do Dedic.

## 6. Perfis e permissões

### 6.1 Aluno

O aluno poderá:

- entrar e sair da conta;
- consultar e atualizar seus dados básicos;
- aceitar um vínculo com um personal;
- visualizar a disponibilidade do personal vinculado;
- agendar uma aula em um horário disponível;
- cancelar uma aula futura;
- remarcar uma aula futura;
- consultar suas próximas aulas e seu histórico;
- consultar pacote, renovação prevista, saldo e extrato de créditos;
- consultar valor, vencimento e situação do pagamento.

O aluno não poderá:

- alterar diretamente a quantidade de créditos;
- criar ou editar a disponibilidade do personal;
- marcar uma aula como realizada;
- alterar dados de outros alunos;
- acessar informações de vínculos dos quais não participa.

### 6.2 Personal

O personal poderá:

- entrar e sair da conta;
- consultar e atualizar seus dados básicos;
- convidar e vincular alunos;
- criar e alterar sua disponibilidade recorrente;
- bloquear datas e horários específicos;
- visualizar a agenda dos alunos vinculados;
- criar uma aula para um aluno;
- cancelar ou remarcar uma aula;
- marcar uma aula como realizada ou registrar falta;
- criar e administrar pacotes;
- lançar ajustes de crédito com justificativa obrigatória;
- registrar e atualizar pagamentos;
- consultar históricos de aula, crédito e pagamento.

O personal não poderá acessar dados de alunos sem vínculo ativo com ele.

## 7. Premissas do MVP

- Um usuário terá apenas um papel no MVP: aluno ou personal.
- Um aluno terá apenas um personal ativo no MVP.
- Um personal poderá ter vários alunos.
- Todos os horários serão armazenados de forma segura e exibidos no fuso `America/Sao_Paulo` no MVP.
- A duração padrão de uma aula será definida pelo personal e usada para calcular conflitos.
- Um horário disponível poderá ser reservado automaticamente pelo aluno.
- Não haverá aprovação obrigatória do personal para agendar, cancelar ou remarcar.
- O cancelamento pelo aluno devolverá o crédito no MVP.
- Não haverá prazo mínimo nem limite de remarcações no MVP.
- O pagamento será registrado manualmente pelo personal.

## 8. Glossário

| Termo               | Definição                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| Vínculo             | Relação ativa entre um aluno e um personal                              |
| Pacote              | Contratação de uma quantidade de aulas, valor e referência de renovação |
| Crédito             | Direito do aluno de realizar uma aula                                   |
| Extrato de créditos | Histórico imutável de entradas e saídas de créditos                     |
| Disponibilidade     | Regra que indica quando o personal aceita agendamentos                  |
| Bloqueio            | Exceção que torna indisponível um período normalmente livre             |
| Aula                | Compromisso agendado entre aluno e personal                             |
| Remarcação          | Cancelamento vinculado à criação de uma nova aula                       |

## 9. Requisitos funcionais

### RF-01 — Autenticação

- O sistema deve permitir cadastro e acesso seguro.
- A sessão deve permanecer ativa entre acessos, dentro dos limites de segurança definidos.
- O usuário deve conseguir encerrar a sessão.
- Cada conta deve estar associada a um perfil de aluno ou personal.

### RF-02 — Perfil

- O sistema deve armazenar nome, e-mail e telefone do usuário.
- O personal deve informar a duração padrão das aulas.
- O sistema deve exibir apenas dados necessários para a relação entre aluno e personal.

### RF-03 — Vínculo entre aluno e personal

- O personal deve conseguir criar um convite para um aluno.
- O aluno deve conseguir aceitar ou recusar o convite.
- O vínculo deve possuir os estados `pendente`, `ativo` e `encerrado`.
- Apenas vínculos ativos devem permitir agendamentos e acesso compartilhado.
- O encerramento de um vínculo não deve apagar o histórico anterior.

### RF-04 — Disponibilidade recorrente

- O personal deve cadastrar dias da semana e intervalos de atendimento.
- O personal deve conseguir editar ou remover uma regra futura de disponibilidade.
- O sistema deve considerar a duração da aula ao gerar horários disponíveis.
- Uma alteração de disponibilidade não deve cancelar silenciosamente aulas já agendadas.

### RF-05 — Bloqueios e exceções

- O personal deve conseguir bloquear uma data ou intervalo específico.
- O sistema não deve oferecer horários que coincidam com um bloqueio.
- Se houver aula existente no período a ser bloqueado, o sistema deve alertar o personal e exigir que a aula seja tratada explicitamente.

### RF-06 — Pacote de aulas

- O personal deve criar um pacote contendo aluno, quantidade de aulas, valor, início e renovação prevista.
- O pacote deve possuir os estados `rascunho`, `ativo`, `esgotado` e `cancelado`.
- A ativação do pacote deve gerar uma entrada de créditos no extrato.
- O sistema não deve apagar movimentações de um pacote cancelado.
- O saldo deve ser derivado do extrato, e não mantido apenas como um contador editável.

### RF-07 — Consulta de horários

- O aluno deve visualizar somente horários realmente disponíveis.
- Um horário deve considerar disponibilidade, bloqueios, duração e aulas já reservadas.
- Horários passados não devem ser oferecidos.
- O calendário deve destacar aulas do próprio aluno.

### RF-08 — Agendamento pelo aluno

- O aluno deve conseguir agendar diretamente um horário disponível.
- O agendamento não deve exigir aprovação do personal.
- O aluno deve possuir vínculo ativo, pacote válido e crédito disponível.
- O sistema deve impedir duas reservas para o mesmo personal no mesmo período.
- Reserva do horário e consumo do crédito devem ocorrer de forma atômica.
- Reenvio ou clique duplicado não deve criar duas aulas nem consumir dois créditos.
- Após o sucesso, a aula deve aparecer imediatamente na agenda das duas partes.

### RF-09 — Agendamento pelo personal

- O personal deve conseguir criar uma aula para um aluno vinculado.
- Devem ser aplicadas as mesmas validações de conflito e saldo.
- A autoria da operação deve ficar registrada.

### RF-10 — Cancelamento pelo aluno

- O aluno deve conseguir cancelar uma aula futura.
- O cancelamento deve liberar o horário.
- O crédito consumido deve ser devolvido automaticamente no MVP.
- A aula deve permanecer no histórico com estado e motivo de cancelamento.
- A operação deve registrar autor, data e horário.
- Repetir a solicitação de cancelamento não deve devolver mais de um crédito.

### RF-11 — Cancelamento pelo personal

- O personal deve conseguir cancelar uma aula futura.
- O crédito deve ser devolvido ao aluno.
- O horário deve ser liberado.
- A autoria e o motivo devem ficar registrados.

### RF-12 — Remarcação

- Aluno e personal devem conseguir remarcar uma aula futura.
- O usuário deve selecionar um novo horário disponível antes de confirmar.
- A aula original deve ser mantida como `cancelada_por_remarcacao`.
- Uma nova aula deve ser criada e vinculada à original.
- A operação completa deve preservar um único consumo líquido de crédito.
- Cancelamento da aula original, reserva do novo horário e movimentação de crédito devem ser atômicos.
- Se o novo horário deixar de estar disponível durante a confirmação, a aula original deve permanecer inalterada.

### RF-13 — Estados da aula

O MVP deve suportar:

- `agendada`;
- `realizada`;
- `cancelada_pelo_aluno`;
- `cancelada_pelo_personal`;
- `cancelada_por_remarcacao`;
- `falta_do_aluno`.

Uma aula finalizada não poderá voltar ao estado `agendada` sem uma ação administrativa explícita e registrada.

### RF-14 — Realização e falta

- Uma aula ainda agendada deve ser marcada automaticamente como realizada ao atingir
  o horário de término.
- O personal deve conseguir registrar falta do aluno.
- Uma aula realizada ou com falta deve manter o crédito consumido.
- Alterações posteriores devem exigir justificativa e gerar evento de auditoria.

### RF-15 — Extrato de créditos

- Aluno e personal devem visualizar o saldo atual e suas movimentações.
- Cada movimentação deve conter quantidade, tipo, data, origem e responsável.
- Tipos mínimos: ativação de pacote, consumo por aula, devolução por cancelamento e ajuste manual.
- Toda movimentação ligada a uma aula ou pacote deve possuir referência à sua origem.
- Movimentações não devem ser editadas ou apagadas; correções devem gerar uma nova movimentação compensatória.

### RF-16 — Ajuste manual

- Apenas o personal poderá conceder ou retirar créditos manualmente.
- Todo ajuste deve exigir justificativa.
- O aluno deve visualizar o ajuste no extrato.
- O sistema deve identificar o personal responsável pela ação.

### RF-17 — Pagamentos

- O personal deve registrar valor, vencimento, data de pagamento e situação.
- Situações mínimas: `pendente`, `pago`, `atrasado` e `cancelado`.
- O aluno deve visualizar a situação do próprio pagamento.
- O registro financeiro não movimentará dinheiro no MVP.
- A baixa do pagamento não deve alterar créditos automaticamente; a ativação do pacote será uma ação explícita.

### RF-18 — Página inicial do aluno

Deve exibir:

- próxima aula;
- quantidade de créditos disponível;
- aulas realizadas no pacote atual;
- data prevista de renovação;
- situação do pagamento;
- atalho para agendar uma aula.

### RF-19 — Página inicial do personal

Deve exibir:

- aulas do dia;
- próximas aulas;
- alunos com pacote próximo da renovação;
- pagamentos pendentes ou atrasados;
- atalhos para bloquear horário e criar aula.

### RF-20 — Histórico e auditoria

- O sistema deve registrar criação, cancelamento, remarcação e mudança de estado das aulas.
- Cada evento deve conter autor e data/hora.
- O histórico deve ser consultável pelas partes envolvidas.
- Registros históricos não devem ser removidos quando um vínculo ou pacote for encerrado.

## 10. Regras de negócio do MVP

| Código | Regra                                                                                  |
| ------ | -------------------------------------------------------------------------------------- |
| RN-01  | Um horário livre pode ser agendado automaticamente, sem aprovação do personal.         |
| RN-02  | Apenas alunos com vínculo ativo podem agendar.                                         |
| RN-03  | O aluno precisa ter vínculo ativo e crédito disponível em algum pacote ativo.          |
| RN-04  | Agendar uma aula consome um crédito.                                                   |
| RN-05  | Cancelar uma aula futura devolve um crédito, independentemente da antecedência.        |
| RN-06  | Uma aula realizada ou com falta mantém o crédito consumido.                            |
| RN-07  | Uma remarcação deve resultar em exatamente um crédito líquido consumido.               |
| RN-08  | O personal não pode ter aulas sobrepostas.                                             |
| RN-09  | O aluno não pode ter aulas sobrepostas.                                                |
| RN-10  | Nenhuma ação pode deixar o saldo abaixo de zero.                                       |
| RN-11  | Créditos não vencem e permanecem disponíveis enquanto o pacote não for cancelado.      |
| RN-12  | Novos pacotes acumulam créditos; o consumo usa primeiro o pacote ativo mais antigo.    |
| RN-13  | Alterações de saldo precisam estar representadas no extrato.                           |
| RN-14  | Toda ação sensível precisa registrar o usuário responsável.                            |
| RN-15  | Datas e horários exibidos devem respeitar o fuso definido para o MVP.                  |
| RN-16  | Após o horário de término, uma aula ainda agendada torna-se realizada automaticamente. |

## 11. Fluxos principais

### 11.1 Primeiro acesso

1. Personal cria a conta.
2. Personal configura duração e disponibilidade.
3. Personal convida o aluno.
4. Aluno cria a conta ou entra.
5. Aluno aceita o vínculo.
6. Personal cria e ativa o pacote.
7. Aluno passa a visualizar horários e saldo.

### 11.2 Agendamento

1. Aluno abre o calendário.
2. Sistema mostra horários disponíveis.
3. Aluno toca em um horário para agendar, sem confirmação adicional ou aprovação do personal.
4. Sistema valida vínculo, pacote, saldo e conflitos.
5. Sistema reserva o horário e consome um crédito imediatamente.
6. Agenda, saldo e histórico são atualizados.

### 11.3 Cancelamento

1. Aluno abre uma aula futura.
2. Aluno solicita o cancelamento.
3. Sistema apresenta o efeito da ação: horário liberado e crédito devolvido.
4. Aluno confirma.
5. Sistema cancela a aula, devolve o crédito e registra o evento.

### 11.4 Remarcação

1. Aluno abre uma aula futura e escolhe remarcar.
2. Sistema apresenta horários disponíveis.
3. Aluno seleciona o novo horário.
4. Sistema apresenta a troca antes da confirmação.
5. Sistema valida novamente o novo horário.
6. Sistema cancela a aula original, cria a nova e preserva o saldo líquido.

## 12. Requisitos não funcionais

### RNF-01 — Mobile-first

- Todas as funções do MVP devem funcionar em telas de celular.
- Ações principais devem ser acessíveis sem zoom horizontal.
- A aplicação deve ser instalável como PWA quando suportado pelo navegador.

### RNF-02 — Segurança e privacidade

- Toda comunicação em produção deve utilizar HTTPS.
- O acesso aos registros deve ser restrito por autenticação e políticas no banco.
- Chaves administrativas nunca devem ser expostas no navegador.
- Dados de um aluno não devem ser acessíveis por outro aluno.
- O sistema deve coletar apenas os dados necessários ao MVP.

### RNF-03 — Consistência

- Operações que envolvem horário e crédito devem ser transacionais.
- Respostas duplicadas ou tentativas repetidas devem ser idempotentes quando aplicável.
- O banco deve impedir sobreposição de aulas mesmo sob requisições simultâneas.

### RNF-04 — Desempenho

- As telas principais devem fornecer feedback visual imediato ao usuário.
- O calendário deve carregar apenas o intervalo necessário para a visualização atual.
- Estados de carregamento, sucesso, vazio e erro devem estar claramente representados.

### RNF-05 — Acessibilidade

- Campos devem possuir rótulos associados.
- A aplicação deve permitir navegação por teclado nas funções essenciais.
- Cores não devem ser o único meio de comunicar estados.
- Textos e controles devem ter contraste adequado.

### RNF-06 — Observabilidade

- Erros inesperados devem ser registrados sem expor dados sensíveis.
- Operações críticas devem possuir identificadores que facilitem investigação.
- Falhas de agendamento e remarcação devem gerar mensagem compreensível ao usuário.

### RNF-07 — Compatibilidade

- O MVP deve suportar versões modernas de Chrome, Safari, Edge e Firefox.
- Os fluxos essenciais devem ser testados em larguras típicas de celular e desktop.

## 13. Critérios de aceite do MVP

O MVP estará funcionalmente pronto quando for possível demonstrar que:

1. Um personal cria sua disponibilidade e vincula um aluno.
2. O personal cria um pacote e o aluno visualiza os créditos recebidos.
3. O aluno agenda sozinho um horário livre e o saldo diminui uma vez.
4. Um segundo agendamento para o mesmo horário é rejeitado.
5. O aluno cancela a aula e o crédito retorna uma única vez.
6. O aluno remarca uma aula sem consumir crédito adicional.
7. Se a remarcação falhar, a aula original permanece válida.
8. O personal marca uma aula como realizada e o histórico é preservado.
9. O personal registra uma falta e o crédito não é devolvido.
10. Um ajuste manual aparece no extrato com justificativa e autoria.
11. O personal registra um pagamento e o aluno visualiza a situação.
12. Um aluno não consegue consultar nem alterar dados de outro aluno.
13. Os principais fluxos funcionam em uma tela de celular.

## 14. Telas previstas

### Compartilhadas

- cadastro e entrada;
- recuperação de acesso;
- perfil;
- detalhes da aula;
- histórico de eventos.

### Aluno

- início;
- calendário e horários disponíveis;
- agendamento direto pelo horário escolhido;
- remarcação;
- pacote, saldo e extrato;
- situação do pagamento.

### Personal

- início e agenda do dia;
- calendário;
- disponibilidade recorrente;
- bloqueios;
- alunos e convites;
- detalhes do aluno;
- criação e gestão de pacote;
- ajustes de crédito;
- registro de pagamento.

## 15. Modelo conceitual inicial

| Entidade                        | Responsabilidade                          |
| ------------------------------- | ----------------------------------------- |
| `profiles`                      | Dados e papel do usuário                  |
| `trainer_student_relationships` | Convites e vínculos                       |
| `availability_rules`            | Disponibilidade recorrente                |
| `availability_exceptions`       | Bloqueios e exceções                      |
| `lesson_packages`               | Quantidade, valor e renovação prevista    |
| `credit_transactions`           | Extrato imutável de créditos              |
| `appointments`                  | Estado atual de cada aula                 |
| `appointment_events`            | Auditoria das alterações da aula          |
| `payments`                      | Controle manual de cobranças e pagamentos |

O modelo físico, índices, restrições e políticas de acesso serão detalhados em um documento técnico separado.

## 16. Métricas iniciais de sucesso

- Percentual de aulas agendadas pelo aluno sem intervenção do personal.
- Quantidade de divergências de saldo relatadas.
- Quantidade de conflitos de horário registrados.
- Taxa de sucesso em agendamentos e remarcações.
- Uso semanal por aluno e personal.
- Redução do uso de mensagens para conferir saldo e disponibilidade.

As métricas não precisam de uma plataforma analítica externa no primeiro lançamento; eventos essenciais podem ser registrados pelo próprio sistema.

## 17. Decisões pendentes antes da implementação

Estas decisões não bloqueiam este rascunho, mas devem ser confirmadas antes de fechar o modelo técnico:

1. Qual será a duração padrão inicial das aulas: 30, 45 ou 60 minutos?
2. O aluno poderá agendar até quantos dias no futuro?
3. Será permitido agendar uma aula para o mesmo dia?
4. Resolvido: créditos não vencem e novos pacotes acumulam saldo.
5. A ativação do pacote ocorrerá antes ou depois do registro do pagamento?
6. Como o convite será entregue inicialmente: link, código ou e-mail?
7. O personal poderá editar duração e horário de uma aula existente ou deverá sempre remarcar?

## 18. Stack aprovada para o MVP

- React com TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Tailwind CSS e shadcn/ui;
- React Hook Form e Zod;
- Supabase com PostgreSQL, Auth, Storage e Row Level Security;
- Vitest, Testing Library e Playwright;
- Vercel para hospedagem.

## 19. Próximos artefatos

Após a aprovação deste documento:

1. Resolver as decisões pendentes.
2. Criar os fluxos de navegação e wireframes mobile-first.
3. Elaborar o modelo físico do banco e as políticas de segurança.
4. Dividir o MVP em entregas pequenas.
5. Inicializar o projeto e implementar primeiro o fluxo completo de agendamento.
