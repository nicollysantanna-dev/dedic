import { Link } from 'react-router-dom'

import {
  ContactLink,
  LegalDocumentLayout,
  LegalSection,
} from '@/features/legal/LegalDocumentLayout'

const inlineLinkClass =
  'font-semibold text-[var(--brand)] underline decoration-2 underline-offset-4'

export function TermsPage() {
  return (
    <LegalDocumentLayout title="Termos de uso do Dedic">
      <LegalSection title="1. O serviço">
        <p>
          O Dedic é um aplicativo para personal trainers e alunos organizarem agenda,
          créditos de aulas, pagamentos, treinos e evolução física. O Dedic é oferecido
          por Nicolly Cristine Santanna de Oliveira (contato: <ContactLink />
          ).
        </p>
      </LegalSection>

      <LegalSection title="2. Aceite">
        <p>
          Ao criar sua conta você concorda com estes termos e com a{' '}
          <Link className={inlineLinkClass} to="/privacidade">
            Política de privacidade
          </Link>
          . Se não concordar, não use o serviço.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro">
        <p>
          Você deve ter 18 anos ou mais, ou, se for menor, usar o Dedic com autorização do
          seu responsável legal, que aceita estes termos por você. Informe dados
          verdadeiros e mantenha sua senha em sigilo; você responde pelo uso da sua conta.
        </p>
      </LegalSection>

      <LegalSection title="4. O Dedic não presta serviço de saúde">
        <p>
          O Dedic é uma ferramenta de organização. Orientações de treino, cargas, metas e
          avaliações são de responsabilidade do personal trainer. Procure um profissional
          de saúde antes de iniciar ou alterar atividades físicas.
        </p>
      </LegalSection>

      <LegalSection title="5. Aulas, créditos e pagamentos">
        <p>
          Agendamento, cancelamento e remarcação seguem as regras exibidas no aplicativo
          (por exemplo, cancelamento até o dia anterior devolve o crédito). O Dedic não
          processa pagamentos: apenas registra o que personal e aluno informam. Acordos
          financeiros e reembolsos são tratados diretamente entre as partes.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso adequado">
        <p>
          Não tente acessar dados de outras pessoas, burlar regras do aplicativo ou
          prejudicar seu funcionamento. Envie apenas fotos suas ou que você tenha direito
          de usar, sem conteúdo ilegal ou ofensivo. Podemos suspender contas que violem
          estes termos.
        </p>
      </LegalSection>

      <LegalSection title="7. Integração com o Hevy">
        <p>
          A conexão com o Hevy é opcional e depende de um serviço de terceiros, com termos
          próprios. Não respondemos por indisponibilidade ou mudanças nesse serviço.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade">
        <p>
          O Dedic está em fase piloto e é oferecido como está. Buscamos mantê-lo
          disponível e correto, mas podem ocorrer interrupções, erros ou mudanças de
          funcionalidades.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilidade">
        <p>
          Na extensão permitida pela lei, não respondemos por danos indiretos decorrentes
          do uso do aplicativo, de informações registradas pelos usuários ou de decisões
          tomadas com base nelas. Nada nestes termos limita direitos garantidos pelo
          Código de Defesa do Consumidor.
        </p>
      </LegalSection>

      <LegalSection title="10. Exclusão da conta">
        <p>
          Você pode excluir sua conta a qualquer momento em Conta → Excluir conta. O que é
          apagado e o que permanece anonimizado está descrito na{' '}
          <Link className={inlineLinkClass} to="/privacidade">
            Política de privacidade
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações">
        <p>
          Podemos atualizar estes termos. A data de vigência no topo indica a versão
          atual; mudanças relevantes serão avisadas no aplicativo.
        </p>
      </LegalSection>

      <LegalSection title="12. Lei e foro">
        <p>Aplica-se a lei brasileira. Fica eleito o foro do domicílio do usuário.</p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>
          <ContactLink />
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
