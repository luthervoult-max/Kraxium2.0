import { Bot, BotOff, Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { FlowNodeTrace, FlowTraceNodeRef, NodeRuntimeHealth } from '@/lib/api/flowNodeTraces'
import { mergeBlockConfig, validateBlockConfig } from '@/lib/blockSpecs'
import { cn } from '@/lib/utils'
import { START_NODE_ID } from '@/components/flow/flowCanvasState'
import type { BuilderEdge, BuilderNode, FlowHealthIssue, FlowHealthStatus } from '@/components/flow/flowBuilderTypes'

const terminalNodeTypes = new Set(['CV', 'EP', 'AG'])

export function FlowHealthButton({
  status,
  problemCount,
  isOpen,
  onClick,
}: {
  status: FlowHealthStatus
  problemCount: number
  isOpen: boolean
  onClick: () => void
}) {
  const isHealthy = status === 'ok'
  const Icon = isHealthy ? Bot : BotOff
  const statusClass =
    status === 'ok'
      ? 'border-neon-green/35 text-neon-green shadow-[0_0_28px_rgba(57,255,20,0.18)]'
      : status === 'warning'
        ? 'border-neon-orange/45 text-neon-orange shadow-[0_0_28px_rgba(255,184,0,0.2)]'
        : 'border-danger/45 text-danger-soft shadow-[0_0_28px_rgba(255,59,95,0.2)]'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Ocultar painel de saude do fluxo' : 'Mostrar painel de saude do fluxo'}
      title={isHealthy ? 'Fluxo saudavel' : `${formatProblemCount(problemCount)} no fluxo`}
      className={cn(
        'absolute right-5 top-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border bg-[#11141d]/95 shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-md transition-all hover:scale-105',
        statusClass,
        isOpen && 'scale-105',
      )}
    >
      <Icon size={25} aria-hidden="true" />
      {!isHealthy && problemCount > 1 && (
        <span
          className={cn(
            'absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[10px] font-black text-white',
            status === 'warning'
              ? 'border-neon-orange/50 bg-neon-orange text-black'
              : 'border-danger/50 bg-danger',
          )}
        >
          {problemCount > 9 ? '9+' : problemCount}
        </span>
      )}
    </button>
  )
}

export function NodeTracePanel({
  node,
  health,
  logs,
  loading,
  issues,
  totalErrorCount,
  flowStatus,
  onClose,
}: {
  node: BuilderNode | null
  health: NodeRuntimeHealth | null
  logs: FlowNodeTrace[]
  loading: boolean
  issues: FlowHealthIssue[]
  totalErrorCount: number
  flowStatus: FlowHealthStatus
  onClose: () => void
}) {
  const hasErrors = (health?.errorCount ?? 0) > 0
  const hasFlowProblems = issues.length > 0 || totalErrorCount > 0
  const flowStatusClass =
    flowStatus === 'ok'
      ? 'border-neon-green/30 bg-neon-green/12 text-neon-green'
      : flowStatus === 'warning'
        ? 'border-neon-orange/35 bg-neon-orange/12 text-neon-orange'
        : 'border-danger/35 bg-danger/15 text-danger-soft'

  return (
    <div className="absolute right-5 top-24 z-30 w-[380px] max-w-[calc(100%-2.5rem)] rounded-[22px] border border-white/10 bg-[#11141d]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">
            Saude do fluxo
          </p>
          <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-white">
            {hasFlowProblems ? 'Revisao necessaria' : 'Tudo certo'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
              flowStatusClass,
            )}
          >
            {hasFlowProblems ? formatProblemCount(issues.length + totalErrorCount) : 'ok'}
          </Badge>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-colors hover:text-white"
            aria-label="Fechar saude do fluxo"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-[16px] border border-white/6 bg-white/5 px-4 py-4">
        {hasFlowProblems ? (
          <div className="space-y-3">
            {totalErrorCount > 0 && (
              <FlowHealthIssueItem
                issue={{
                  id: 'runtime-errors',
                  title: 'Erros recentes em execucao',
                  detail: `${totalErrorCount} erro(s) encontrados nos traces dos nos.`,
                  severity: 'error',
                }}
              />
            )}
            {issues.slice(0, 5).map((issue) => (
              <FlowHealthIssueItem key={issue.id} issue={issue} />
            ))}
            {issues.length > 5 && (
              <p className="text-xs font-semibold text-gray-500">
                +{issues.length - 5} pendencia(s) estrutural(is)
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm leading-6 text-gray-400">
            Nenhum erro recente ou pendencia estrutural encontrada. O fluxo esta pronto para teste.
          </p>
        )}
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">
            Trace do no
          </p>
          <h3 className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-white">
            {node ? node.data.title : 'Nenhum no selecionado'}
          </h3>
        </div>
        {node && (
          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
              hasErrors
                ? 'border-danger/35 bg-danger/15 text-danger-soft'
                : 'border-neon-green/30 bg-neon-green/12 text-neon-green',
            )}
          >
            {hasErrors ? `${health?.errorCount ?? 0} erros` : 'ok'}
          </Badge>
        )}
      </div>

      {!node ? (
        <div className="rounded-[16px] border border-white/6 bg-white/5 px-4 py-5 text-sm leading-6 text-gray-400">
          Selecione um no no canvas para ver os ultimos traces dele aqui.
        </div>
      ) : loading ? (
        <div className="flex items-center rounded-[16px] border border-white/6 bg-white/5 px-4 py-5 text-sm text-gray-400">
          <Loader2 size={15} className="mr-2 animate-spin" aria-hidden="true" />
          Buscando ultimos logs...
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
            Ultimos 3 logs de erro
          </p>
          {logs.map((log) => (
            <div key={log._id} className="rounded-[16px] border border-danger/20 bg-danger/8 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-danger/30 bg-danger/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-danger-soft">
                  {log.error?.code ?? 'NODE_ERROR'}
                </span>
                <span className="text-[10px] font-mono text-gray-500">{formatTraceTime(log.createdAt)}</span>
              </div>
              <p className="text-xs leading-5 text-gray-200">{log.error?.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                <span className="truncate font-mono">trace: {log.traceId}</span>
                <span className="text-right font-mono">{log.durationMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-white/6 bg-white/5 px-4 py-5 text-sm leading-6 text-gray-400">
          Nenhum erro recente para este no. Quando uma execucao do Telegram falhar, os ultimos traces aparecem aqui.
        </div>
      )}
    </div>
  )
}

function FlowHealthIssueItem({ issue }: { issue: FlowHealthIssue }) {
  return (
    <div className="flex gap-3">
      <span
        className={cn(
          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
          issue.severity === 'error' ? 'bg-danger' : 'bg-neon-orange',
        )}
      />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white">{issue.title}</p>
        <p className="mt-1 text-xs leading-5 text-gray-400">{issue.detail}</p>
      </div>
    </div>
  )
}

function formatProblemCount(count: number) {
  return `${count} ${count === 1 ? 'problema' : 'problemas'}`
}

export function validateFlowStructure(nodes: BuilderNode[], edges: BuilderEdge[]): FlowHealthIssue[] {
  if (nodes.length === 0) {
    return [
      {
        id: 'empty-flow',
        title: 'Fluxo vazio',
        detail: 'Adicione pelo menos um bloco inicial para o fluxo poder rodar.',
        severity: 'warning',
      },
    ]
  }

  const issues: FlowHealthIssue[] = []
  const nodeIds = new Set(nodes.map((node) => node.id))
  const incomingCount = new Map<string, number>()
  const outgoingCount = new Map<string, number>()

  nodes.forEach((node) => {
    incomingCount.set(node.id, 0)
    outgoingCount.set(node.id, 0)
  })

  if (!nodes.some((node) => node.id === START_NODE_ID && node.data.code === 'TR')) {
    issues.push({
      id: 'missing-trigger',
      title: 'Sem bloco inicial',
      detail: 'O bloco Início precisa estar no canvas para marcar por onde a jornada começa.',
      severity: 'warning',
    })
  }

  edges.forEach((edge) => {
    const sourceExists = nodeIds.has(edge.source)
    const targetExists = nodeIds.has(edge.target)

    if (!sourceExists || !targetExists) {
      issues.push({
        id: `invalid-edge-${edge.id}`,
        title: 'Conexao quebrada',
        detail: 'Existe uma conexao apontando para um no que nao esta mais no canvas.',
        severity: 'error',
      })
      return
    }

    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1)
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  })

  nodes.forEach((node) => {
    const isStartNode = node.id === START_NODE_ID
    const title = String(node.data.title ?? '').trim()
    const content = String(node.data.text ?? node.data.description ?? '').trim()
    const configIssues = isStartNode ? [] : validateBlockConfig(node.data.code, mergeBlockConfig(node.data.code, node.data.config))

    if (!title || !content) {
      issues.push({
        id: `missing-content-${node.id}`,
        title: 'Informacao incompleta',
        detail: `O no ${node.data.code} precisa de titulo e conteudo para rodar corretamente.`,
        severity: 'warning',
      })
    }

    configIssues.forEach((issue, index) => {
      issues.push({
        id: `config-${node.id}-${index}`,
        title: 'Configuração pendente',
        detail: `${node.data.title}: ${issue}`,
        severity: 'warning',
      })
    })

    const incoming = incomingCount.get(node.id) ?? 0
    const outgoing = outgoingCount.get(node.id) ?? 0

    if (nodes.length > 1 && !isStartNode && incoming === 0 && outgoing === 0) {
      issues.push({
        id: `isolated-node-${node.id}`,
        title: 'No isolado',
        detail: `${node.data.title} nao esta conectado ao fluxo.`,
        severity: 'warning',
      })
      return
    }

    if (isStartNode && outgoing === 0) {
      issues.push({
        id: 'start-without-output',
        title: 'Start sem próximo passo',
        detail: 'Conecte o bloco Início ao primeiro bloco da jornada.',
        severity: 'warning',
      })
      return
    }

    if (!terminalNodeTypes.has(node.data.code) && outgoing === 0) {
      issues.push({
        id: `missing-output-${node.id}`,
        title: 'Sem saida configurada',
        detail: `${node.data.title} precisa apontar para o proximo passo ou para um bloco final.`,
        severity: 'warning',
      })
    }
  })

  return issues
}

export function toTraceNodeRef(node: BuilderNode): FlowTraceNodeRef {
  return {
    id: node.id,
    type: node.data.code,
    label: node.data.title,
    category: node.data.category,
  }
}

function formatTraceTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}
