# Unidade de trabalho — Disponibilidade do personal

## Resultado esperado

O personal publica intervalos semanais e bloqueios pontuais, e o aluno vinculado
visualiza os slots futuros compatíveis com a duração da aula.

## Requisitos relacionados

- RF-04, RF-05 e RF-07
- RN-02 e RN-15
- RNF-01, RNF-02, RNF-04 e RNF-05

## Cenários de aceite

- Dado um personal autenticado, quando cadastra um intervalo semanal, então o
  intervalo passa a compor os horários disponíveis.
- Dado um bloqueio que intersecta um slot, quando o aluno consulta o calendário,
  então o slot bloqueado não é exibido.
- Dado um aluno sem vínculo ativo, quando tenta consultar a disponibilidade de um
  personal, então o banco nega o acesso.
- Dado um horário passado, quando os slots são gerados, então ele não é retornado.

## Fora do escopo

- Reservar um slot, consumir créditos ou destacar aulas existentes.
- Tratar conflito entre um novo bloqueio e uma aula existente; a entidade de aulas
  será introduzida no Marco 5.
- Editar uma regra: neste incremento ela pode ser removida e recriada.

## Impacto previsto

### Interface

- Gestão mobile de disponibilidade semanal e bloqueios para o personal.
- Calendário dos próximos 14 dias para o aluno vinculado.
- Atalhos por papel no painel autenticado.

### Domínio e banco

- Tabelas `availability_rules` e `availability_exceptions`.
- Fuso do perfil e função `get_available_slots`.
- Geração de slots no banco considerando duração, futuro e bloqueios.

### Segurança e privacidade

- Apenas o personal altera a própria disponibilidade.
- Apenas o personal e alunos com vínculo ativo podem consultá-la.
- A função de slots repete a autorização no banco.

### Testes

- Unitários: validação de intervalos e bloqueios.
- Banco/integração: verificação manual da migração e das políticas no projeto remoto.
- E2E: navegação responsiva após a aplicação da migração.

## Riscos e casos extremos

- Concorrência: regras sobrepostas não duplicam slots no resultado.
- Repetição/idempotência: a restrição única rejeita o mesmo intervalo duplicado.
- Datas e fuso: persistência em `timestamptz` e geração em `America/Sao_Paulo`.
- Falha intermediária: escrita e geração são operações independentes e atômicas no banco.

## Verificação

- [x] Estados de carregamento, vazio e erro tratados
- [x] Testes adicionados
- [x] Quality gate executado
- [x] Documentação atualizada
- [x] Migração aplicada e acesso público anônimo verificado no banco remoto
- [x] Layout validado em largura de celular
- [ ] Critérios de aceite demonstrados de ponta a ponta
