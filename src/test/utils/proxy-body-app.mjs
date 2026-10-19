// App mínimo com o MESMO tratamento de corpo do proxy (server/raw-body.mjs),
// para o teste conferir o limite sem subir o servidor inteiro.
import Fastify from 'fastify'
import { acceptRawBody, BODY_LIMIT } from '../../../server/raw-body.mjs'

export { BODY_LIMIT }

export async function postBytes(bytes) {
  const app = Fastify({ logger: false, bodyLimit: BODY_LIMIT })
  acceptRawBody(app)
  app.post('/api/upload', async req => ({ size: req.body.length }))
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      payload: Buffer.alloc(bytes),
    })
    return { status: res.statusCode, size: res.statusCode === 200 ? res.json().size : null }
  } finally {
    await app.close()
  }
}
