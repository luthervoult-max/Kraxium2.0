export interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
  query?: Record<string, string | string[] | undefined>
  url?: string
}

export interface ApiResponse {
  status: (statusCode: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  send?: (body: unknown) => void
  end: (body?: unknown) => void
}

export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export function withCors(req: ApiRequest, res: ApiResponse) {
  const origin = getHeader(req, 'origin')
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Telegram-Bot-Api-Secret-Token',
  )
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }

  return false
}

export function requireMethod(req: ApiRequest, method: string) {
  if (req.method !== method) {
    throw new HttpError(405, `Metodo ${req.method || 'desconhecido'} nao permitido.`)
  }
}

export function getHeader(req: ApiRequest, name: string) {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export function getBearerToken(req: ApiRequest) {
  const authorization = getHeader(req, 'authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Sessao ausente. Faca login novamente.')
  }

  return authorization.slice('Bearer '.length).trim()
}

export async function readJsonBody<T = Record<string, unknown>>(req: ApiRequest): Promise<T> {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) {
    const text = req.body.toString('utf8')
    return text.trim() ? (JSON.parse(text) as T) : ({} as T)
  }

  if (req.body && typeof req.body === 'object') {
    return req.body as T
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as T
  }

  return {} as T
}

export function sendError(res: ApiResponse, error: unknown) {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  const message = error instanceof Error ? error.message : 'Erro interno.'
  res.status(500).json({ error: message })
}
