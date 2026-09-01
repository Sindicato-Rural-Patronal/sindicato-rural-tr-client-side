// Servidor mínimo que serve o SPA (dist/) e injeta meta OpenGraph dinâmicas
// em /cursos/:id e /noticias/:id — para preview de link em WhatsApp/redes,
// cujos crawlers não executam JS. Demais rotas caem no index.html (SPA).
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const BACKEND = (process.env.BACKEND_URL || 'https://sindicatoruraltrbackend.nakaidev.tech').replace(/\/+$/, '')
const PORT = Number(process.env.PORT || 80)
const SITE = 'Sindicato Rural de Terra Roxa'

const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8')

const app = Fastify({ logger: false })
// serve:false → sem rotas automáticas; controlamos tudo e usamos reply.sendFile.
await app.register(fastifyStatic, { root: DIST, serve: false })

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inject(html, { title, description, image, url }) {
  const fullTitle = title ? `${title} · ${SITE}` : SITE
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(fullTitle)}</title>`)

  const setMeta = (attr, key, val) => {
    if (val == null || val === '') return
    const re = new RegExp(`(<meta[^>]*${attr}=["']${key}["'][^>]*content=["'])[^"']*(["'])`, 'i')
    if (re.test(out)) out = out.replace(re, `$1${esc(val)}$2`)
    else out = out.replace('</head>', `  <meta ${attr}="${key}" content="${esc(val)}" />\n</head>`)
  }

  const desc = description ? String(description).replace(/\s+/g, ' ').trim().slice(0, 200) : null
  setMeta('property', 'og:title', fullTitle)
  setMeta('name', 'twitter:title', fullTitle)
  setMeta('name', 'description', desc)
  setMeta('property', 'og:description', desc)
  setMeta('name', 'twitter:description', desc)
  setMeta('property', 'og:image', image)
  setMeta('name', 'twitter:image', image)
  setMeta('property', 'og:url', url)
  return out
}

async function fetchJson(path) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const r = await fetch(`${BACKEND}${path}`, { signal: ctrl.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function reqUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0]
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString()
  return host ? `${proto}://${host}${req.url}` : undefined
}

function sendHtml(reply, html) {
  reply.type('text/html; charset=utf-8')
  return html
}

app.get('/cursos/:id', async (req, reply) => {
  const c = await fetchJson(`/courses/${encodeURIComponent(req.params.id)}`)
  if (!c) return sendHtml(reply, indexHtml)
  return sendHtml(
    reply,
    inject(indexHtml, { title: c.title, description: c.description, image: c.coverImage, url: reqUrl(req) }),
  )
})

app.get('/noticias/:id', async (req, reply) => {
  const n = await fetchJson(`/news/${encodeURIComponent(req.params.id)}`)
  if (!n) return sendHtml(reply, indexHtml)
  return sendHtml(
    reply,
    inject(indexHtml, { title: n.title, description: n.summary, image: n.bannerUrl, url: reqUrl(req) }),
  )
})

// Assets existentes → arquivo; qualquer outra rota → index.html (SPA).
app.get('/*', (req, reply) => {
  const rel = normalize(req.params['*'] || '').replace(/^(\.\.(\/|\\|$))+/, '')
  const abs = join(DIST, rel)
  const last = rel.split(/[/\\]/).pop() || ''
  if (last.includes('.') && abs.startsWith(DIST) && existsSync(abs)) {
    return reply.sendFile(rel)
  }
  return sendHtml(reply, indexHtml)
})

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`SPA server listening at ${address} (backend: ${BACKEND})`)
})
