import { z } from 'zod'

// Espelha o JSON devolvido por `monthly_report` (ver migração de gamificação).
const dayCheckInSchema = z.object({
  day: z.string(),
  had_workout: z.boolean(),
  had_lesson: z.boolean(),
})

const weekSchema = z.object({
  week_start: z.string(),
  check_ins: z.number(),
  target: z.number(),
  met: z.boolean(),
  closed: z.boolean(),
})

const achievementSchema = z.object({
  code: z.string(),
  period_start: z.string().nullable(),
  earned_at: z.string(),
})

const nextAchievementSchema = z.object({
  code: z.string(),
  current: z.number(),
  target: z.number(),
})

export const monthlyReportSchema = z.object({
  month: z.string(),
  in_progress: z.boolean(),
  check_ins: z.number(),
  days: z.array(dayCheckInSchema),
  weeks: z.array(weekSchema),
  streak: z.object({ current: z.number(), best: z.number() }),
  achievements: z.array(achievementSchema),
  next_achievement: nextAchievementSchema.nullable(),
  lessons_completed: z.number(),
})

export type MonthlyReport = z.infer<typeof monthlyReportSchema>
