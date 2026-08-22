# Configuração do Supabase — Desenvolvimento

## Projeto

- Nome: `dedic`
- Referência: `tzlvkespuzzoabrvzokj`
- URL: `https://tzlvkespuzzoabrvzokj.supabase.co`

## Credenciais do frontend

O arquivo `.env.local` deve conter:

```text
VITE_SUPABASE_URL=https://tzlvkespuzzoabrvzokj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_APP_TIMEZONE=America/Sao_Paulo
```

Use apenas a chave **Publishable** no frontend. Nunca use `service_role`, secret key,
senha do banco ou token pessoal em uma variável `VITE_*`.

Depois de alterar o arquivo, reinicie `npm run dev`.

## Aplicar a primeira migração pelo Dashboard

Este passo é necessário enquanto a CLI local não estiver autenticada.

1. Abra o projeto `dedic` no Supabase.
2. Acesse **SQL Editor**.
3. Crie uma nova consulta.
4. Copie todo o conteúdo de
   `supabase/migrations/20260822180000_identity_and_relationships.sql`.
5. Revise se a consulta começa com a criação da extensão `citext` e termina com os
   comandos `grant`.
6. Execute a consulta uma única vez.
7. Confirme no **Table Editor** a existência de:
   - `profiles`;
   - `trainer_student_relationships`;
   - `student_invitations`.

Não execute partes isoladas da migração. Ela cria tipos, tabelas, índices, gatilhos,
funções e políticas RLS como uma única versão do esquema.

## Aplicar a migração de disponibilidade do Marco 3

Depois da primeira migração:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de
   `supabase/migrations/20260822200000_availability.sql`.
3. Execute a consulta uma única vez.
4. Confirme no **Table Editor** a existência de `availability_rules` e
   `availability_exceptions`.
5. Em **Database → Functions**, confirme `get_available_slots`.

Essa migração também adiciona o fuso ao perfil e cria as políticas RLS. Não crie as
tabelas manualmente pelo Table Editor.

## Aplicar a migração de pacotes e créditos do Marco 4

Depois da migração de disponibilidade:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de
   `supabase/migrations/20260822220000_packages_and_credits.sql`.
3. Execute a consulta uma única vez.
4. Confirme `lesson_packages` e `credit_transactions` no **Table Editor**.
5. Confirme as funções `activate_lesson_package`, `cancel_lesson_package`,
   `adjust_student_credits` e `get_credit_balance`.

Não conceda escrita direta em `credit_transactions`: os lançamentos são criados
exclusivamente pelas funções transacionais versionadas.

## Aplicar a migração de agendamentos do Marco 5

Depois da migração de pacotes e créditos:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de
   `supabase/migrations/20260822233000_appointments_and_booking.sql`.
3. Execute a consulta uma única vez.
4. Confirme `appointments` e `appointment_events` no **Table Editor**.
5. Confirme a função `book_appointment`.

A aplicação não recebe permissão direta de escrita nessas tabelas. Reserva, débito e
evento são criados atomicamente pela função versionada.

## Aplicar a migração de cancelamento e remarcação do Marco 6

Depois da migração de agendamentos:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de
   `supabase/migrations/20260823010000_cancellation_and_rescheduling.sql`.
3. Execute a consulta uma única vez.
4. Confirme as funções `cancel_appointment` e `reschedule_appointment`.

As duas operações preservam o histórico. O cancelamento cria lançamento de devolução
e a remarcação vincula a substituta à original sem novo movimento de crédito.

## Aplicar a migração de operação da aula do Marco 7

Depois da migração de cancelamento e remarcação:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de
   `supabase/migrations/20260823030000_lesson_operation.sql`.
3. Execute a consulta uma única vez.
4. Confirme as funções `complete_appointment` e `correct_appointment_outcome`.

Somente o personal envolvido pode concluir ou corrigir uma aula. Realização e falta
mantêm o crédito consumido; correções exigem justificativa e geram um novo evento
imutável.

## Aplicar a migração de pagamentos do Marco 8

Depois da migração de operação da aula:

1. Abra **SQL Editor** e crie uma nova consulta.
2. Copie todo o conteúdo de `supabase/migrations/20260823050000_payments.sql`.
3. Execute a consulta uma única vez.
4. Confirme as tabelas `payments` e `payment_events`.
5. Confirme a função `save_payment`.

Somente o personal registra ou atualiza pagamentos. O aluno possui leitura dos
próprios registros, e nenhuma baixa financeira altera créditos ou ativa pacotes.

## Aplicar créditos sem vencimento e agendamento pelo personal

Depois da migração de pagamentos, execute integralmente
`supabase/migrations/20260823070000_non_expiring_credits_and_trainer_booking.sql`.

A migração remove a exclusividade de pacote ativo, mantém créditos após a data de
renovação e adiciona `book_appointment_for_student`. O consumo segue o pacote ativo
mais antigo com saldo e registra quem criou a aula.

## Configuração de autenticação

No Dashboard, em **Authentication → URL Configuration**, configure:

- Site URL local: `http://127.0.0.1:5173`;
- Redirect URL adicional: `http://localhost:5173`.

Durante o desenvolvimento local, **Confirm email está desabilitado**. O SMTP padrão
do Supabase permite somente dois e-mails por hora e não suporta aumento desse limite.
Assim, novas contas entram imediatamente sem disparar e-mail de confirmação.

Antes do piloto em produção, configure um provedor SMTP próprio e reative **Confirm
email**. Só então ajuste o limite em **Authentication → Rate Limits**.

## Verificação manual mínima

1. Crie uma conta de personal.
2. Entre automaticamente após o cadastro.
3. Crie um convite para um segundo e-mail.
4. Crie uma conta de aluno usando exatamente o e-mail convidado.
5. Entre automaticamente após o cadastro.
6. Aceite o convite.
7. Confirme que o personal vê o aluno como vínculo ativo.

## Autenticar a CLI posteriormente

Quando a CLI estiver autenticada, conecte este diretório ao projeto:

```bash
npx supabase link --project-ref tzlvkespuzzoabrvzokj
```

As próximas migrações poderão ser aplicadas com:

```bash
npx supabase db push
```

Não salve tokens pessoais ou a senha do banco no repositório.
