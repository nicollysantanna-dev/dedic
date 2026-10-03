# Termos de uso e política de privacidade — design

Data: 02/10/2026 · Marco: M7b (preparação para produção)

> Os textos abaixo são uma minuta técnica. Não substituem revisão jurídica; recomenda-se
> revisão por advogado antes de ampliar o uso além do piloto.

## Objetivo

Quem usa o Dedic consegue ler, sem login, os termos de uso e a política de privacidade,
e é informado no cadastro de que, ao criar a conta, concorda com ambos — inclusive com o
tratamento dos dados de saúde que registrar.

## Decisões (02/10/2026)

| Tema         | Decisão                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| Controladora | Pessoa física: Nicolly Cristine Santanna de Oliveira · nicollyengenheira@gmail.com            |
| Aceite       | Só aviso no cadastro com links; nada é gravado no banco.                                      |
| Idade        | Maiores de 18 ou menores com autorização do responsável legal, que aceita os termos por eles. |
| Formato      | Páginas React em rotas públicas, mesmo visual do app.                                         |
| Versão       | `2026-10-02`, exibida como "Vigente desde 2 de outubro de 2026".                              |

Risco aceito: sem registro do aceite não há prova do consentimento específico para dados
de saúde (LGPD art. 8º, §2º, e art. 11, I). Reavaliar após o piloto (ADR 0009).

## Telas e navegação

- Rotas públicas `/termos` (`TermsPage`) e `/privacidade` (`PrivacyPage`), lazy como as
  demais, fora de `RequireAuth`. Acessíveis também com sessão ativa.
- Layout: fundo do app, cartão branco de leitura (largura máxima confortável), `h1`,
  linha "Vigente desde 2 de outubro de 2026", seções com `h2`, link "Voltar" para a página
  anterior (ou `/` sem histórico). Mobile-first, sem rolagem horizontal.
- Cadastro (`AuthPage` modo `signup`), acima do botão de criar conta:
  "Ao criar sua conta, você concorda com os [Termos de uso] e a [Política de privacidade],
  inclusive com o tratamento dos dados de saúde que você registrar." Links abrem em nova
  aba (`target="_blank"`, `rel="noopener noreferrer"`) para não perder o formulário.
- Entrada (`AuthPage` modo `login`) e `/app/conta`: rodapé discreto com os dois links.
- Conteúdo em componentes próprios (`src/features/legal/`), separado do layout, para que
  uma nova versão troque só o texto e a data.

## Testes

- Testing Library: o aviso do cadastro contém os links `Termos de uso` (`/termos`) e
  `Política de privacidade` (`/privacidade`); cada página renderiza seu `h1`, a linha de
  vigência e o e-mail de contato.
- Playwright (mobile e desktop): `/termos` e `/privacidade` abrem sem login, sem violação
  de CSP; o link do cadastro leva à página certa.

## Documentação

- ADR 0009 — termos e privacidade sem registro de aceite (decisão, risco, revisão futura).
- `MVP_REQUIREMENTS.md`: requisito de termos e política acessíveis e aviso no cadastro.

## Texto — Política de privacidade

**Política de privacidade do Dedic**

Vigente desde 2 de outubro de 2026.

**1. Quem somos**
O Dedic é um aplicativo que organiza aulas, créditos, treinos e a evolução física entre
personal trainers e seus alunos. A responsável pelo tratamento dos dados (controladora) é
Nicolly Cristine Santanna de Oliveira. Para qualquer assunto sobre seus dados, escreva
para nicollyengenheira@gmail.com.

**2. Quais dados tratamos**

- Cadastro: nome, e-mail, senha (guardada apenas como hash, nunca em texto), telefone,
  papel (personal ou aluno) e foto de perfil, se você enviar.
- Uso do serviço: horários de disponibilidade, aulas agendadas, canceladas e realizadas,
  pacotes, créditos e pagamentos registrados pelas partes, notificações e convites.
- Dados de saúde, quando você ou seu personal os registram: peso, medidas corporais,
  fotos de evolução e metas.
- Treinos: fichas, exercícios, séries, cargas, repetições, recordes e fotos de aparelhos.
- Integração com o Hevy, se você conectar: a chave de API, guardada em cofre cifrado, e
  os treinos importados.

**3. Para que usamos e com qual base legal**

- Prestar o serviço que você contratou ao criar a conta — agenda, créditos, pagamentos,
  treinos e notificações (execução de contrato, LGPD art. 7º, V).
- Dados de saúde: registrar e mostrar sua evolução para você e para o personal vinculado,
  com o seu consentimento (LGPD art. 11, I). O registro desses dados é opcional, e você pode editá-los ou apagá-los a qualquer momento, ou excluir a conta.
- Segurança, prevenção de fraude e cumprimento de obrigações legais (LGPD art. 7º, II e IX).

Não vendemos seus dados, não exibimos anúncios e não criamos perfis para publicidade.

**4. Com quem compartilhamos**

- Com o personal ou o aluno com quem você tem vínculo ativo, na medida do necessário para
  as aulas e o acompanhamento. Quando o vínculo termina, o acesso aos dados de evolução
  também termina.
- Com prestadores que operam o serviço em nosso nome: Supabase (banco de dados,
  autenticação e armazenamento de arquivos) e Vercel (hospedagem do aplicativo). Esses
  prestadores podem armazenar dados fora do Brasil; a transferência ocorre para a execução
  do serviço e com garantias contratuais de proteção (LGPD art. 33).
- Com o Hevy, apenas se você conectar sua conta, para importar seus treinos.
- Com autoridades, quando a lei exigir.

**5. Por quanto tempo guardamos**
Enquanto sua conta existir. Se você excluir a conta (em Conta → Excluir conta), apagamos
seus dados de saúde, sua foto, seu telefone e a conexão com o Hevy, e anonimizamos o
restante: aulas, créditos, pagamentos e treinos permanecem sem identificar você, porque
fazem parte do histórico da outra parte. Registros técnicos de acesso podem ser mantidos
pelos prestadores pelo prazo de suas próprias políticas.

**6. Seus direitos**
Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade,
eliminação, informação sobre compartilhamentos e revogação do consentimento (LGPD art. 18),
escrevendo para nicollyengenheira@gmail.com. Responderemos em até 15 dias. Você também pode
reclamar à Autoridade Nacional de Proteção de Dados (ANPD).

**7. Como protegemos**
O acesso a cada registro é controlado no próprio banco de dados, de forma que um aluno não
vê os dados de outro. Fotos de evolução e de perfil ficam em armazenamento privado, a chave
do Hevy fica em cofre cifrado e toda a comunicação usa HTTPS. Nenhum sistema é totalmente
imune a incidentes; se ocorrer um que possa causar risco relevante, avisaremos você e a ANPD.

**8. Armazenamento no navegador**
Usamos o armazenamento local do navegador apenas para manter sua sessão de login e, quando você abre um link de convite, guardar o convite até concluir o cadastro. Como o Dedic pode ser instalado como aplicativo (PWA), o navegador também guarda em cache os arquivos do próprio aplicativo, para carregar mais rápido e funcionar com conexão instável; esse cache não contém seus dados pessoais. Não usamos cookies de rastreamento, de publicidade ou de
análise de terceiros.

**9. Menores de idade**
Menores de 18 anos só podem usar o Dedic com autorização do responsável legal, que aceita
estes termos e esta política em nome deles e pode exercer os direitos do item 6.

**10. Alterações**
Podemos atualizar esta política. A data de vigência no topo indica a versão atual; mudanças
relevantes serão avisadas no aplicativo.

## Texto — Termos de uso

**Termos de uso do Dedic**

Vigente desde 2 de outubro de 2026.

**1. O serviço**
O Dedic é um aplicativo para personal trainers e alunos organizarem agenda, créditos de
aulas, pagamentos, treinos e evolução física. O Dedic é oferecido por Nicolly Cristine
Santanna de Oliveira (contato: nicollyengenheira@gmail.com).

**2. Aceite**
Ao criar sua conta você concorda com estes termos e com a Política de privacidade. Se não
concordar, não use o serviço.

**3. Cadastro**
Você deve ter 18 anos ou mais, ou, se for menor, usar o Dedic com autorização do seu
responsável legal, que aceita estes termos por você. Informe dados verdadeiros e mantenha
sua senha em sigilo; você responde pelo uso da sua conta.

**4. O Dedic não presta serviço de saúde**
O Dedic é uma ferramenta de organização. Orientações de treino, cargas, metas e avaliações
são de responsabilidade do personal trainer. Procure um profissional de saúde antes de
iniciar ou alterar atividades físicas.

**5. Aulas, créditos e pagamentos**
Agendamento, cancelamento e remarcação seguem as regras exibidas no aplicativo (por
exemplo, cancelamento até o dia anterior devolve o crédito). O Dedic não processa
pagamentos: apenas registra o que personal e aluno informam. Acordos financeiros e
reembolsos são tratados diretamente entre as partes.

**6. Uso adequado**
Não tente acessar dados de outras pessoas, burlar regras do aplicativo ou prejudicar seu
funcionamento. Envie apenas fotos suas ou que você tenha direito de usar, sem conteúdo
ilegal ou ofensivo. Podemos suspender contas que violem estes termos.

**7. Integração com o Hevy**
A conexão com o Hevy é opcional e depende de um serviço de terceiros, com termos próprios.
Não respondemos por indisponibilidade ou mudanças nesse serviço.

**8. Disponibilidade**
O Dedic está em fase piloto e é oferecido como está. Buscamos mantê-lo disponível e
correto, mas podem ocorrer interrupções, erros ou mudanças de funcionalidades.

**9. Responsabilidade**
Na extensão permitida pela lei, não respondemos por danos indiretos decorrentes do uso do
aplicativo, de informações registradas pelos usuários ou de decisões tomadas com base nelas.
Nada nestes termos limita direitos garantidos pelo Código de Defesa do Consumidor.

**10. Exclusão da conta**
Você pode excluir sua conta a qualquer momento em Conta → Excluir conta. O que é apagado e
o que permanece anonimizado está descrito na Política de privacidade.

**11. Alterações**
Podemos atualizar estes termos. A data de vigência no topo indica a versão atual; mudanças
relevantes serão avisadas no aplicativo.

**12. Lei e foro**
Aplica-se a lei brasileira. Fica eleito o foro do domicílio do usuário.

**13. Contato**
nicollyengenheira@gmail.com
