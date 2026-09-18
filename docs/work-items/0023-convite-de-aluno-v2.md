# Unidade de trabalho — Convite de aluno v2

## Resultado esperado

O personal adiciona um aluno por e-mail ou celular em uma tela simples, coerente com a nova área de gestão de alunos.

## Requisitos relacionados

- RF-03
- RNF-02
- RNF-03

## Cenários de aceite

- Dado um e-mail válido, quando o personal gera o convite, então recebe um link privado e o convite fica pendente.
- Dado um celular brasileiro válido, quando o personal gera o convite, então o contato é salvo no formato E.164 e o link pode ser compartilhado pelo WhatsApp.
- Dado um contato inválido ou repetido, quando o personal envia o formulário, então uma mensagem segura é exibida.
- Dado um aluno que acessa o convite válido, quando cria sua conta, então o vínculo é ativado automaticamente pela regra existente.
- Dado um aluno deslogado, quando alterna entre cadastro e entrada ou precisa confirmar o e-mail, então o token permanece salvo até a ativação do vínculo.
- Dado um convite que não pode ser ativado, quando o aluno entra, então a interface informa a falha em vez de ignorá-la silenciosamente.
- Dado um convite pendente válido, quando o personal precisa enviá-lo novamente, então consegue copiar o link ou abrir o WhatsApp sem criar outro registro.
- Dado um convite pendente expirado, quando o personal escolhe refazê-lo, então o anterior é cancelado e o contato volta preenchido para gerar um novo convite.

## Fora do escopo

- Envio automático de e-mail, SMS ou WhatsApp.
- Importação de contatos do aparelho.
- Convites em lote.

## Impacto previsto

### Interface

- Página dedicada com formulário, instruções, confirmação e ações de reenvio ou cancelamento dos convites pendentes.
- Layout responsivo e consistente com a área de alunos.

### Domínio e banco

- Reutiliza `student_invitations` e fortalece `claim_student_invitation` para identificar o e-mail autenticado diretamente em `auth.users`, sem depender do conteúdo opcional do JWT.

### Segurança e privacidade

- Apenas o personal autenticado cria e consulta os próprios convites via RLS.
- O link contém somente o token privado já previsto pelo domínio.

### Testes

- Unitários: normalização de e-mail, celular e máscara de digitação.
- Regressão: captura antecipada e preservação do token entre cadastro e entrada.
- Quality gate completo e smoke E2E.

## Riscos e casos extremos

- Convite duplicado continua protegido pelo índice único do banco.
- O vínculo por celular exige abertura do link privado pelo aluno.
- Falhas não exibem detalhes internos do Supabase.
- Uma falha da associação automática por e-mail nunca é tratada como sucesso neutro no frontend.

## Verificação

- [x] Critérios de aceite atendidos
- [x] Layout responsivo implementado
- [x] Estados de carregamento, vazio, erro e sucesso tratados
- [x] Autorização preservada no banco
- [x] Testes adicionados
- [x] Quality gate executado
- [x] Documentação atualizada
