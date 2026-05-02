import { RefreshCcw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { AnalysisResult } from '@/lib/flowIntel'
import { cn } from '@/lib/utils'
import type { BuilderNode } from '@/components/flow/flowBuilderTypes'
import { BuilderPill } from '@/components/flow/FlowBuilderPill'

export function IntelDock({
  analysis,
  selectedNode,
  onRestoreDemo,
  onAnalyze,
  logsReady,
}: {
  analysis: AnalysisResult | null
  selectedNode: BuilderNode | null
  onRestoreDemo: () => void
  onAnalyze: () => void
  logsReady: boolean
}) {
  const tiles = analysis
    ? [
        { label: 'Gargalos', value: analysis.bottlenecks.length, tone: 'text-neon-orange' },
        { label: 'Mensagens', value: analysis.messageEvaluations.length, tone: 'text-neon-magenta' },
        { label: 'Intencoes', value: analysis.unmappedIntents.length, tone: 'text-neon-purple' },
        { label: 'Estrutura', value: analysis.structuralOptimizations.length, tone: 'text-neon-green' },
      ]
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit rounded-full border-neon-purple/30 bg-neon-purple/12 px-3 py-1 text-neon-purple">
            estilo builder + intel heuristico
          </Badge>
          <p className="max-w-3xl text-sm leading-7 text-gray-400">
            O canvas segue a pegada Manychat e n8n. O Flow Intel fica aqui embaixo,
            lendo o fluxo atual e os logs colados para gerar o mesmo JSON de analise.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRestoreDemo}
            className="border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
          >
            <RefreshCcw size={14} className="mr-2" aria-hidden="true" />
            Restaurar demo
          </Button>
          <Button
            type="button"
            onClick={onAnalyze}
            disabled={!logsReady}
            className="bg-neon-purple/20 border border-neon-purple text-neon-purple hover:bg-neon-purple/30"
          >
            <Sparkles size={14} className="mr-2" aria-hidden="true" />
            Rodar analise
          </Button>
        </div>
      </div>

      {selectedNode && (
        <Card className="border-white/6 bg-surface-3">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <BuilderPill label={`no ativo: ${selectedNode.data.code}`} tone="neutral" />
              <p className="text-sm font-semibold text-white">{selectedNode.data.title}</p>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
              {selectedNode.data.text || selectedNode.data.description}
            </p>
          </CardContent>
        </Card>
      )}

      {analysis ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-[22px] border border-white/6 bg-surface-3 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                  {tile.label}
                </p>
                <p className={cn('mt-4 text-3xl font-display font-bold text-white', tile.tone)}>
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <IntelSection title="Gargalos de conversao">
              {analysis.bottlenecks.length > 0 ? (
                analysis.bottlenecks.map((item) => (
                  <IntelItem
                    key={item.nodeId}
                    title={`${item.nodeType} · ${item.nodeLabel}`}
                    badge={`${item.dropRate}% drop`}
                    tone="orange"
                    body={item.suggestion}
                  />
                ))
              ) : (
                <EmptyIntel text="Nenhum gargalo acima do limiar atual." />
              )}
            </IntelSection>

            <IntelSection title="Clareza e persuasao">
              {analysis.messageEvaluations.filter((item) => item.score < 4).length > 0 ? (
                analysis.messageEvaluations
                  .filter((item) => item.score < 4)
                  .map((item) => (
                    <IntelItem
                      key={item.nodeId}
                      title={`No ${item.nodeId}`}
                      badge={`nota ${item.score}/5`}
                      tone="magenta"
                      body={item.improvedText}
                    />
                  ))
              ) : (
                <EmptyIntel text="Nao houve mensagens abaixo da linha de corte." />
              )}
            </IntelSection>

            <IntelSection title="Intencoes nao mapeadas">
              {analysis.unmappedIntents.length > 0 ? (
                analysis.unmappedIntents.map((item) => (
                  <IntelItem
                    key={item.intent}
                    title={item.intent}
                    badge={`${item.frequency}x`}
                    tone="blue"
                    body={`${item.suggestedNodeType}: ${item.exampleImplementation}`}
                  />
                ))
              ) : (
                <EmptyIntel text="Nenhuma intencao recorrente fora do fluxo." />
              )}
            </IntelSection>

            <IntelSection title="Otimizacoes estruturais">
              {analysis.structuralOptimizations.length > 0 ? (
                analysis.structuralOptimizations.map((item, index) => (
                  <IntelItem
                    key={`${item.issue}-${index}`}
                    title={item.issue}
                    badge={item.nodeIds.length > 0 ? `${item.nodeIds.length} nos` : 'geral'}
                    tone="green"
                    body={`${item.nodeIds.join(', ') || 'sem ids especificos'} · ${item.recommendation}`}
                  />
                ))
              ) : (
                <EmptyIntel text="Nenhum ajuste estrutural sugerido." />
              )}
            </IntelSection>
          </div>
        </>
      ) : (
        <Card className="border-white/6 bg-surface-3">
          <CardContent className="flex min-h-[180px] items-center justify-center text-center text-sm text-gray-500">
            Rode a analise para preencher o dock com gargalos, copy otimizada e o JSON final.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function JsonDock({
  title,
  description,
  value,
  onChange,
  errors,
  actions,
  readOnly = false,
}: {
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  errors: string[]
  actions: React.ReactNode
  readOnly?: boolean
}) {
  return (
    <Card className="border-white/6 bg-surface-3">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-white/6 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>

        <div className="space-y-3 p-4">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            className="min-h-[360px] resize-y border-white/10 bg-[#0f1118] font-mono text-xs leading-6 text-gray-200 placeholder:text-gray-600"
          />

          {errors.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300">
                Ajustes necessarios
              </p>
              <ul className="space-y-1 text-sm text-red-200">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function IntelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neon-purple" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function IntelItem({
  title,
  badge,
  tone,
  body,
}: {
  title: string
  badge: string
  tone: 'blue' | 'magenta' | 'green' | 'orange'
  body: string
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-neon-purple/30 bg-neon-purple/12 text-neon-purple'
      : tone === 'magenta'
      ? 'border-neon-magenta/30 bg-neon-magenta/12 text-neon-magenta'
      : tone === 'green'
      ? 'border-neon-green/30 bg-neon-green/12 text-neon-green'
      : 'border-neon-orange/30 bg-neon-orange/12 text-neon-orange'

  return (
    <div className="rounded-[22px] border border-white/6 bg-surface-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', toneClass)}>
          {badge}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-7 text-gray-400">{body}</p>
    </div>
  )
}

function EmptyIntel({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-white/6 bg-surface-3 px-4 py-5 text-sm text-gray-500">
      {text}
    </div>
  )
}
