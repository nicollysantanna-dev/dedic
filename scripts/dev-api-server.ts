// Servidor local só para desenvolvimento: expõe as funções de api/ (que em
// produção rodam como serverless functions na Vercel) via HTTP simples, sem
// depender do `vercel dev` — que hoje tem um bug conhecido com Vite 8
// (falha ao servir index.html/@vite/client). O `vite.config.ts` proxya
// `/api/*` para esta porta durante `npm run dev`.
// Uso: npm run dev:api (variáveis lidas de .env: SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, HEVY_API_BASE_URL).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import type { VercelRequest, VercelResponse } from '@vercel/node'

if (process.env.DEDIC_SKIP_DOTENV !== '1') {
  try {
    process.loadEnvFile('.env')
  } catch {
    // .env é opcional; as variáveis também podem já estar no ambiente.
  }
}

const routes: Record<
  string,
  () => Promise<{ default: (req: VercelRequest, res: VercelResponse) => Promise<void> }>
> = {
  '/api/hevy-sync': () => import('../api/hevy-sync'),
  '/api/hevy-sync-cron': () => import('../api/hevy-sync-cron'),
  '/api/delete-account': () => import('../api/delete-account'),
}

const port = Number(process.env.DEV_API_PORT ?? 3002)

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function toVercelResponse(res: ServerResponse): VercelResponse {
  const vercelRes = res as VercelResponse
  vercelRes.status = (code: number) => {
    res.statusCode = code
    return vercelRes
  }
  vercelRes.json = (data: unknown) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
    return vercelRes
  }
  return vercelRes
}

createServer((req, res) => {
  void (async () => {
    const url = req.url ?? ''
    const loadHandler = routes[url]
    if (!loadHandler) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'NOT_FOUND' }))
      return
    }

    const body = await readBody(req)
    const vercelReq = Object.assign(req, { body }) as VercelRequest
    const vercelRes = toVercelResponse(res)

    try {
      const { default: handler } = await loadHandler()
      await handler(vercelReq, vercelRes)
    } catch (error) {
      console.error(`[dev-api] erro não tratado em ${url}`, error)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'UNEXPECTED_ERROR' }))
      }
    }
  })()
}).listen(port, () => {
  console.log(`[dev-api] rotas de api/ disponíveis em http://localhost:${port}`)
})
