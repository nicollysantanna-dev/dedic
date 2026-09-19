import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/format'

/** Link `wa.me` para um telefone em E.164 com mensagem pré-preenchida. */
export function whatsappLink(phone: string | null | undefined, message: string) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

const firstName = (name: string) => name.split(' ')[0] ?? name

export const whatsappTemplates = {
  lessonReminder: (studentName: string, startsAt: string) =>
    `Oi, ${firstName(studentName)}! Passando para lembrar da nossa aula em ${formatDateTime(startsAt)}. Qualquer imprevisto, me avisa por aqui ou pelo Dedic. Até lá!`,
  paymentDue: (studentName: string, amountCents: number, dueOn: string) =>
    `Oi, ${firstName(studentName)}! Só lembrando que o pagamento de ${formatCurrency(amountCents)} vence em ${formatDateOnly(dueOn)}. Se já pagou, desconsidera. Obrigada!`,
  paymentOverdue: (studentName: string, amountCents: number, dueOn: string) =>
    `Oi, ${firstName(studentName)}! O pagamento de ${formatCurrency(amountCents)} venceu em ${formatDateOnly(dueOn)}. Consegue regularizar? Se precisar de outra forma de pagamento, me avisa.`,
  renewal: (studentName: string, balance: number) =>
    `Oi, ${firstName(studentName)}! ${
      balance <= 0
        ? 'Seus créditos acabaram'
        : `Você ainda tem ${balance} crédito${balance === 1 ? '' : 's'}`
    }. Quer renovar o pacote para garantir os próximos horários?`,
  inactivity: (studentName: string) =>
    `Oi, ${firstName(studentName)}! Senti sua falta nos treinos. Bora marcar a próxima aula? É só escolher um horário no Dedic.`,
}
