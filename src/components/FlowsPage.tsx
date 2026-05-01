import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Bot,
  GitBranch,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  Settings,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  listFlowsWithBots,
  type FlowGraph,
  type FlowStatus,
  type FlowWithBot,
  type ImportedFlowDraft,
} from '@/lib/api/flows'
import { cn } from '@/lib/utils'

interface FlowsPageProps {
  onCreateFlow: () => void
  onEditFlow: (flow: FlowWithBot) => void
  onImportFlow: (draft: ImportedFlowDraft) => void
}

type FlowKind = 'basico' | 'n8n'

export default function FlowsPage({ onCreateFlow, onEditFlow, onImportFlow }: FlowsPageProps) {
  const [flows, setFlows] = useState<FlowWithBot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [remarketingFlow, setRemarketingFlow] = useState<FlowWithBot | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    listFlowsWithBots()
      .then((data) => {
        if (!cancelled) {
          setFlows(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar fluxos.')
          setFlows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const linked = flows.filter((flow) => flow.status === 'active' && flow.bot_id).length
    const n8n = flows.filter((flow) => inferFlowKind(flow) === 'n8n').length

    return {
      linked,
      basic: Math.max(0, flows.length - n8n),
      n8n,
    }
  }, [flows])

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setImportError(null)

    try {
      const text = await file.text()
      const draft = parseImportedFlow(text, file.name)
      onImportFlow(draft)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Nao foi possivel importar este arquivo.')
    }
  }

  return (
    <main className="space-y-7 p-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Meus Fluxos</h2>
          <p className="mt-2 border-l border-white/10 pl-4 text-base text-gray-500">
            Gerencie seus fluxos de automacao e chatbots
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportFile(event)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            className="h-12 rounded-[14px] border-white/10 bg-[#0c0d10] px-5 text-sm font-black text-gray-300 hover:border-neon-purple/35 hover:bg-neon-purple/10 hover:text-white"
          >
            <Upload size={16} className="mr-2" aria-hidden="true" />
            Importar Fluxo
          </Button>
          <Button
            type="button"
            onClick={onCreateFlow}
            className="h-12 rounded-[14px] border border-white/10 bg-[#0c0d10] px-5 text-sm font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.14)] hover:border-neon-purple/45 hover:bg-neon-purple/15"
          >
            <Plus size={17} className="mr-2" aria-hidden="true" />
            Criar Fluxo ({flows.length}/50)
          </Button>
        </div>
      </section>

      {(error || importError) && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {importError ??
            (error && isFlowSchemaMissing(error)
              ? 'A biblioteca de fluxos precisa da migration supabase/migrations/20260430000100_make_flows_library.sql aplicada no Supabase.'
              : error)}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FlowSummaryCard icon={Link2} label="Vinculados" value={stats.linked} tone="blue" />
        <FlowSummaryCard icon={Zap} label="Basicos" value={stats.basic} tone="blue" />
        <FlowSummaryCard icon={GitBranch} label="Fluxos N8N" value={stats.n8n} tone="purple" />
      </section>

      {loading && (
        <div className="flex min-h-[340px] items-center justify-center rounded-[18px] border border-white/10 bg-[#0c0d10] text-gray-500">
          <Loader2 size={20} className="mr-3 animate-spin" aria-hidden="true" />
          Carregando fluxos...
        </div>
      )}

      {!loading && flows.length === 0 && (
        <section className="rounded-[18px] border border-white/10 bg-[#0c0d10] px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
            <GitBranch size={26} aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-xl font-black text-white">Nenhum fluxo salvo ainda</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
            Crie um fluxo, monte o canvas e salve escolhendo o bot que vai executar esse funil.
          </p>
          <Button
            type="button"
            onClick={onCreateFlow}
            className="mt-6 rounded-full border border-neon-purple/45 bg-neon-purple/15 px-6 font-bold text-neon-purple hover:bg-neon-purple/25"
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            Criar primeiro fluxo
          </Button>
        </section>
      )}

      {!loading && flows.length > 0 && (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {flows.map((flow) => (
            <SavedFlowCard
              key={flow.id}
              flow={flow}
              onEdit={() => onEditFlow(flow)}
              onRemarketing={() => setRemarketingFlow(flow)}
            />
          ))}
        </section>
      )}

      {remarketingFlow && (
        <RemarketingDialog
          flow={remarketingFlow}
          onClose={() => setRemarketingFlow(null)}
          onEdit={() => {
            const flowToEdit = remarketingFlow
            setRemarketingFlow(null)
            onEditFlow(flowToEdit)
          }}
        />
      )}
    </main>
  )
}

function FlowSummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof GitBranch
  label: string
  value: number
  tone: 'blue' | 'purple'
}) {
  const toneClass = {
    blue: 'border-[#2f80ff]/25 bg-[#2f80ff]/10 text-[#2f80ff]',
    purple: 'border-neon-purple/25 bg-neon-purple/12 text-neon-purple',
  }[tone]

  return (
    <div className="rounded-[14px] border border-white/10 bg-[#0c0d10] px-5 py-5">
      <div className="flex items-center gap-4">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-[10px] border', toneClass)}>
          <Icon size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-600">{label}</p>
          <p className="mt-1 text-3xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SavedFlowCard({
  flow,
  onEdit,
  onRemarketing,
}: {
  flow: FlowWithBot
  onEdit: () => void
  onRemarketing: () => void
}) {
  const isLinked = flow.status === 'active' && Boolean(flow.bot_id)
  const kind = inferFlowKind(flow)

  return (
    <article className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0c0d10] transition-colors hover:border-neon-purple/30">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border',
              kind === 'n8n'
                ? 'border-neon-purple/25 bg-neon-purple/12 text-neon-purple'
                : 'border-[#2f80ff]/25 bg-[#2f80ff]/10 text-[#2f80ff]',
            )}
          >
            {kind === 'n8n' ? <GitBranch size={22} aria-hidden="true" /> : <Zap size={22} aria-hidden="true" />}
          </span>
          <StatusBadge status={(flow.status ?? 'paused') as FlowStatus} linked={isLinked} />
        </div>

        <h3 className="truncate text-xl font-black text-white">{flow.name || 'Fluxo sem nome'}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge
            className={cn(
              'border px-2.5 py-1 text-[10px] font-black uppercase',
              kind === 'n8n'
                ? 'border-neon-purple/25 bg-neon-purple/12 text-neon-purple'
                : 'border-[#2f80ff]/25 bg-[#2f80ff]/10 text-[#2f80ff]',
            )}
          >
            {kind === 'n8n' ? 'N8N' : 'Basico'}
          </Badge>
        </div>

        <p className="mt-5 flex min-w-0 items-center gap-2 text-sm text-gray-500">
          <Bot size={14} className="shrink-0 text-gray-600" aria-hidden="true" />
          <span className="truncate">
            {flow.bot?.name ?? 'Nenhum bot vinculado ainda'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 border-y border-white/10">
        <FlowStat label="Starts" value={flow.metrics.starts} />
        <FlowStat label="Conversao" value={`${flow.metrics.conversionRate}%`} />
      </div>

      <button
        type="button"
        onClick={onRemarketing}
        className="flex w-full items-center justify-center gap-2 border-b border-white/10 px-5 py-4 text-sm font-black text-white transition-colors hover:bg-neon-purple/10 hover:text-neon-purple"
      >
        <Megaphone size={15} aria-hidden="true" />
        Remarketing
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center justify-center gap-2 px-5 py-4 text-sm font-black text-white transition-colors hover:bg-neon-purple/10 hover:text-neon-purple"
      >
        <Settings size={15} aria-hidden="true" />
        Editar Fluxo
      </button>
    </article>
  )
}

function FlowStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-white/10 px-5 py-4 text-center last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function RemarketingDialog({
  flow,
  onClose,
  onEdit,
}: {
  flow: FlowWithBot
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remarketing-dialog-title"
        className="w-full max-w-xl rounded-[24px] border border-neon-purple/25 bg-[#0c0d10] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-neon-purple/25 bg-neon-purple/12 text-neon-purple">
              <Megaphone size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neon-purple">
                Remarketing
              </p>
              <h2 id="remarketing-dialog-title" className="mt-1 text-2xl font-black text-white">
                Preparar disparo
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Esta versao apenas prepara a revisao do fluxo. Nenhuma mensagem sera enviada sem uma rotina segura de backend e confirmacao final.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-colors hover:text-white"
            aria-label="Fechar remarketing"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 rounded-[16px] border border-white/10 bg-[#08090b] p-4 sm:grid-cols-2">
          <DialogMetric label="Fluxo" value={flow.name || 'Fluxo sem nome'} />
          <DialogMetric label="Bot executor" value={flow.bot?.name ?? 'Nenhum bot vinculado'} />
          <DialogMetric label="Status" value={flow.status === 'active' && flow.bot_id ? 'Ativo' : 'Pausado'} />
          <DialogMetric label="Conversao" value={`${flow.metrics.conversionRate}%`} />
          <DialogMetric label="Starts" value={String(flow.metrics.starts)} />
          <DialogMetric label="Leads" value={String(flow.metrics.leads)} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            title="Disparo real em breve"
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-500"
          >
            Disparo seguro em breve
          </Button>
          <Button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-5 font-bold text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95"
          >
            Editar antes
          </Button>
        </div>
      </div>
    </div>
  )
}

function DialogMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] border border-white/10 bg-white/[0.035] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status, linked }: { status: FlowStatus; linked: boolean }) {
  const label = linked ? 'Ativo' : status === 'draft' ? 'Rascunho' : 'Pausado'
  const className = linked
    ? 'border-neon-green/25 bg-neon-green/10 text-neon-green'
    : status === 'draft'
      ? 'border-neon-orange/25 bg-neon-orange/10 text-neon-orange'
      : 'border-white/10 bg-white/5 text-gray-500'

  return (
    <Badge className={cn('px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]', className)}>
      {label}
    </Badge>
  )
}

function parseImportedFlow(text: string, fileName: string): ImportedFlowDraft {
  let payload: unknown

  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('Arquivo invalido. Envie um JSON de fluxo com nodes e edges.')
  }

  const container = isRecord(payload) && isRecord(payload.graph) ? payload.graph : payload
  const graph = normalizeImportedGraph(container)

  if (!graph) {
    throw new Error('JSON sem formato de fluxo. Use { nodes, edges } ou { name, graph: { nodes, edges } }.')
  }

  return {
    id: `import_${Date.now().toString(36)}`,
    name: getImportedFlowName(payload, fileName),
    graph,
  }
}

function normalizeImportedGraph(value: unknown): FlowGraph | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null
  }

  const nodes = value.nodes
    .map((node, index) => normalizeImportedNode(node, index))
    .filter((node): node is FlowGraph['nodes'][number] => Boolean(node))
  const edges = value.edges
    .map((edge, index) => normalizeImportedEdge(edge, index))
    .filter((edge): edge is FlowGraph['edges'][number] => Boolean(edge))

  if (nodes.length === 0) return null

  return {
    nodes,
    edges,
  }
}

function normalizeImportedNode(node: unknown, index: number): FlowGraph['nodes'][number] | null {
  if (!isRecord(node)) return null

  const type = getString(node.type) ?? getString(node.code) ?? 'MS'
  const label = getString(node.label) ?? getString(node.title) ?? getString(node.name) ?? `Bloco ${index + 1}`
  const position = isRecord(node.position)
    ? {
        x: getNumber(node.position.x) ?? 180 + (index % 3) * 320,
        y: getNumber(node.position.y) ?? 180 + Math.floor(index / 3) * 180,
      }
    : {
        x: 180 + (index % 3) * 320,
        y: 180 + Math.floor(index / 3) * 180,
      }

  return {
    id: getString(node.id) ?? `imported_node_${index + 1}`,
    type,
    label,
    content: getString(node.content) ?? getString(node.text) ?? getString(node.description) ?? label,
    options: Array.isArray(node.options) ? node.options.filter((item): item is string => typeof item === 'string') : undefined,
    config: isRecord(node.config) ? node.config : undefined,
    outputs: normalizeOutputs(node.outputs),
    position,
  }
}

function normalizeImportedEdge(edge: unknown, index: number): FlowGraph['edges'][number] | null {
  if (!isRecord(edge)) return null

  const source = getString(edge.source)
  const target = getString(edge.target)
  if (!source || !target) return null

  return {
    id: getString(edge.id) ?? `imported_edge_${index + 1}`,
    source,
    target,
    sourceHandle: getString(edge.sourceHandle) ?? undefined,
    targetHandle: getString(edge.targetHandle) ?? undefined,
    label: getString(edge.label) ?? undefined,
  }
}

function normalizeOutputs(outputs: unknown): FlowGraph['nodes'][number]['outputs'] {
  if (!Array.isArray(outputs)) return undefined

  const normalized = outputs
    .map((output, index) => {
      if (!isRecord(output)) return null
      const id = getString(output.id) ?? `output_${index + 1}`
      const label = getString(output.label) ?? id
      return { id, label }
    })
    .filter((item): item is { id: string; label: string } => Boolean(item))

  return normalized.length > 0 ? normalized : undefined
}

function getImportedFlowName(payload: unknown, fileName: string) {
  const fromPayload = isRecord(payload) ? getString(payload.name) ?? getString(payload.title) : null
  if (fromPayload) return fromPayload

  return fileName.replace(/\.json$/i, '').trim() || 'Fluxo importado'
}

function inferFlowKind(flow: FlowWithBot): FlowKind {
  const graph = flow.graph
  if (!isRecord(graph)) return 'basico'

  const metadata = isRecord(graph.metadata) ? graph.metadata : null
  const source = [
    getString(graph.type),
    getString(graph.kind),
    getString(graph.source),
    getString(metadata?.type),
    getString(metadata?.kind),
    getString(metadata?.source),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return source.includes('n8n') ? 'n8n' : 'basico'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isFlowSchemaMissing(message: string) {
  return /status|created_at|flows_one_active_per_bot|bot_id|schema cache|relation .* does not exist/i.test(message)
}
