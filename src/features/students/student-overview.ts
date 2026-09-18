import type { Tables } from '@/lib/supabase/database.types'

type Relationship = Pick<Tables<'trainer_student_relationships'>, 'id' | 'student_id'> & {
  profiles: Pick<Tables<'profiles'>, 'full_name' | 'phone'> | null
}
type Appointment = Pick<Tables<'appointments'>, 'student_id' | 'starts_at' | 'status'>
type Package = Pick<
  Tables<'lesson_packages'>,
  'student_id' | 'status' | 'expires_on' | 'lesson_count'
>
type Payment = Pick<Tables<'payments'>, 'student_id' | 'status' | 'due_on'>
type Credit = Pick<Tables<'credit_transactions'>, 'student_id' | 'amount'>

export type StudentOverview = {
  relationshipId: string
  studentId: string
  name: string
  phone: string | null
  balance: number
  attendance: number | null
  nextAppointment: string | null
  renewalDate: string | null
  paymentStatus: Tables<'payments'>['status'] | null
  needsAttention: boolean
}

export function buildStudentOverviews({
  relationships,
  appointments,
  packages,
  payments,
  credits,
  now = new Date(),
}: {
  relationships: readonly Relationship[]
  appointments: readonly Appointment[]
  packages: readonly Package[]
  payments: readonly Payment[]
  credits: readonly Credit[]
  now?: Date
}): StudentOverview[] {
  return relationships
    .map((relationship) => {
      const studentAppointments = appointments.filter(
        (item) => item.student_id === relationship.student_id,
      )
      const completed = studentAppointments.filter(
        (item) => item.status === 'completed',
      ).length
      const noShows = studentAppointments.filter(
        (item) => item.status === 'student_no_show',
      ).length
      const attendanceBase = completed + noShows
      const nextAppointment = studentAppointments
        .filter((item) => item.status === 'scheduled' && new Date(item.starts_at) >= now)
        .sort(
          (left, right) =>
            new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
        )[0]
      const activePackage = packages
        .filter(
          (item) =>
            item.student_id === relationship.student_id && item.status === 'active',
        )
        .sort((left, right) => left.expires_on.localeCompare(right.expires_on))[0]
      const payment = payments
        .filter(
          (item) =>
            item.student_id === relationship.student_id &&
            (item.status === 'pending' || item.status === 'overdue'),
        )
        .sort((left, right) => left.due_on.localeCompare(right.due_on))[0]
      const balance = credits
        .filter((item) => item.student_id === relationship.student_id)
        .reduce((total, item) => total + item.amount, 0)
      const attendance = attendanceBase
        ? Math.round((completed / attendanceBase) * 100)
        : null
      const needsAttention =
        balance <= 1 ||
        payment?.status === 'overdue' ||
        (attendance !== null && attendance < 70)

      return {
        relationshipId: relationship.id,
        studentId: relationship.student_id,
        name: relationship.profiles?.full_name ?? 'Aluno',
        phone: relationship.profiles?.phone ?? null,
        balance,
        attendance,
        nextAppointment: nextAppointment?.starts_at ?? null,
        renewalDate: activePackage?.expires_on ?? null,
        paymentStatus: payment?.status ?? null,
        needsAttention,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}
