import { answerCallbackQuery, sendChatAction, sendMessage } from './telegram.js'
import { serviceSupabase } from './supabase.js'
import { createPixCharge, loadPixTransaction, verifyPixTransaction, type PixTransactionRow } from './pixPayments.js'

type JsonRecord = Record<string, unknown>

interface BotRecord {
  id: string
  owner_id: string
  name: string
}

interface FlowRecord {
  id: string
  bot_id: string | null
  owner_id: string
  graph: FlowGraph
}

interface FlowGraph {
  nodes?: FlowGraphNode[]
  edges?: FlowGraphEdge[]
}

interface FlowGraphNode {
  id: string
  type: string
  label?: string
  content?: string
  config?: JsonRecord
  outputs?: Array<{ id: string; label: string }>
}

interface FlowGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from?: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

interface TelegramMessage {
  message_id: number
  text?: string
  chat: { id: number | string }
  from?: TelegramUser
}

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

interface LeadRecord {
  id: string
  start_count: number
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  email?: string | null
  phone?: string | null
  telegram_chat_id?: string | null
  metadata?: JsonRecord | null
  last_node_id?: string | null
  last_node_type?: string | null
  source?: string | null
  campaign?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  device_type?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
}

interface ExecutionContext {
  bot: BotRecord
  flow: FlowRecord
  token: string
  chatId: string
  lead: LeadRecord
  text?: string
  callback?: { nodeIndex: number; outputIndex: number; id: string }
  resumeNodeId?: string | null
}

const START_NODE_ID = 'start_node'
const MAX_STEPS = 24
const MAX_INLINE_DELAY_MS = 10_000
const WAITING_TEXT_NODE_TYPES = new Set(['IN'])
const LEAD_SELECT =
  'id,start_count,first_name,last_name,display_name,email,phone,telegram_chat_id,metadata,last_node_id,last_node_type,source,campaign,utm_source,utm_medium,utm_campaign,utm_content,utm_term,device_type,country,region,city'

export async function handleTelegramWebhook(botId: string, token: string, update: TelegramUpdate) {
  const { bot, flow } = await loadBotAndActiveFlow(botId)
  const message = update.message ?? update.callback_query?.message
  const from = update.message?.from ?? update.callback_query?.from

  if (!message?.chat?.id || !from?.id) {
    return { ok: true, ignored: true }
  }

  const chatId = String(message.chat.id)
  const text = update.message?.text?.trim()
  const isStart = isStartCommand(text)
  const attribution = isStart ? parseStartAttribution(text) : {}
  const lead = await upsertLead({
    bot,
    flowId: flow?.id ?? null,
    chatId,
    user: from,
    isStart,
    attribution,
  })

  await serviceSupabase
    .from('bots')
    .update({ last_update_at: new Date().toISOString(), connection_status: 'active', webhook_last_error: null })
    .eq('id', bot.id)

  if (!flow) {
    await recordEvent({
      bot,
      lead,
      flowId: null,
      eventType: isStart ? 'start' : 'message',
      status: 'pending',
      message: 'Nenhum fluxo ativo vinculado ao bot.',
      metadata: { text, attribution },
    })
    await sendMessage(token, chatId, 'Este bot ainda nao tem um fluxo ativo vinculado.')
    return { ok: true, noActiveFlow: true }
  }

  if (update.callback_query) {
    const paymentCallback = parsePaymentCallbackData(update.callback_query.data)
    if (paymentCallback) {
      await handlePaymentVerification({
        bot,
        flow,
        token,
        chatId,
        lead,
        transactionId: paymentCallback.transactionId,
        callbackQueryId: update.callback_query.id,
      })
      return { ok: true, paymentCallback: true }
    }

    await answerCallbackQuery(token, update.callback_query.id).catch(() => undefined)
    const callback = parseCallbackData(update.callback_query.data)
    if (!callback) {
      await recordEvent({
        bot,
        lead,
        flowId: flow.id,
        eventType: 'message',
        status: 'error',
        message: 'Callback sem rota valida.',
        metadata: { data: update.callback_query.data },
      })
      return { ok: true, invalidCallback: true }
    }

    const nextNodeId = resolveCallbackTarget(flow.graph, callback)
    if (nextNodeId) {
      await runFlow({ bot, flow, token, chatId, lead, callback }, nextNodeId)
    }
    return { ok: true }
  }

  if (isStart) {
    await recordEvent({
      bot,
      lead,
      flowId: flow.id,
      eventType: 'start',
      status: 'success',
      message: 'Lead iniciou o fluxo pelo comando /start.',
      metadata: { updateId: update.update_id, attribution },
    })
    await runFlow({ bot, flow, token, chatId, lead, text }, findStartNode(flow.graph)?.id)
    return { ok: true }
  }

  await recordEvent({
    bot,
    lead,
    flowId: flow.id,
    eventType: 'message',
    status: 'success',
    message: text || 'Mensagem recebida.',
    metadata: { updateId: update.update_id },
  })

  const resumeNodeId = text ? findResumeNodeId(flow.graph, lead) : null
  if (resumeNodeId) {
    await runFlow({ bot, flow, token, chatId, lead, text, resumeNodeId }, resumeNodeId)
    return { ok: true, resumed: true }
  }

  return { ok: true }
}

async function loadBotAndActiveFlow(botId: string) {
  const { data: bot, error: botError } = await serviceSupabase
    .from('bots')
    .select('id,owner_id,name')
    .eq('id', botId)
    .maybeSingle()

  if (botError) throw botError
  if (!bot) throw new Error('Bot nao encontrado.')

  const { data: flow, error: flowError } = await serviceSupabase
    .from('flows')
    .select('id,bot_id,owner_id,graph')
    .eq('bot_id', bot.id)
    .eq('status', 'active')
    .maybeSingle()

  if (flowError) throw flowError

  return {
    bot: bot as BotRecord,
    flow: (flow as FlowRecord | null) ?? null,
  }
}

async function upsertLead({
  bot,
  flowId,
  chatId,
  user,
  isStart,
  attribution,
}: {
  bot: BotRecord
  flowId: string | null
  chatId: string
  user: TelegramUser
  isStart: boolean
  attribution: JsonRecord
}) {
  const telegramUserId = String(user.id)
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || telegramUserId
  const now = new Date().toISOString()
  const attributionPatch = buildAttributionPatch(attribution)

  const { data: existing, error: existingError } = await serviceSupabase
    .from('telegram_leads')
    .select(LEAD_SELECT)
    .eq('owner_id', bot.owner_id)
    .eq('bot_id', bot.id)
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    const { data, error } = await serviceSupabase
      .from('telegram_leads')
      .update({
        display_name: displayName,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        username: user.username ?? null,
        telegram_chat_id: chatId,
        flow_id: flowId,
        last_seen_at: now,
        start_count: isStart ? Number(existing.start_count ?? 0) + 1 : Number(existing.start_count ?? 0),
        ...attributionPatch,
      })
      .eq('id', existing.id)
      .select(LEAD_SELECT)
      .single()

    if (error) throw error
    return data as LeadRecord
  }

  const { data, error } = await serviceSupabase
    .from('telegram_leads')
    .insert({
      owner_id: bot.owner_id,
      bot_id: bot.id,
      flow_id: flowId,
      telegram_user_id: telegramUserId,
      telegram_chat_id: chatId,
      display_name: displayName,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      username: user.username ?? null,
      start_count: isStart ? 1 : 0,
      first_seen_at: now,
      last_seen_at: now,
      status: 'novo',
      ...attributionPatch,
    })
    .select(LEAD_SELECT)
    .single()

  if (error) throw error
  return data as LeadRecord
}

async function runFlow(context: ExecutionContext, startNodeId?: string | null) {
  if (!startNodeId) {
    await sendMessage(context.token, context.chatId, 'Fluxo sem bloco inicial configurado.')
    return
  }

  const graph = normalizeGraph(context.flow.graph)
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  let currentNodeId: string | null | undefined = startNodeId

  for (let step = 0; step < MAX_STEPS && currentNodeId; step += 1) {
    const node = nodeById.get(currentNodeId)
    if (!node) {
      await recordEvent({
        bot: context.bot,
        lead: context.lead,
        flowId: context.flow.id,
        eventType: 'node_error',
        status: 'error',
        message: `No ${currentNodeId} nao encontrado.`,
        metadata: { nodeId: currentNodeId },
      })
      return
    }

    await markLeadNode(context, node)
    await recordNode(context, node, 'node_enter', 'success')

    try {
      const result = await executeNode(context, graph, node)
      await recordNode(context, node, 'node_success', result.waiting ? 'pending' : 'success')

      if (result.waiting) return
      currentNodeId = result.nextNodeId
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar no.'
      await recordNode(context, node, 'node_error', 'error', message)
      await serviceSupabase
        .from('bots')
        .update({ connection_status: 'error', webhook_last_error: message })
        .eq('id', context.bot.id)
      await sendMessage(context.token, context.chatId, `Erro no fluxo: ${message}`).catch(() => undefined)
      return
    }
  }
}

async function executeNode(context: ExecutionContext, graph: Required<FlowGraph>, node: FlowGraphNode) {
  const config = node.config ?? {}
  const content = stringConfig(config.message) || stringConfig(config.text) || stringConfig(config.finalMessage) || node.content || node.label || ''

  switch (node.type) {
    case 'TR':
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    case 'TX':
      await sendMessage(context.token, context.chatId, content || 'Mensagem sem texto configurado.')
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    case 'MS': {
      const headline = stringConfig(config.headline)
      const message = stringConfig(config.message) || node.content || ''
      await sendMessage(context.token, context.chatId, [headline, message].filter(Boolean).join('\n\n') || 'Mensagem sem texto configurado.')
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    }
    case 'BT': {
      const buttons = listConfig(config.buttons, ['Continuar'])
      const nodeIndex = graph.nodes.findIndex((candidate) => candidate.id === node.id)
      const keyboard = buttons.map((label, outputIndex) => [
        {
          text: label,
          callback_data: `kx:${nodeIndex}:${outputIndex}`,
        },
      ])
      await sendMessage(context.token, context.chatId, content || 'Escolha uma opcao:', keyboard)
      return { nextNodeId: null, waiting: true }
    }
    case 'IN': {
      const answer = context.resumeNodeId === node.id ? stringConfig(context.text) : ''
      if (!answer) {
        await sendMessage(context.token, context.chatId, content || 'Envie sua resposta para continuar.')
        return { nextNodeId: null, waiting: true }
      }

      const validationMessage = validateInputAnswer(answer, config)
      if (validationMessage) {
        await sendMessage(
          context.token,
          context.chatId,
          stringConfig(config.fallback) || validationMessage,
        )
        return { nextNodeId: null, waiting: true }
      }

      await recordInputAnswer(context, node, answer, config)
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    }
    case 'DL':
    case 'TP': {
      await maybeDelay(context, config)
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    }
    case 'GT': {
      const outputId = evaluateGate(context.text ?? '', config) ? 'yes' : 'no'
      return { nextNodeId: findNextNodeId(graph, node, outputId), waiting: false }
    }
    case 'GO': {
      const targetNodeId = stringConfig(config.targetNodeId)
      return { nextNodeId: targetNodeId || findNextNodeId(graph, node), waiting: false }
    }
    case 'PX':
    case 'PG':
      return executePixNode(context, graph, node)
    case 'OB':
    case 'UP':
    case 'DS': {
      await recordPaymentGenerated(context, node)
      await sendMessage(context.token, context.chatId, buildPaymentMessage(node, config, content))
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
    }
    case 'CV':
      await sendMessage(context.token, context.chatId, content || 'Fluxo concluido.')
      return { nextNodeId: null, waiting: false }
    case 'EP':
    case 'AG': {
      const message = stringConfig(config.finalMessage) || stringConfig(config.productLink) || stringConfig(config.inviteLink) || content || 'Entrega concluida.'
      await sendMessage(context.token, context.chatId, message)
      return { nextNodeId: null, waiting: false }
    }
    default:
      await sendMessage(context.token, context.chatId, content || `${node.label || node.type} executado.`)
      return { nextNodeId: findNextNodeId(graph, node), waiting: false }
  }
}

async function maybeDelay(context: ExecutionContext, config: JsonRecord) {
  const duration = Math.max(0, Number(config.duration ?? 1))
  const unit = String(config.unit ?? 'seg')
  const multiplier = unit === 'min' ? 60_000 : unit === 'h' ? 3_600_000 : unit === 'dias' ? 86_400_000 : 1000
  const delayMs = Math.min(duration * multiplier, MAX_INLINE_DELAY_MS)

  if (config.showTyping || config.text) {
    await sendChatAction(context.token, context.chatId, 'typing').catch(() => undefined)
  }

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

async function executePixNode(
  context: ExecutionContext,
  graph: Required<FlowGraph>,
  node: FlowGraphNode,
) {
  const config = node.config ?? {}
  const paymentMethod = stringConfig(config.paymentMethod) || stringConfig(config.method) || 'pix'

  if (paymentMethod && paymentMethod.toLowerCase() !== 'pix') {
    throw new Error('Cartao e recorrencia real ficam para uma etapa posterior. Use PIX neste bloco.')
  }

  const recurrence = stringConfig(config.recurrence)
  if (node.type === 'PG' && recurrence && !['unico', 'single', 'unique'].includes(recurrence.toLowerCase())) {
    throw new Error('Recorrencia real ainda nao esta ativa. Use recorrencia Unico para gerar PIX agora.')
  }

  const amountCents = amountToCents(config.value ?? config.price ?? config.amount)
  const planName =
    stringConfig(config.offerName) ||
    stringConfig(config.planName) ||
    stringConfig(config.productName) ||
    node.label ||
    'Oferta'
  const preferredProvider =
    stringConfig(config.gatewayProvider) ||
    stringConfig(config.preferredGateway) ||
    normalizePreferredGateway(stringConfig(config.gateway))
  const expiresInMinutes = Math.max(1, Number(config.expiresIn ?? config.timeout ?? 30))
  const transaction = await createPixCharge({
    ownerId: context.bot.owner_id,
    botId: context.bot.id,
    flowId: context.flow.id,
    leadId: context.lead.id,
    nodeId: node.id,
    nodeType: node.type === 'PG' ? 'PG' : 'PX',
    telegramChatId: context.chatId,
    amountCents,
    currency: stringConfig(config.currency) || 'BRL',
    planName,
    description: stringConfig(config.description) || stringConfig(config.message) || null,
    expiresInMinutes,
    preferredProvider,
    lead: context.lead,
  })

  await recordPaymentGenerated(context, node, {
    amountCents,
    planName,
    gateway: transaction.provider,
    currency: transaction.currency,
    metadata: {
      pixTransactionId: transaction.id,
      providerPaymentId: transaction.provider_payment_id,
      externalReference: transaction.external_reference,
      expiresAt: transaction.expires_at,
    },
  })

  await sendMessage(
    context.token,
    context.chatId,
    buildPixPaymentMessage(node, config, transaction),
    [
      [
        {
          text: stringConfig(config.verifyButtonText) || 'Verificar Pagamento',
          callback_data: `kxpay:${transaction.id}`,
        },
      ],
    ],
    { parseMode: 'HTML' },
  )

  return { nextNodeId: findNextNodeId(graph, node), waiting: true }
}

async function recordPaymentGenerated(
  context: ExecutionContext,
  node: FlowGraphNode,
  overrides: {
    amountCents?: number
    planName?: string
    gateway?: string
    currency?: string
    metadata?: JsonRecord
  } = {},
) {
  const config = node.config ?? {}
  const amountCents = overrides.amountCents ?? amountToCents(config.value ?? config.price ?? config.amount)
  const planName =
    overrides.planName ??
    (stringConfig(config.offerName) ||
      stringConfig(config.planName) ||
      stringConfig(config.productName) ||
      node.label ||
      node.type)
  const salesCode = stringConfig(config.salesCode)
  const eventType = revenueEventTypeForNode(node.type)
  const gateway =
    overrides.gateway ?? (stringConfig(config.gateway) || (node.type === 'PX' ? 'pix' : 'telegram_flow'))
  const now = new Date().toISOString()

  await serviceSupabase
    .from('telegram_leads')
    .update({
      status: 'pendente',
      plan_name: planName,
      sales_code: salesCode || null,
      last_seen_at: now,
    })
    .eq('id', context.lead.id)

  const { error } = await serviceSupabase.from('analytics_revenue_events').insert({
    owner_id: context.bot.owner_id,
    bot_id: context.bot.id,
    flow_id: context.flow.id,
    lead_id: context.lead.id,
    event_type: eventType,
    amount_cents: amountCents,
    currency: overrides.currency ?? (stringConfig(config.currency) || 'BRL'),
    gateway,
    plan_name: planName,
    sales_code: salesCode || null,
    source: context.lead.source ?? null,
    campaign: context.lead.campaign ?? null,
    utm_source: context.lead.utm_source ?? null,
    utm_medium: context.lead.utm_medium ?? null,
    utm_campaign: context.lead.utm_campaign ?? null,
    utm_content: context.lead.utm_content ?? null,
    utm_term: context.lead.utm_term ?? null,
    metadata: {
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label ?? null,
      config,
      ...overrides.metadata,
    },
  })

  if (error) {
    console.error('Falha ao gravar evento financeiro', error)
  }

  await recordEvent({
    bot: context.bot,
    lead: context.lead,
    flowId: context.flow.id,
    eventType: 'payment_generated',
    node,
    status: 'pending',
    message: `${planName} gerado no fluxo.`,
    metadata: { amountCents, gateway, revenueEventType: eventType, ...overrides.metadata },
  })
}

function buildPaymentMessage(node: FlowGraphNode, config: JsonRecord, fallback: string) {
  const planName = stringConfig(config.offerName) || stringConfig(config.planName) || stringConfig(config.productName) || node.label || 'Oferta'
  const amountCents = amountToCents(config.value ?? config.price ?? config.amount)
  const description = stringConfig(config.description) || stringConfig(config.message) || fallback
  const valueText = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: stringConfig(config.currency) || 'BRL',
  }).format(amountCents / 100)

  return [planName, amountCents > 0 ? `Valor: ${valueText}` : '', description].filter(Boolean).join('\n\n')
}

function buildPixPaymentMessage(
  node: FlowGraphNode,
  config: JsonRecord,
  transaction: PixTransactionRow,
) {
  const before = stringConfig(config.messageBeforePix) || stringConfig(config.beforeMessage)
  const after =
    stringConfig(config.messageAfterPix) ||
    stringConfig(config.afterMessage) ||
    'Depois de pagar, toque em Verificar Pagamento para liberar o proximo passo.'
  const description = stringConfig(config.description)
  const valueText = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: transaction.currency || 'BRL',
  }).format(transaction.amount_cents / 100)

  return [
    escapeTelegramHtml(before),
    `Oferta: ${escapeTelegramHtml(transaction.plan_name || node.label || 'Oferta')}`,
    `Valor: ${escapeTelegramHtml(valueText)}`,
    escapeTelegramHtml(description),
    'PIX copia e cola:',
    transaction.pix_code
      ? `<code>${escapeTelegramHtml(transaction.pix_code)}</code>`
      : 'Codigo PIX indisponivel. Tente verificar em instantes.',
    escapeTelegramHtml(after),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function normalizePreferredGateway(value: string) {
  if (!value || value === 'pix' || value === 'auto') return null
  return value
}

function escapeTelegramHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function revenueEventTypeForNode(nodeType: string) {
  if (nodeType === 'UP') return 'upsell'
  if (nodeType === 'DS') return 'downsell'
  if (nodeType === 'OB') return 'order_bump'
  return 'payment_generated'
}

function evaluateGate(text: string, config: JsonRecord) {
  const expected = String(config.value ?? '').trim().toLowerCase()
  const received = text.trim().toLowerCase()
  const operator = String(config.operator ?? 'equals')

  if (!expected) return false
  if (operator === 'contains') return received.includes(expected)
  if (operator === 'not_equals') return received !== expected
  if (operator === 'greater_than') {
    const receivedNumber = parseComparableNumber(received)
    const expectedNumber = parseComparableNumber(expected)
    return receivedNumber !== null && expectedNumber !== null && receivedNumber > expectedNumber
  }
  return received === expected
}

function validateInputAnswer(answer: string, config: JsonRecord) {
  const expectedType = stringConfig(config.expectedType)

  if (expectedType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
    return 'Envie um e-mail valido para continuar.'
  }

  if (expectedType === 'telefone' && answer.replace(/\D/g, '').length < 8) {
    return 'Envie um telefone valido para continuar.'
  }

  if (expectedType === 'cpf' && answer.replace(/\D/g, '').length < 11) {
    return 'Envie um CPF valido para continuar.'
  }

  if (expectedType === 'numero' && parseComparableNumber(answer) === null) {
    return 'Envie um numero valido para continuar.'
  }

  return null
}

async function recordInputAnswer(
  context: ExecutionContext,
  node: FlowGraphNode,
  answer: string,
  config: JsonRecord,
) {
  const variable = stringConfig(config.variable) || `input_${node.id}`
  const expectedType = stringConfig(config.expectedType)
  const metadata: JsonRecord = {
    ...(context.lead.metadata ?? {}),
    [variable]: answer,
  }
  const patch: JsonRecord = {
    last_seen_at: new Date().toISOString(),
    metadata,
  }

  if (expectedType === 'email' || /email/i.test(variable)) {
    patch.email = answer
    metadata.email = answer
  }

  if (expectedType === 'telefone' || /phone|telefone|celular|whatsapp/i.test(variable)) {
    patch.phone = answer
    metadata.phone = answer
  }

  if (expectedType === 'cpf' || /cpf|documento|document/i.test(variable)) {
    metadata.cpf = answer.replace(/\D/g, '') || answer
  }

  const { error } = await serviceSupabase
    .from('telegram_leads')
    .update(patch)
    .eq('id', context.lead.id)

  if (error) {
    console.error('Falha ao salvar resposta do lead', error)
  }

  context.lead.metadata = metadata
  if (typeof patch.email === 'string') context.lead.email = patch.email
  if (typeof patch.phone === 'string') context.lead.phone = patch.phone

  await recordEvent({
    bot: context.bot,
    lead: context.lead,
    flowId: context.flow.id,
    eventType: 'message',
    node,
    status: 'success',
    message: `Resposta capturada em ${variable}.`,
    metadata: { variable, expectedType: expectedType || null, value: answer },
  })
}

async function handlePaymentVerification({
  bot,
  flow,
  token,
  chatId,
  lead,
  transactionId,
  callbackQueryId,
}: {
  bot: BotRecord
  flow: FlowRecord
  token: string
  chatId: string
  lead: LeadRecord
  transactionId: string
  callbackQueryId: string
}) {
  try {
    const result = await verifyPixTransaction(transactionId)
    const transaction = result.transaction

    if (transaction.bot_id !== bot.id || transaction.lead_id !== lead.id) {
      await answerCallbackQuery(token, callbackQueryId, {
        text: 'Este pagamento nao pertence a esta conversa.',
        showAlert: true,
      }).catch(() => undefined)
      return
    }

    if (transaction.status === 'paid') {
      if (result.changed) {
        await answerCallbackQuery(token, callbackQueryId, { text: 'Pagamento confirmado!' }).catch(
          () => undefined,
        )
        await routePixTransaction({ bot, flow, token, chatId, lead }, normalizeGraph(flow.graph), transaction, 'paid')
        return
      }

      await answerCallbackQuery(token, callbackQueryId, { text: 'Pagamento ja confirmado.' }).catch(
        () => undefined,
      )
      return
    }

    if (transaction.status === 'expired' || transaction.status === 'canceled' || transaction.status === 'failed') {
      if (result.changed) {
        await routePixTransaction(
          { bot, flow, token, chatId, lead },
          normalizeGraph(flow.graph),
          transaction,
          'unpaid',
        )
      }

      await answerCallbackQuery(token, callbackQueryId, {
        text: 'Pagamento nao confirmado. O prazo expirou ou a cobranca falhou.',
        showAlert: true,
      }).catch(() => undefined)
      return
    }

    await answerCallbackQuery(token, callbackQueryId, {
      text: 'Pagamento ainda pendente. Tente novamente depois de concluir o PIX.',
    }).catch(() => undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel verificar o pagamento.'
    await answerCallbackQuery(token, callbackQueryId, { text: message, showAlert: true }).catch(() => undefined)
    await recordEvent({
      bot,
      lead,
      flowId: flow.id,
      eventType: 'payment_verify_error',
      status: 'error',
      message,
      metadata: { transactionId },
    })
  }
}

export async function continuePixTransactionById(
  transactionId: string,
  routeStatus: 'paid' | 'unpaid',
) {
  const transaction = await loadPixTransaction(transactionId)
  if (!transaction.bot_id || !transaction.flow_id || !transaction.lead_id || !transaction.telegram_chat_id) {
    return { ok: true, skipped: true, reason: 'Transacao incompleta para continuar fluxo.' }
  }

  const [{ data: bot, error: botError }, { data: flow, error: flowError }, { data: secret, error: secretError }, { data: lead, error: leadError }] =
    await Promise.all([
      serviceSupabase.from('bots').select('id,owner_id,name').eq('id', transaction.bot_id).maybeSingle(),
      serviceSupabase
        .from('flows')
        .select('id,bot_id,owner_id,graph')
        .eq('id', transaction.flow_id)
        .maybeSingle(),
      serviceSupabase.from('bot_secrets').select('telegram_token').eq('bot_id', transaction.bot_id).maybeSingle(),
      serviceSupabase.from('telegram_leads').select(LEAD_SELECT).eq('id', transaction.lead_id).maybeSingle(),
    ])

  if (botError) throw botError
  if (flowError) throw flowError
  if (secretError) throw secretError
  if (leadError) throw leadError

  if (!bot || !flow || !secret || !lead) {
    return { ok: true, skipped: true, reason: 'Contexto do fluxo nao encontrado.' }
  }

  const context: ExecutionContext = {
    bot: bot as BotRecord,
    flow: flow as FlowRecord,
    token: secret.telegram_token,
    chatId: transaction.telegram_chat_id,
    lead: lead as LeadRecord,
  }

  await routePixTransaction(context, normalizeGraph(context.flow.graph), transaction, routeStatus)
  return { ok: true, routed: true, status: routeStatus }
}

async function routePixTransaction(
  context: ExecutionContext,
  graph: Required<FlowGraph>,
  transaction: PixTransactionRow,
  routeStatus: 'paid' | 'unpaid',
) {
  const node = graph.nodes.find((candidate) => candidate.id === transaction.node_id)
  if (!node) {
    await recordEvent({
      bot: context.bot,
      lead: context.lead,
      flowId: context.flow.id,
      eventType: 'payment_route_error',
      status: 'error',
      message: 'Bloco de pagamento nao encontrado para continuar fluxo.',
      metadata: { transactionId: transaction.id, routeStatus },
    })
    return
  }

  if (routeStatus === 'paid') {
    await recordPaymentConfirmed(context, node, transaction)
  } else {
    await recordPaymentNotPaid(context, node, transaction)
  }

  const nextNodeId = findNextNodeId(
    graph,
    node,
    routeStatus === 'paid' ? 'paid' : 'unpaid',
    routeStatus === 'paid' ? 'PAGO' : 'NAO PAGO',
  )

  if (nextNodeId) {
    await runFlow(context, nextNodeId)
    return
  }

  await sendMessage(
    context.token,
    context.chatId,
    routeStatus === 'paid'
      ? 'Pagamento confirmado.'
      : 'Pagamento nao confirmado. O fluxo nao tem caminho NAO PAGO configurado.',
  ).catch(() => undefined)
}

async function recordPaymentConfirmed(
  context: ExecutionContext,
  node: FlowGraphNode,
  transaction: PixTransactionRow,
) {
  const now = new Date().toISOString()
  await serviceSupabase
    .from('telegram_leads')
    .update({
      status: 'pago',
      plan_name: transaction.plan_name,
      last_seen_at: now,
    })
    .eq('id', context.lead.id)

  const { error } = await serviceSupabase.from('analytics_revenue_events').insert({
    owner_id: context.bot.owner_id,
    bot_id: context.bot.id,
    flow_id: context.flow.id,
    lead_id: context.lead.id,
    event_type: 'payment_confirmed',
    amount_cents: transaction.amount_cents,
    currency: transaction.currency,
    gateway: transaction.provider,
    plan_name: transaction.plan_name,
    source: context.lead.source ?? null,
    campaign: context.lead.campaign ?? null,
    utm_source: context.lead.utm_source ?? null,
    utm_medium: context.lead.utm_medium ?? null,
    utm_campaign: context.lead.utm_campaign ?? null,
    utm_content: context.lead.utm_content ?? null,
    utm_term: context.lead.utm_term ?? null,
    metadata: {
      nodeId: node.id,
      nodeType: node.type,
      pixTransactionId: transaction.id,
      providerPaymentId: transaction.provider_payment_id,
      externalReference: transaction.external_reference,
    },
  })

  if (error) {
    console.error('Falha ao gravar pagamento confirmado', error)
  }

  await recordEvent({
    bot: context.bot,
    lead: context.lead,
    flowId: context.flow.id,
    eventType: 'payment_confirmed',
    node,
    status: 'success',
    message: `${transaction.plan_name || 'Pagamento'} confirmado.`,
    metadata: {
      pixTransactionId: transaction.id,
      amountCents: transaction.amount_cents,
      gateway: transaction.provider,
    },
  })
}

async function recordPaymentNotPaid(
  context: ExecutionContext,
  node: FlowGraphNode,
  transaction: PixTransactionRow,
) {
  await serviceSupabase
    .from('telegram_leads')
    .update({
      status: 'bloqueado',
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', context.lead.id)

  await recordEvent({
    bot: context.bot,
    lead: context.lead,
    flowId: context.flow.id,
    eventType: 'payment_not_confirmed',
    node,
    status: 'pending',
    message: 'PIX nao confirmado no prazo configurado.',
    metadata: {
      pixTransactionId: transaction.id,
      status: transaction.status,
      gateway: transaction.provider,
    },
  })
}

function resolveCallbackTarget(graph: FlowGraph, callback: { nodeIndex: number; outputIndex: number }) {
  const normalized = normalizeGraph(graph)
  const node = normalized.nodes[callback.nodeIndex]
  if (!node) return null

  const buttons = listConfig(node.config?.buttons, [])
  const outputId = `button_${callback.outputIndex + 1}`
  const outputLabel = buttons[callback.outputIndex]

  return findNextNodeId(normalized, node, outputId, outputLabel)
}

function findNextNodeId(
  graph: Required<FlowGraph>,
  node: FlowGraphNode,
  sourceHandle?: string,
  label?: string,
) {
  const outgoing = graph.edges.filter((edge) => edge.source === node.id)
  if (outgoing.length === 0) return null

  const specific = outgoing.find((edge) => {
    if (sourceHandle && edge.sourceHandle === sourceHandle) return true
    if (label && edge.label === label) return true
    return false
  })

  return (specific ?? outgoing[0]).target
}

function normalizeGraph(graph: FlowGraph): Required<FlowGraph> {
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  }
}

function findStartNode(graph: FlowGraph) {
  const nodes = normalizeGraph(graph).nodes
  return nodes.find((node) => node.id === START_NODE_ID) ?? nodes.find((node) => node.type === 'TR') ?? nodes[0]
}

function findResumeNodeId(graph: FlowGraph, lead: LeadRecord) {
  if (!lead.last_node_id) return null

  const node = normalizeGraph(graph).nodes.find((candidate) => candidate.id === lead.last_node_id)
  if (!node || !WAITING_TEXT_NODE_TYPES.has(node.type)) return null

  return node.id
}

function parseCallbackData(data?: string) {
  const match = /^kx:(\d+):(\d+)$/.exec(data ?? '')
  if (!match) return null

  return {
    nodeIndex: Number(match[1]),
    outputIndex: Number(match[2]),
    id: data ?? '',
  }
}

function parsePaymentCallbackData(data?: string) {
  const match = /^kxpay:([0-9a-f-]{36})$/i.exec(data ?? '')
  if (!match) return null

  return { transactionId: match[1] }
}

function isStartCommand(text?: string) {
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(text ?? '')
}

function parseStartAttribution(text?: string): JsonRecord {
  const payload = (text ?? '').replace(/^\/start(?:@\w+)?\s*/i, '').trim()
  if (!payload) return {}

  const decoded = tryDecodeJsonPayload(payload)
  const pairs = parseKeyValuePayload(payload)

  return {
    start_payload: payload,
    ...(decoded ?? {}),
    ...pairs,
  }
}

function tryDecodeJsonPayload(payload: string): JsonRecord | null {
  try {
    let normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    while (normalized.length % 4) normalized += '='
    const decoded = Buffer.from(normalized, 'base64').toString('utf8')
    if (!decoded.trim().startsWith('{')) return null
    const parsed = JSON.parse(decoded) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as JsonRecord) : null
  } catch {
    return null
  }
}

function parseKeyValuePayload(payload: string): JsonRecord {
  const result: JsonRecord = {}

  for (const part of payload.split(/[|,;&]/)) {
    const match = /^([a-zA-Z0-9_]+)[:=]([a-zA-Z0-9_.-]+)$/.exec(part.trim())
    if (!match) continue
    result[match[1]] = match[2]
  }

  return result
}

function buildAttributionPatch(attribution: JsonRecord) {
  const patch: JsonRecord = {}
  const mappings: Record<string, string[]> = {
    source: ['source', 'src', 'utm_source'],
    campaign: ['campaign', 'camp', 'utm_campaign'],
    utm_source: ['utm_source', 'source', 'src'],
    utm_medium: ['utm_medium', 'medium'],
    utm_campaign: ['utm_campaign', 'campaign', 'camp'],
    utm_content: ['utm_content', 'content', 'placement', 'position'],
    utm_term: ['utm_term', 'term'],
    device_type: ['device_type', 'device'],
    country: ['country', 'pais'],
    region: ['region', 'estado'],
    city: ['city', 'cidade'],
  }

  for (const [field, keys] of Object.entries(mappings)) {
    const value = firstString(attribution, keys)
    if (value) patch[field] = value
  }

  return patch
}

async function markLeadNode(context: ExecutionContext, node: FlowGraphNode) {
  await serviceSupabase
    .from('telegram_leads')
    .update({
      last_node_id: node.id,
      last_node_label: node.label ?? node.type,
      last_node_type: node.type,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', context.lead.id)
}

async function recordNode(
  context: ExecutionContext,
  node: FlowGraphNode,
  eventType: 'node_enter' | 'node_success' | 'node_error',
  status: 'success' | 'error' | 'pending',
  message?: string,
) {
  await recordEvent({
    bot: context.bot,
    lead: context.lead,
    flowId: context.flow.id,
    eventType,
    node,
    status,
    message,
  })
}

async function recordEvent({
  bot,
  lead,
  flowId,
  eventType,
  node,
  status,
  message,
  metadata = {},
}: {
  bot: BotRecord
  lead: LeadRecord
  flowId: string | null
  eventType: string
  node?: FlowGraphNode
  status?: 'success' | 'error' | 'skipped' | 'pending'
  message?: string
  metadata?: JsonRecord
}) {
  const { error } = await serviceSupabase.from('lead_flow_events').insert({
    owner_id: bot.owner_id,
    lead_id: lead.id,
    bot_id: bot.id,
    flow_id: flowId,
    event_type: eventType,
    node_id: node?.id ?? null,
    node_label: node?.label ?? null,
    node_type: node?.type ?? null,
    status: status ?? null,
    message: message ?? null,
    metadata,
  })

  if (error) {
    console.error('Falha ao gravar evento do lead', error)
  }
}

function stringConfig(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function listConfig(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean)
    return items.length > 0 ? items : fallback
  }

  if (typeof value === 'string') {
    const items = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    return items.length > 0 ? items : fallback
  }

  return fallback
}

function firstString(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

function parseComparableNumber(value: string) {
  const parsed = Number(value.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function amountToCents(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 100))
  }

  if (typeof value === 'string') {
    const normalized = value
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed * 100))
    }
  }

  return 0
}
