import type { APIRequestContext, Page } from '@playwright/test'

import { expect, test } from './fixtures'
import { login, password, users } from './helpers'

// Supabase local (mesmos valores públicos do playwright.config.ts).
const supabaseUrl = 'http://127.0.0.1:54321'
const anonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/** Cabeçalhos autenticados da aluna para chamar a API local. */
async function studentSession(request: APIRequestContext) {
  const session = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey },
    data: { email: users.student.email, password },
  })
  const { access_token: token, user } = (await session.json()) as {
    access_token: string
    user: { id: string }
  }
  return {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    studentId: user.id,
  }
}

type Session = Awaited<ReturnType<typeof studentSession>>

/** Cria uma ficha da aluna pela API, para o teste não depender do editor. */
async function createStudentRoutine(
  request: APIRequestContext,
  session: Session,
  name: string,
) {
  const exercises = (await (
    await request.get(`${supabaseUrl}/rest/v1/exercises?select=id&limit=1`, {
      headers: session.headers,
    })
  ).json()) as { id: string }[]
  const saved = await request.post(`${supabaseUrl}/rest/v1/rpc/save_routine`, {
    headers: session.headers,
    data: {
      routine: {
        id: null,
        name,
        notes: '',
        student_id: session.studentId,
        exercises: [
          {
            exercise_id: exercises[0].id,
            notes: '',
            rest_seconds: null,
            sets: [{ weight_kg: 10, reps: 10 }],
          },
        ],
      },
    },
  })
  expect(saved.ok()).toBe(true)
  return (await saved.json()) as string
}

/** Arquiva (não apaga) as fichas criadas pelo teste. */
async function archiveRoutines(
  request: APIRequestContext,
  session: Session,
  ids: string[],
) {
  for (const id of ids) {
    await request.post(`${supabaseUrl}/rest/v1/rpc/archive_routine`, {
      headers: session.headers,
      data: { target_routine_id: id },
    })
  }
}

/** Nomes das fichas na ordem da tela, limitados às fichas deste teste. */
async function visibleOrder(page: Page, names: string[]) {
  const texts = await page.locator('ul[aria-label="fichas"] > li').allInnerTexts()
  return texts.flatMap((text) => names.filter((name) => text.includes(name)))
}

async function dragDown(page: Page, from: number, to: number) {
  const handles = page.getByRole('button', { name: 'Arrastar para reordenar: fichas' })
  const start = await handles.nth(from).boundingBox()
  const end = await handles.nth(to).boundingBox()
  if (!start || !end) throw new Error('alça não encontrada')
  const x = start.x + start.width / 2
  const fromY = start.y + start.height / 2
  const toY = end.y + end.height / 2 + 6
  await page.mouse.move(x, fromY)
  await page.mouse.down()
  for (let step = 1; step <= 25; step++) {
    await page.mouse.move(x, fromY + ((toY - fromY) * step) / 25)
  }
  await page.mouse.up()
}

test('aluna reordena as fichas arrastando e pelo teclado', async ({ page, request }) => {
  const suffix = Date.now()
  const older = `Ordem A ${suffix}`
  const newer = `Ordem B ${suffix}`
  const session = await studentSession(request)
  const created = [
    await createStudentRoutine(request, session, older),
    await createStudentRoutine(request, session, newer),
  ]

  try {
    await login(page, users.student.email)
    await page.goto('/app/treinos')
    // Fichas novas entram no topo.
    await expect.poll(() => visibleOrder(page, [older, newer])).toEqual([newer, older])

    // Arrastar a primeira para baixo da segunda salva a nova ordem.
    await dragDown(page, 0, 1)
    await expect.poll(() => visibleOrder(page, [older, newer])).toEqual([older, newer])
    await page.reload()
    await expect.poll(() => visibleOrder(page, [older, newer])).toEqual([older, newer])

    // Teclado: espaço pega, seta desce, espaço solta.
    const handle = page
      .getByRole('button', { name: 'Arrastar para reordenar: fichas' })
      .first()
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(handle).toHaveAttribute('aria-pressed', 'true')
    // O dnd-kit mede as posições dos itens logo depois de pegar; uma pessoa nunca
    // aperta a seta tão rápido, mas o teste precisa esperar essa medição.
    await page.waitForTimeout(300)
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByRole('status').filter({ hasText: /^Posição 2 de \d+\.$/ }),
    ).toBeAttached()
    await page.keyboard.press('Space')
    await expect.poll(() => visibleOrder(page, [older, newer])).toEqual([newer, older])
    await page.reload()
    await expect.poll(() => visibleOrder(page, [older, newer])).toEqual([newer, older])
  } finally {
    await archiveRoutines(request, session, created)
  }
})
