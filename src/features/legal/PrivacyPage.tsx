import {
  ContactLink,
  LegalDocumentLayout,
  LegalList,
  LegalSection,
} from '@/features/legal/LegalDocumentLayout'

export function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Política de privacidade do Dedic">
      <LegalSection title="1. Quem somos">
        <p>
          O Dedic é um aplicativo que organiza aulas, créditos, treinos e a evolução
          física entre personal trainers e seus alunos. A responsável pelo tratamento dos
          dados (controladora) é Nicolly Cristine Santanna de Oliveira. Para qualquer
          assunto sobre seus dados, escreva para <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados tratamos">
        <LegalList
          items={[
            'Cadastro: nome, e-mail, senha (guardada apenas como hash, nunca em texto), telefone, papel (personal ou aluno) e foto de perfil, se você enviar.',
            'Uso do serviço: horários de disponibilidade, aulas agendadas, canceladas e realizadas, pacotes, créditos e pagamentos registrados pelas partes, notificações e convites.',
            'Dados de saúde, quando você ou seu personal os registram: peso, medidas corporais, fotos de evolução e metas.',
            'Treinos: fichas, exercícios, séries, cargas, repetições, recordes e fotos de aparelhos.',
            'Integração com o Hevy, se você conectar: a chave de API, guardada em cofre cifrado, e os treinos importados.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Para que usamos e com qual base legal">
        <LegalList
          items={[
            'Prestar o serviço que você contratou ao criar a conta — agenda, créditos, pagamentos, treinos e notificações (execução de contrato, LGPD art. 7º, V).',
            'Dados de saúde: registrar e mostrar sua evolução para você e para o personal vinculado, com o seu consentimento (LGPD art. 11, I). O registro desses dados é opcional, e você pode apagá-los a qualquer momento excluindo os registros ou a conta.',
            'Segurança, prevenção de fraude e cumprimento de obrigações legais (LGPD art. 7º, II e IX).',
          ]}
        />
        <p>
          Não vendemos seus dados, não exibimos anúncios e não criamos perfis para
          publicidade.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <LegalList
          items={[
            'Com o personal ou o aluno com quem você tem vínculo ativo, na medida do necessário para as aulas e o acompanhamento. Quando o vínculo termina, o acesso aos dados de evolução também termina.',
            'Com prestadores que operam o serviço em nosso nome: Supabase (banco de dados, autenticação e armazenamento de arquivos) e Vercel (hospedagem do aplicativo). Esses prestadores podem armazenar dados fora do Brasil; a transferência ocorre para a execução do serviço e com garantias contratuais de proteção (LGPD art. 33).',
            'Com o Hevy, apenas se você conectar sua conta, para importar seus treinos.',
            'Com autoridades, quando a lei exigir.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <p>
          Enquanto sua conta existir. Se você excluir a conta (em Conta → Excluir conta),
          apagamos seus dados de saúde, sua foto, seu telefone e a conexão com o Hevy, e
          anonimizamos o restante: aulas, créditos, pagamentos e treinos permanecem sem
          identificar você, porque fazem parte do histórico da outra parte. Registros
          técnicos de acesso podem ser mantidos pelos prestadores pelo prazo de suas
          próprias políticas.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>
          Você pode pedir confirmação de tratamento, acesso, correção, anonimização,
          portabilidade, eliminação, informação sobre compartilhamentos e revogação do
          consentimento (LGPD art. 18), escrevendo para <ContactLink />. Responderemos em
          até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="7. Como protegemos">
        <p>
          O acesso a cada registro é controlado no próprio banco de dados, de forma que um
          aluno não vê os dados de outro. Fotos de evolução e de perfil ficam em
          armazenamento privado, a chave do Hevy fica em cofre cifrado e toda a
          comunicação usa HTTPS. Nenhum sistema é totalmente imune a incidentes; se
          ocorrer um que possa causar risco relevante, avisaremos você e a ANPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Armazenamento no navegador">
        <p>
          Usamos o armazenamento local do navegador apenas para manter sua sessão de login
          e, quando você abre um link de convite, guardar o convite até concluir o
          cadastro. Não usamos cookies de rastreamento, de publicidade ou de análise de
          terceiros.
        </p>
      </LegalSection>

      <LegalSection title="9. Menores de idade">
        <p>
          Menores de 18 anos só podem usar o Dedic com autorização do responsável legal,
          que aceita estes termos e esta política em nome deles e pode exercer os direitos
          do item 6.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações">
        <p>
          Podemos atualizar esta política. A data de vigência no topo indica a versão
          atual; mudanças relevantes serão avisadas no aplicativo.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
