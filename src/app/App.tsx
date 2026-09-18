import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'

import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { SupabaseSetupPage } from '@/features/auth/SupabaseSetupPage'
import { isSupabaseConfigured } from '@/lib/env'

const AuthPage = lazy(() =>
  import('@/features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const PasswordRecoveryPage = lazy(() =>
  import('@/features/auth/PasswordRecoveryPage').then((module) => ({
    default: module.PasswordRecoveryPage,
  })),
)
const NewPasswordPage = lazy(() =>
  import('@/features/auth/PasswordRecoveryPage').then((module) => ({
    default: module.NewPasswordPage,
  })),
)
const InviteStudentPage = lazy(() =>
  import('@/features/students/InviteStudentPage').then((module) => ({
    default: module.InviteStudentPage,
  })),
)
const StudentsPage = lazy(() =>
  import('@/features/students/StudentsPage').then((module) => ({
    default: module.StudentsPage,
  })),
)
const StudentProfilePage = lazy(() =>
  import('@/features/students/StudentProfilePage').then((module) => ({
    default: module.StudentProfilePage,
  })),
)
const HomePage = lazy(() =>
  import('@/features/dashboard/HomePage').then((module) => ({
    default: module.HomePage,
  })),
)
const AccountPage = lazy(() =>
  import('@/features/account/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
)
const PackagesPage = lazy(() =>
  import('@/features/packages/PackagesPage').then((module) => ({
    default: module.PackagesPage,
  })),
)
const AppointmentsPage = lazy(() =>
  import('@/features/appointments/AppointmentsPage').then((module) => ({
    default: module.AppointmentsPage,
  })),
)
const ReschedulePage = lazy(() =>
  import('@/features/appointments/ReschedulePage').then((module) => ({
    default: module.ReschedulePage,
  })),
)
const PaymentsPage = lazy(() =>
  import('@/features/payments/PaymentsPage').then((module) => ({
    default: module.PaymentsPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/features/foundation/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

export function App() {
  if (!isSupabaseConfigured) return <SupabaseSetupPage />

  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-[#f4f1e9] text-sm font-semibold text-[#183529]">
          Preparando o Dedic…
        </main>
      }
    >
      <MotionConfig reducedMotion="user" transition={{ duration: 0.24 }}>
        <Routes>
          <Route path="/" element={<AuthPage mode="login" />} />
          <Route path="/entrar" element={<Navigate to="/" replace />} />
          <Route path="/cadastro" element={<AuthPage mode="signup" />} />
          <Route path="/recuperar" element={<PasswordRecoveryPage />} />
          <Route path="/nova-senha" element={<NewPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/app" element={<HomePage />} />
              <Route path="/app/alunos" element={<StudentsPage />} />
              <Route path="/app/alunos/:studentId" element={<StudentProfilePage />} />
              <Route path="/app/alunos/convidar" element={<InviteStudentPage />} />
              <Route path="/app/financeiro" element={<PaymentsPage />} />
              <Route path="/app/conta" element={<AccountPage />} />
              <Route path="/app/resumo" element={<Navigate to="/app/alunos" replace />} />
              <Route
                path="/app/pagamentos"
                element={<Navigate to="/app/financeiro" replace />}
              />
              <Route
                path="/app/calendario"
                element={<Navigate to="/app/agenda" replace />}
              />
              <Route path="/app/pacotes" element={<PackagesPage />} />
              <Route path="/app/agenda" element={<AppointmentsPage />} />
              <Route path="/app/remarcar/:appointmentId" element={<ReschedulePage />} />
            </Route>
          </Route>
          <Route path="/inicio" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MotionConfig>
    </Suspense>
  )
}
