// Servidor mínimo que serve o SPA (dist/), ENCAMINHA /api/* para o backend e
// injeta meta OpenGraph dinâmicas
// em /cursos/:id, /noticias/:id e /cotacao — para preview de link em WhatsApp/redes,
// cujos crawlers não executam JS. Demais rotas caem no index.html (SPA).
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize } from 'node:path'
import { markdownToText } from './markdown-text.mjs'
import { diaDaCotacao, resumoDaCotacao } from './cotacao-resumo.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const BACKEND = (process.env.BACKEND_URL || 'https://sindicatoruraltrbackend.nakaidev.tech').replace(/\/+$/, '')
const PORT = Number(process.env.PORT || 80)
const SITE = 'Sindicato Rural de Terra Roxa'

const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8')

const app = Fastify({ logger: false })
// serve:false → sem rotas automáticas; controlamos tudo e usamos reply.sendFile.
await app.register(fastifyStatic, { root: DIST, serve: false })

// O corpo das requisições passa CRU para o backend. `removeAllContentTypeParsers`
// é obrigatório: o Fastify traz parser próprio para application/json, e com ele
// o corpo chegava aqui como objeto já interpretado — no repasse virava a string
// "[object Object]" e o backend respondia 500. Nenhuma rota deste servidor lê o
// corpo, então ninguém mais depende dos parsers.
app.removeAllContentTypeParsers()
app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body))

// Cabeçalhos que pertencem à conexão com ESTE servidor: repassá-los adiante
// (ou de volta) faz o cliente ler um corpo que não corresponde ao que chegou.
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
  'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'content-length', 'content-encoding',
])

/**
 * Encaminha /api/* para o backend, tirando o prefixo. É o que faz o navegador
 * conversar com a PRÓPRIA origem: sem domínio cruzado, não há CORS — e o
 * endereço do backend deixa de ser assado no bundle, virando uma variável de
 * runtime. A mesma imagem serve staging e produção.
 */
app.all('/api/*', async (req, reply) => {
  const caminho = req.url.slice('/api'.length) || '/'
  const cabecalhos = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) => !HOP_BY_HOP.has(k.toLowerCase())),
  )

  try {
    const r = await fetch(`${BACKEND}${caminho}`, {
      method: req.method,
      headers: cabecalhos,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      redirect: 'manual',
    })

    for (const [k, v] of r.headers) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) reply.header(k, v)
    }
    // Buffer inteiro: os maiores corpos aqui são upload de comprovante (15 MB)
    // e PDF gerado, ambos pequenos o bastante para não valer streaming.
    return reply.status(r.status).send(Buffer.from(await r.arrayBuffer()))
  } catch {
    // Backend fora do ar não pode virar a tela de 404 do SPA: o app trata 502
    // como falha de rede e mostra "Tentar de novo".
    return reply.status(502).send({ error: 'Backend indisponível' })
  }
})

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

  const desc = markdownToText(description).slice(0, 200) || null
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

// A tela enxuta das cotações é feita para circular em grupo de WhatsApp: a
// prévia do link precisa JÁ mostrar os preços, senão o link no grupo não diz
// nada e ninguém abre.
app.get('/cotacao', async (req, reply) => {
  const quotes = await fetchJson('/market-quotes')
  if (!Array.isArray(quotes) || quotes.length === 0) return sendHtml(reply, indexHtml)
  const dia = diaDaCotacao(quotes)
  return sendHtml(
    reply,
    inject(indexHtml, {
      title: dia ? `Cotações de ${dia}` : 'Cotações do dia',
      description: resumoDaCotacao(quotes),
      image: null,
      url: reqUrl(req),
    }),
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
  // Asset hashado que não existe mais (deploy trocou os hashes) → 404 real.
  // Sem isso o SPA-fallback devolveria index.html como se fosse .js e a aba
  // velha quebraria com "Failed to fetch dynamically imported module".
  if (rel.startsWith('assets/') && last.includes('.')) {
    return reply.code(404).type('text/plain').send('Not Found')
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
