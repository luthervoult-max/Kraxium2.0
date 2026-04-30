import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  GitBranch,
  Link2,
  Loader2,
  Plus,
  Settings,
  Upload,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listFlowsWithBots, type FlowStatus, type FlowWithBot } from '@/lib/api/flows'
import { cn } from '@/lib/utils'

interface FlowsPageProps {
  onCreateFlow: () => void
  onEditFlow: (flow: FlowWithBot) => void
}

export default function FlowsPage({ onCreateFlow, onEditFlow }: FlowsPageProps) {
  const [flows, setFlows] = useState<FlowWithBot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    const paused = flows.filter((flow) => flow.status !== 'active' || !flow.bot_id).length

    return {
      linked,
      basic: flows.length,
      paused,
    }
  }, [flows])

  return (
    <main className="space-y-7 p-6">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Meus Fluxos</h2>
          <p className="mt-2 text-sm text-gray-400">
            Gerencie seus fluxos de automacao e escolha qual bot executa cada funil.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled
            title="Importar Fluxo em breve"
            className="h-12 rounded-[14px] border-white/10 bg-white/5 px-5 text-sm font-black text-gray-500"
          >
            <Upload size={16} className="mr-2" aria-hidden="true" />
            Importar Fluxo
          </Button>
          <Button
            type="button"
            onClick={onCreateFlow}
            className="h-12 rounded-[14px] border border-neon-purple/45 bg-white/5 px-5 text-sm font-black text-white shadow-[0_0_18px_rgba(180,77,255,0.18)] hover:bg-neon-purple/15"
          >
            <Plus size={17} className="mr-2" aria-hidden="true" />
            Criar Fluxo ({flows.length}/50)
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
          {isFlowSchemaMissing(error)
            ? 'A biblioteca de fluxos precisa da migration supabase/migrations/20260430000100_make_flows_library.sql aplicada no Supabase.'
            : error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FlowSummaryCard icon={Link2} label="Vinculados" value={stats.linked} tone="blue" />
        <FlowSummaryCard icon={Zap} label="Basicos" value={stats.basic} tone="purple" />
        <FlowSummaryCard icon={GitBranch} label="Sem bot ativo" value={stats.paused} tone="orange" />
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
            <SavedFlowCard key={flow.id} flow={flow} onEdit={() => onEditFlow(flow)} />
          ))}
        </section>
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
  tone: 'blue' | 'purple' | 'orange'
}) {
  const toneClass = {
    blue: 'border-neon-purple/20 bg-neon-purple/10 text-neon-purple',
    purple: 'border-neon-magenta/20 bg-neon-magenta/10 text-neon-magenta',
    orange: 'border-neon-orange/20 bg-neon-orange/10 text-neon-orange',
  }[tone]

  return (
    <div className="rounded-[14px] border border-white/10 bg-[#0c0d10] px-6 py-6">
      <div className="flex items-center gap-4">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl border', toneClass)}>
          <Icon size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SavedFlowCard({ flow, onEdit }: { flow: FlowWithBot; onEdit: () => void }) {
  const isLinked = flow.status === 'active' && Boolean(flow.bot_id)

  return (
    <article className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0c0d10] transition-colors hover:border-neon-purple/30">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
              isLinked
                ? 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple'
                : 'border-white/10 bg-white/5 text-gray-500',
            )}
          >
            <GitBranch size={22} aria-hidden="true" />
          </span>
          <StatusBadge status={(flow.status ?? 'paused') as FlowStatus} linked={isLinked} />
        </div>

        <h3 className="truncate text-xl font-black text-white">{flow.name || 'Fluxo sem nome'}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="border-neon-purple/25 bg-neon-purple/12 px-2.5 py-1 text-[10px] font-black uppercase text-neon-purple">
            Basico
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

function isFlowSchemaMissing(message: string) {
  return /status|created_at|flows_one_active_per_bot|bot_id|schema cache|relation .* does not exist/i.test(message)
}
