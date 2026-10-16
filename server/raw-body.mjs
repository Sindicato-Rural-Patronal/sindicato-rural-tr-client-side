// Corpo das requisições que o proxy (/api/*) repassa CRU para o backend.
//
// O limite precisa ficar ACIMA do maior arquivo que o backend aceita (15 MB:
// comprovante do Financeiro e ficha escaneada). Sem ele vale o padrão do
// Fastify, 1 MB, e foto de galeria, banner ou comprovante voltavam 413 daqui,
// antes de chegar ao backend.
export const BODY_LIMIT = 16 * 1024 * 1024

// `removeAllContentTypeParsers` é obrigatório: o Fastify traz parser próprio
// para application/json, e com ele o corpo chegava aqui como objeto já
// interpretado — no repasse virava a string "[object Object]" e o backend
// respondia 500. Nenhuma rota deste servidor lê o corpo, então ninguém mais
// depende dos parsers.
export function acceptRawBody(app) {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: BODY_LIMIT }, (_req, body, done) => done(null, body))
}
