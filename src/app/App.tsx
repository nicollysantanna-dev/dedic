import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'

import { RequireAuth } from '@/features/auth/RequireAuth'
import { SupabaseSetupPage } from '@/features/auth/SupabaseSetupPage'
import { isSupabaseConfigured } from '@/lib/env'

const AuthPage = lazy(() =>
  import('@/features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const AgendaHomePage = lazy(() =>
  import('@/features/appointments/AgendaHomePage').then((module) => ({
    default: module.AgendaHomePage,
  })),
)
const AvailabilityPage = lazy(() =>
  import('@/features/availability/AvailabilityPage').then((module) => ({
    default: module.AvailabilityPage,
  })),
)
const StudentCalendarPage = lazy(() =>
  import('@/features/availability/StudentCalendarPage').then((module) => ({
    default: module.StudentCalendarPage,
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
const TrainerBookingPage = lazy(() =>
  import('@/features/appointments/TrainerBookingPage').then((module) => ({
    default: module.TrainerBookingPage,
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
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<AgendaHomePage />} />
            <Route path="/app/resumo" element={<DashboardPage />} />
            <Route path="/app/disponibilidade" element={<AvailabilityPage />} />
            <Route path="/app/calendario" element={<StudentCalendarPage />} />
            <Route path="/app/pacotes" element={<PackagesPage />} />
            <Route path="/app/agenda" element={<AppointmentsPage />} />
            <Route path="/app/criar-aula" element={<TrainerBookingPage />} />
            <Route path="/app/remarcar/:appointmentId" element={<ReschedulePage />} />
            <Route path="/app/pagamentos" element={<PaymentsPage />} />
          </Route>
          <Route path="/inicio" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MotionConfig>
    </Suspense>
  )
}
