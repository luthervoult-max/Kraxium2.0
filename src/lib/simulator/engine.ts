import type {
  ChatMessage,
  ChatMessageKind,
  NodeTrace,
  SimEdge,
  SimNode,
  TraceStatus,
} from './types'
import { useSimulatorStore } from './store'

const SAFETY_LIMIT = 200

const speedDelay = (base: number, speed: 1 | 2 | 4 | 'instant') =>
  speed === 'instant' ? 0 : Math.max(0, Math.round(base / speed))

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const findStartNode = (nodes: SimNode[]) =>
  nodes.find((node) => node.data.code === 'TR') ?? nodes[0] ?? null

const outgoingEdges = (edges: SimEdge[], nodeId: string) =>
  edges.filter((edge) => edge.source === nodeId)

const findNode = (nodes: SimNode[], id: string | null | undefined) =>
  id ? nodes.find((node) => node.id === id) ?? null : null

const KIND_BY_CODE: Record<string, ChatMessageKind> = {
  MS: 'text',
  TX: 'text',
  IM: 'image',
  VD: 'video',
  AU: 'audio',
  AR: 'file',
  VN: 'video-note',
  LC: 'location',
  BT: 'buttons',
  IN: 'user-input',
}

interface RunContext {
  flowId: string
  runId: string
  nodes: SimNode[]
  edges: SimEdge[]
  shouldStop: () => boolean
}

const recordTrace = (
  ctx: RunContext,
  node: SimNode,
  status: TraceStatus,
  startedAt: number,
  errorMessage?: string,
  payload?: unknown,
) => {
  const trace: NodeTrace = {
    id: uid('trace'),
    flowId: ctx.flowId,
    runId: ctx.runId,
    nodeId: node.id,
    nodeCode: node.data.code,
    status,
    errorMessage,
    payload,
    durationMs: Date.now() - startedAt,
    createdAt: Date.now(),
  }
  useSimulatorStore.getState().pushTrace(trace)
}

const emitMessage = (node: SimNode, partial: Partial<ChatMessage>): ChatMessage => {
  const message: ChatMessage = {
    id: uid('msg'),
    nodeId: node.id,
    nodeCode: node.data.code,
    category: node.data.category,
    kind: KIND_BY_CODE[node.data.code] ?? 'system',
    author: 'bot',
    createdAt: Date.now(),
    ...partial,
  }
  useSimulatorStore.getState().pushMessage(message)
  return message
}

const emitSystem = (node: SimNode | null, text: string) => {
  const message: ChatMessage = {
    id: uid('msg'),
    nodeId: node?.id ?? null,
    nodeCode: node?.data.code ?? null,
    category: node?.data.category ?? null,
    kind: 'system',
    author: 'system',
    text,
    createdAt: Date.now(),
  }
  useSimulatorStore.getState().pushMessage(message)
  return message
}

const interpolate = (text: string, vars: Record<string, unknown>) =>
  text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key]
    return value === undefined || value === null ? `{{${key}}}` : String(value)
  })

async function runNode(ctx: RunContext, node: SimNode): Promise<string | null> {
  const store = useSimulatorStore.getState()
  const startedAt = Date.now()
  store.setCurrentNode(node.id)
  store.markVisited(node.id)

  const { speed } = useSimulatorStore.getState()
  const text = node.data.text
    ? interpolate(node.data.text, useSimulatorStore.getState().variables)
    : node.data.description

  const code = node.data.code

  switch (code) {
    case 'TR': {
      emitSystem(node, `Disparo: ${node.data.title}`)
      recordTrace(ctx, node, 'success', startedAt)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'CV': {
      emitSystem(node, `Conversão registrada · ${node.data.title}`)
      recordTrace(ctx, node, 'success', startedAt)
      useSimulatorStore.getState().setStatus('finished')
      return null
    }

    case 'MS':
    case 'TX': {
      emitMessage(node, { text })
      await wait(speedDelay(420, speed))
      recordTrace(ctx, node, 'success', startedAt, undefined, { text })
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'IM':
    case 'VD':
    case 'AU':
    case 'AR':
    case 'VN':
    case 'LC': {
      emitMessage(node, { text })
      await wait(speedDelay(520, speed))
      recordTrace(ctx, node, 'success', startedAt)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'TP': {
      const typing = emitMessage(node, { kind: 'typing', text: 'digitando…' })
      await wait(speedDelay(900, speed))
      useSimulatorStore.getState().removeMessage(typing.id)
      recordTrace(ctx, node, 'success', startedAt)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'DL':
    case 'SD': {
      await wait(speedDelay(800, speed))
      recordTrace(ctx, node, 'success', startedAt)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'BT': {
      const options = node.data.options ?? []
      const outs = outgoingEdges(ctx.edges, node.id)
      if (outs.length === 0) {
        emitSystem(node, 'Erro: nó BT sem edges de saída.')
        recordTrace(ctx, node, 'error', startedAt, 'Nó BT sem edges de saída.')
        useSimulatorStore.getState().setError('Nó BT sem edges de saída.')
        useSimulatorStore.getState().setStatus('error')
        return null
      }
      emitMessage(node, { text, options })
      useSimulatorStore.getState().setAwaitingButton(node.id)
      const choice = await waitForButtonChoice(node.id, ctx.shouldStop)
      if (choice === null) return null

      const targetIndex = Math.min(choice.index, outs.length - 1)
      const targetEdge = outs[targetIndex]
      recordTrace(ctx, node, 'success', startedAt, undefined, {
        chosen: choice.label,
        index: choice.index,
      })
      return targetEdge.target
    }

    case 'IN': {
      emitMessage(node, { text: text ?? 'Aguardando resposta do usuário…' })
      useSimulatorStore.getState().setAwaitingInput(node.id)
      const value = await waitForInput(node.id, ctx.shouldStop)
      if (value === null) return null
      const varKey = `input_${node.id}`
      useSimulatorStore.getState().setVariable(varKey, value)
      recordTrace(ctx, node, 'success', startedAt, undefined, { value, varKey })
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    case 'GT': {
      const outs = outgoingEdges(ctx.edges, node.id)
      if (outs.length === 0) {
        recordTrace(ctx, node, 'error', startedAt, 'Gatilho sem edges de saída.')
        useSimulatorStore.getState().setError('Gatilho sem edges de saída.')
        useSimulatorStore.getState().setStatus('error')
        return null
      }
      recordTrace(ctx, node, 'success', startedAt, undefined, { branchTaken: 0 })
      return outs[0].target
    }

    case 'RD': {
      const outs = outgoingEdges(ctx.edges, node.id)
      if (outs.length === 0) {
        recordTrace(ctx, node, 'error', startedAt, 'Randomizer sem rotas.')
        useSimulatorStore.getState().setError('Randomizer sem rotas.')
        useSimulatorStore.getState().setStatus('error')
        return null
      }
      const idx = Math.floor(Math.random() * outs.length)
      recordTrace(ctx, node, 'success', startedAt, undefined, { branchTaken: idx })
      return outs[idx].target
    }

    case 'GO': {
      const targetId =
        outgoingEdges(ctx.edges, node.id)[0]?.target ?? (node.data.text as string | undefined)
      const target = findNode(ctx.nodes, targetId ?? null)
      if (!target) {
        emitSystem(node, `Erro: GO aponta para nó inexistente (${targetId ?? 'sem destino'}).`)
        recordTrace(ctx, node, 'error', startedAt, `GO destino inválido: ${targetId ?? 'sem destino'}`)
        useSimulatorStore.getState().setError('GO aponta para nó inexistente.')
        useSimulatorStore.getState().setStatus('error')
        return null
      }
      recordTrace(ctx, node, 'success', startedAt, undefined, { jumpedTo: target.id })
      return target.id
    }

    case 'PX':
    case 'PG':
    case 'OB':
    case 'UP':
    case 'DS':
    case 'EP':
    case 'AG': {
      emitSystem(node, `${node.data.title} · ${text}`)
      await wait(speedDelay(500, speed))
      recordTrace(ctx, node, 'success', startedAt)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }

    default: {
      emitSystem(node, `Nó "${code}" não suportado pelo simulador.`)
      recordTrace(ctx, node, 'skipped', startedAt, `Código desconhecido: ${code}`)
      return outgoingEdges(ctx.edges, node.id)[0]?.target ?? null
    }
  }
}

function waitForButtonChoice(
  nodeId: string,
  shouldStop: () => boolean,
): Promise<{ label: string; index: number } | null> {
  return new Promise((resolve) => {
    const check = () => {
      if (shouldStop()) {
        resolve(null)
        return
      }
      const state = useSimulatorStore.getState()
      const lastMessage = [...state.messages]
        .reverse()
        .find((message) => message.nodeId === nodeId && message.kind === 'buttons')
      if (lastMessage?.selectedOption) {
        const index = (lastMessage.options ?? []).indexOf(lastMessage.selectedOption)
        resolve({ label: lastMessage.selectedOption, index: index < 0 ? 0 : index })
        return
      }
      setTimeout(check, 80)
    }
    check()
  })
}

function waitForInput(nodeId: string, shouldStop: () => boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const check = () => {
      if (shouldStop()) {
        resolve(null)
        return
      }
      const state = useSimulatorStore.getState()
      const submitted = [...state.messages]
        .reverse()
        .find(
          (message) =>
            message.author === 'user' && message.kind === 'text' && message.nodeId === nodeId,
        )
      if (submitted?.text) {
        resolve(submitted.text)
        return
      }
      setTimeout(check, 80)
    }
    check()
  })
}

export interface RunOptions {
  flowId: string
  nodes: SimNode[]
  edges: SimEdge[]
}

export async function runSimulation({ flowId, nodes, edges }: RunOptions) {
  const store = useSimulatorStore.getState()
  store.reset()
  store.setGraph(flowId)

  const start = findStartNode(nodes)
  if (!start) {
    store.setError('Fluxo vazio: adicione um nó de Disparo (TR).')
    store.setStatus('error')
    return
  }

  const runId = uid('run')
  const ctx: RunContext = {
    flowId,
    runId,
    nodes,
    edges,
    shouldStop: () => useSimulatorStore.getState().status === 'idle',
  }

  useSimulatorStore.setState({ runId, status: 'running' })

  let cursor: string | null = start.id
  let steps = 0

  while (cursor && steps < SAFETY_LIMIT) {
    if (ctx.shouldStop()) return
    const node = findNode(nodes, cursor)
    if (!node) {
      store.setError(`Nó não encontrado: ${cursor}`)
      store.setStatus('error')
      return
    }
    cursor = await runNode(ctx, node)
    steps += 1
    if (useSimulatorStore.getState().status === 'error') return
    if (useSimulatorStore.getState().status === 'finished') return
  }

  if (steps >= SAFETY_LIMIT) {
    store.setError(`Limite de ${SAFETY_LIMIT} passos atingido (possível loop).`)
    store.setStatus('error')
    return
  }

  if (cursor === null && useSimulatorStore.getState().status !== 'finished') {
    store.setStatus('finished')
  }
}

export function selectButtonOption(messageId: string, option: string) {
  useSimulatorStore.getState().updateMessage(messageId, { selectedOption: option })
  useSimulatorStore.getState().setAwaitingButton(null)
}

export function submitUserInput(nodeId: string, text: string) {
  const node = useSimulatorStore.getState().messages.find((message) => message.nodeId === nodeId)
  const message: ChatMessage = {
    id: uid('msg'),
    nodeId,
    nodeCode: node?.nodeCode ?? 'IN',
    category: node?.category ?? null,
    kind: 'text',
    author: 'user',
    text,
    createdAt: Date.now(),
  }
  useSimulatorStore.getState().pushMessage(message)
  useSimulatorStore.getState().setInputBuffer('')
  useSimulatorStore.getState().setAwaitingInput(null)
}
