import { useEffect, useMemo, useState } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  Check,
  GitBranch,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Wand2,
  Smartphone,
} from 'lucide-react'
import { getFlowByBotId, saveFlow, type Flow } from '@/lib/api/flows'
import '@xyflow/react/dist/style.css'
import { FlowNode, type FlowNodeData } from '@/components/flow/FlowNode'
import { TelegramSimulator } from '@/components/telegram/TelegramSimulator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { blocksByCategory, categoryMeta, type BlockDef, type Category } from '@/lib/blocks'
import {
  buildFlowPreview,
  flowIntelExampleFlowJson,
  flowIntelExampleLogsJson,
  generateFlowIntelReport,
  parseFlowInput,
  parseLogsInput,
  type AnalysisResult,
} from '@/lib/flowIntel'
import { cn } from '@/lib/utils'

type BuilderNode = Node<FlowNodeData, 'flowNode'>
type BuilderEdge = Edge

const nodeTypes = { flowNode: FlowNode }

const starterFlowObject = {
  nodes: [
    { id: 'tr_access', type: 'TR', label: 'Comando /vip_access', content: 'Disparo inicial para iniciar o fluxo premium.', position: { x: 160, y: 180 } },
    { id: 'ms_welcome', type: 'MS', label: 'Mensagem de boas-vindas', content: 'Apresenta a oferta e direciona o usuario para a proxima etapa.', position: { x: 520, y: 360 } },
    { id: 'cv_confirmed', type: 'CV', label: 'Conversao confirmada', content: 'Fecha o fluxo com ativacao ou confirmacao de compra.', position: { x: 900, y: 180 } },
  ],
  edges: [
    { id: 'edge_tr_ms', source: 'tr_access', target: 'ms_welcome' },
    { id: 'edge_ms_cv', source: 'ms_welcome', target: 'cv_confirmed' },
  ],
}

const starterFlowJson = JSON.stringify(starterFlowObject, null, 2)
const demoCanvasState = buildCanvasState(flowIntelExampleFlowJson)
const demoAnalysis = generateFlowIntelReport(
  flowIntelExampleFlowJson,
  flowIntelExampleLogsJson,
).report?.result ?? null

interface FlowIntelProps {
  botId: string | null
}

export default function FlowIntel({ botId }: FlowIntelProps) {
  const [flow, setFlow] = useState<Flow | null>(null)
  const [flowName, setFlowName] = useState('VIP Onboarding Kraxium')
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(demoCanvasState.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(demoCanvasState.edges)
  const [flowDraft, setFlowDraft] = useState(flowIntelExampleFlowJson)
  const [logsText, setLogsText] = useState(flowIntelExampleLogsJson)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(demoAnalysis)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'saving'>('idle')
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<BuilderNode, BuilderEdge> | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [isBlockPaletteCollapsed, setIsBlockPaletteCollapsed] = useState(false)
  const [loadingFlow, setLoadingFlow] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!botId) {
      setFlow(null)
      setNodes(demoCanvasState.nodes)
      setEdges(demoCanvasState.edges)
      setFlowName('VIP Onboarding Kraxium')
      setFlowDraft(flowIntelExampleFlowJson)
      setLogsText(flowIntelExampleLogsJson)
      setAnalysis(demoAnalysis)
      setLoadError(null)
      setLoadingFlow(false)
      return
    }
    let cancelled = false
    setLoadingFlow(true)
    setLoadError(null)
    getFlowByBotId(botId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          const next = buildCanvasState(starterFlowJson)
          setFlow(null)
          setFlowName('Novo fluxo')
          setNodes(next.nodes)
          setEdges(next.edges)
          setFlowDraft(starterFlowJson)
          setLogsText('[]')
          setAnalysis(null)
          setLoadError('Nenhum fluxo salvo para este bot. Voce pode montar um novo fluxo no canvas.')
          return
        }
        setFlow(data)
        setFlowName(data.name)
        const graphJson =
          data.graph && Object.keys(data.graph as object).length > 0
            ? JSON.stringify(data.graph, null, 2)
            : starterFlowJson
        const next = buildCanvasState(graphJson)
        setNodes(next.nodes)
        setEdges(next.edges)
        setFlowDraft(graphJson)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Falha ao carregar fluxo.')
      })
      .finally(() => {
        if (!cancelled) setLoadingFlow(false)
      })
    return () => {
      cancelled = true
    }
  }, [botId, setNodes, setEdges])

  const canvasFlowJson = useMemo(
    () => JSON.stringify(exportCanvasFlow(nodes, edges), null, 2),
    [nodes, edges],
  )
  const flowDraftParse = useMemo(() => parseFlowInput(flowDraft), [flowDraft])
  const logsParse = useMemo(() => parseLogsInput(logsText), [logsText])

  useEffect(() => {
    setFlowDraft(canvasFlowJson)
  }, [canvasFlowJson])

  useEffect(() => {
    const selectedStillExists = nodes.some((node) => node.id === selectedNodeId)
    if (!selectedStillExists) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

  const onConnect: OnConnect = (connection) => {
    setEdges((currentEdges) => addEdge(buildEdge(connection, nodes), currentEdges))
  }

  function handleAnalyze() {
    if (!logsParse.data || logsParse.errors.length > 0) {
      return
    }

    const report = generateFlowIntelReport(canvasFlowJson, logsText).report
    setAnalysis(report?.result ?? null)
  }

  async function handleSave() {
    if (!flow) return
    setSaveState('saving')
    try {
      const graph = exportCanvasFlow(nodes, edges)
      await saveFlow(flow.id, flowName.trim() || 'Sem nome', graph)
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1800)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Falha ao salvar fluxo.')
      setSaveState('idle')
    }
  }

  function handleNewFlow() {
    const next = buildCanvasState(starterFlowJson)
    setNodes(next.nodes)
    setEdges(next.edges)
    setLogsText('[]')
    setAnalysis(null)
    setSelectedNodeId(null)
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()

    const payload = event.dataTransfer.getData('application/kraxium-block')
    if (!payload || !reactFlowInstance) {
      return
    }

    try {
      const block = JSON.parse(payload) as BlockDef
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addBlockToCanvas(block, position)
    } catch {
      // ignore invalid drag payloads
    }
  }

  function addBlockToCanvas(block: BlockDef, dropPosition?: { x: number; y: number }) {
    const nextNode = createNodeFromBlock(block, nodes, dropPosition, selectedNodeId)

    setNodes((currentNodes) => [...currentNodes, nextNode])

    if (selectedNodeId) {
      setEdges((currentEdges) => [
        ...currentEdges,
        buildEdge(
          {
            source: selectedNodeId,
            target: nextNode.id,
            sourceHandle: null,
            targetHandle: null,
          },
          [...nodes, nextNode],
        ),
      ])
    }

    setSelectedNodeId(nextNode.id)
  }

  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId) ?? null
    : null
  const isFocusMode = isBlockPaletteCollapsed
  const builderPanelHeightClass = 'h-[calc(100vh-260px)] min-h-[620px] xl:h-[calc(100vh-220px)]'

  function handleToggleFocusMode() {
    const nextFocusMode = !isFocusMode
    setIsBlockPaletteCollapsed(nextFocusMode)
  }

  if (loadingFlow) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center rounded-[28px] border border-white/8 bg-[#11141d] p-16 text-gray-500">
          <Loader2 size={20} className="mr-3 animate-spin" aria-hidden />
          Carregando fluxo…
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-6">
      {(!botId || loadError) && (
        <div className="mb-5 rounded-[18px] border border-neon-blue/20 bg-neon-blue/8 px-5 py-4 text-sm leading-6 text-gray-300">
          {loadError ?? 'Modo demo ativo. Selecione um bot na aba Bots quando quiser salvar em um fluxo real.'}
        </div>
      )}

      <div
        className={cn(
          'grid gap-6',
          isBlockPaletteCollapsed
            ? 'xl:grid-cols-[72px_minmax(0,1fr)]'
            : 'xl:grid-cols-[260px_minmax(0,1fr)]',
        )}
      >
        <aside
          className={cn(
            'flex flex-col overflow-hidden border border-white/6 bg-[#171923] shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition-all',
            builderPanelHeightClass,
            isBlockPaletteCollapsed
              ? 'w-full rounded-[24px] xl:min-h-[640px] xl:w-[72px]'
              : 'w-full rounded-l-[34px] xl:max-h-full xl:max-w-[260px]',
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 border-b border-white/6',
              isBlockPaletteCollapsed ? 'px-4 py-4 xl:flex-col xl:px-3 xl:py-5' : 'px-6 py-6',
            )}
          >
            {isBlockPaletteCollapsed ? (
              <div className="flex items-center gap-3 xl:flex-col">
                <span className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-neon-blue/25 bg-neon-blue/12 text-neon-blue">
                  <GitBranch size={17} aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-neon-blue xl:[writing-mode:vertical-rl] xl:rotate-180">
                  Blocos
                </span>
              </div>
            ) : (
              <h2 className="text-lg font-bold uppercase tracking-wider text-neon-blue">
                Blocos disponiveis
              </h2>
            )}

            <button
              type="button"
              onClick={() => setIsBlockPaletteCollapsed((value) => !value)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-neon-blue/30 hover:text-neon-blue"
              aria-label={isBlockPaletteCollapsed ? 'Expandir blocos' : 'Minimizar blocos'}
              title={isBlockPaletteCollapsed ? 'Expandir blocos' : 'Minimizar blocos'}
            >
              {isBlockPaletteCollapsed ? (
                <PanelLeftOpen size={16} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          {!isBlockPaletteCollapsed && (
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {blocksByCategory.map((group) => (
              <section key={group.category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/7" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gray-500">
                    {formatCategoryLabel(group.meta.label)}
                  </p>
                </div>

                <div className="space-y-3">
                  {group.blocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/kraxium-block', JSON.stringify(block))
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => addBlockToCanvas(block)}
                      className="group w-full h-20 rounded-[6px] border border-white/8 bg-[#1c202a] p-3 text-left transition-all hover:border-white/15 hover:bg-[#202531] overflow-hidden"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border text-lg font-bold font-mono"
                          style={{
                            color: group.meta.color,
                            background: `rgba(${group.meta.rgb}, 0.12)`,
                            borderColor: `rgba(${group.meta.rgb}, 0.24)`,
                          }}
                        >
                          {block.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold uppercase tracking-[0.04em] text-white">
                            {block.title}
                          </p>
                          <p className="mt-2 text-[14px] leading-8 text-gray-400">
                            {normalizeDescription(block.description)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <section className={cn('flex flex-col overflow-hidden rounded-[34px] border border-white/6 bg-[#171923] shadow-[0_24px_80px_rgba(0,0,0,0.32)]', builderPanelHeightClass)}>
            <div className="flex flex-col gap-4 border-b border-white/6 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  value={flowName}
                  onChange={(event) => setFlowName(event.target.value)}
                  className="h-14 w-full rounded-full border border-white/10 bg-[#11131a] px-6 text-lg text-white outline-none transition-colors focus:border-neon-blue/50"
                  placeholder="Nome do fluxo"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  className="h-14 rounded-full border border-white/10 bg-white/5 px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white hover:bg-white/10"
                >
                  <Wand2 size={15} className="mr-2" aria-hidden="true" />
                  Gerar com IA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleToggleFocusMode}
                  className={cn(
                    'h-14 rounded-full px-6 text-[12px] font-bold uppercase tracking-[0.26em]',
                    isFocusMode
                      ? 'border-neon-green/40 bg-neon-green/15 text-neon-green hover:bg-neon-green/20'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10',
                  )}
                >
                  {isFocusMode ? (
                    <Minimize2 size={15} className="mr-2" aria-hidden="true" />
                  ) : (
                    <Maximize2 size={15} className="mr-2" aria-hidden="true" />
                  )}
                  {isFocusMode ? 'Sair do foco' : 'Modo foco'}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!flow || saveState === 'saving'}
                  title={!flow ? 'Selecione um bot para salvar no Supabase.' : undefined}
                  className="h-14 rounded-full border border-[#8f69f4] bg-[linear-gradient(90deg,#a96bff,#70f1a5)] px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-[#16181f] hover:opacity-95 disabled:opacity-60"
                >
                  {saveState === 'saving' ? (
                    <Loader2 size={15} className="mr-2 animate-spin" aria-hidden="true" />
                  ) : saveState === 'saved' ? (
                    <Check size={15} className="mr-2" aria-hidden="true" />
                  ) : (
                    <Save size={15} className="mr-2" aria-hidden="true" />
                  )}
                  {saveState === 'saving'
                    ? 'Salvando…'
                    : saveState === 'saved'
                    ? 'Fluxo salvo'
                    : 'Salvar fluxo'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNewFlow}
                  className="h-14 rounded-full border-white/10 bg-white/5 px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white hover:bg-white/10"
                >
                  <Plus size={15} className="mr-2" aria-hidden="true" />
                  Novo fluxo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSimulator((value) => !value)}
                  className={cn(
                    'h-14 rounded-full px-6 text-[12px] font-bold uppercase tracking-[0.26em]',
                    showSimulator
                      ? 'border-[#2b87f5] bg-[#2b87f5]/15 text-[#2b87f5] hover:bg-[#2b87f5]/20'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10',
                  )}
                >
                  <Smartphone size={15} className="mr-2" aria-hidden="true" />
                  Simulador
                </Button>
              </div>
            </div>

            <div
              className={cn(
                'grid min-h-0 flex-1 bg-[#12141b]',
                showSimulator ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1',
              )}
            >
            <div
              className="relative h-full min-h-[520px] bg-[#12141b]"
              onDrop={handleCanvasDrop}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
            >
              <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2">
                <BuilderPill label={`${nodes.length} nos`} tone="blue" />
                <BuilderPill label={`${edges.length} conexoes`} tone="magenta" />
                <BuilderPill
                  label={logsParse.errors.length === 0 ? `${logsParse.counts.logs ?? 0} logs` : 'logs pendentes'}
                  tone={logsParse.errors.length === 0 ? 'green' : 'orange'}
                />
                {selectedNode && (
                <BuilderPill label={`selecionado: ${selectedNode.data.code}`} tone="neutral" />
                )}
              </div>

              <ReactFlow<BuilderNode, BuilderEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onInit={setReactFlowInstance}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable
                nodesConnectable
                elementsSelectable
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  color="rgba(255,255,255,0.08)"
                  gap={22}
                  size={1}
                />
                <Controls
                  showInteractive={false}
                  className="[&>button]:!h-10 [&>button]:!w-10 [&>button]:!border-white/10 [&>button]:!bg-[#12141b] [&>button]:!text-white"
                />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => categoryMeta[(node.data as FlowNodeData).category].color}
                  maskColor="rgba(8, 10, 16, 0.74)"
                  style={{
                    background: '#0f1118',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 28,
                  }}
                />
              </ReactFlow>
            </div>
              {showSimulator && (
                <div className="border-l border-white/6 bg-[#0a0d14] p-4 overflow-y-auto">
                  <TelegramSimulator
                    flowId={flowName || 'default-flow'}
                    flowName={flowName}
                    nodes={nodes}
                    edges={edges}
                  />
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}

function BuilderPill({
  label,
  tone,
}: {
  label: string
  tone: 'blue' | 'magenta' | 'green' | 'orange' | 'neutral'
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-neon-blue/30 bg-neon-blue/12 text-neon-blue'
      : tone === 'magenta'
      ? 'border-neon-magenta/30 bg-neon-magenta/12 text-neon-magenta'
      : tone === 'green'
      ? 'border-neon-green/30 bg-neon-green/12 text-neon-green'
      : tone === 'orange'
      ? 'border-neon-orange/30 bg-neon-orange/12 text-neon-orange'
      : 'border-white/10 bg-white/5 text-gray-300'

  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]', toneClass)}>
      {label}
    </Badge>
  )
}

function IntelDock({
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
        { label: 'Intencoes', value: analysis.unmappedIntents.length, tone: 'text-neon-blue' },
        { label: 'Estrutura', value: analysis.structuralOptimizations.length, tone: 'text-neon-green' },
      ]
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit rounded-full border-neon-blue/30 bg-neon-blue/12 px-3 py-1 text-neon-blue">
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
            className="bg-neon-blue/20 border border-neon-blue text-neon-blue hover:bg-neon-blue/30"
          >
            <Sparkles size={14} className="mr-2" aria-hidden="true" />
            Rodar analise
          </Button>
        </div>
      </div>

      {selectedNode && (
        <Card className="border-white/6 bg-[#11131a]">
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
              <div key={tile.label} className="rounded-[22px] border border-white/6 bg-[#11131a] p-4">
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
        <Card className="border-white/6 bg-[#11131a]">
          <CardContent className="flex min-h-[180px] items-center justify-center text-center text-sm text-gray-500">
            Rode a analise para preencher o dock com gargalos, copy otimizada e o JSON final.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function JsonDock({
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
    <Card className="border-white/6 bg-[#11131a]">
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
        <span className="h-2 w-2 rounded-full bg-neon-blue" />
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
      ? 'border-neon-blue/30 bg-neon-blue/12 text-neon-blue'
      : tone === 'magenta'
      ? 'border-neon-magenta/30 bg-neon-magenta/12 text-neon-magenta'
      : tone === 'green'
      ? 'border-neon-green/30 bg-neon-green/12 text-neon-green'
      : 'border-neon-orange/30 bg-neon-orange/12 text-neon-orange'

  return (
    <div className="rounded-[22px] border border-white/6 bg-[#11131a] p-4">
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
    <div className="rounded-[22px] border border-white/6 bg-[#11131a] px-4 py-5 text-sm text-gray-500">
      {text}
    </div>
  )
}

function buildCanvasState(flowJson: string): {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
} {
  const parsed = parseFlowInput(flowJson)
  const preview = parsed.data && parsed.errors.length === 0 ? buildFlowPreview(parsed.data) : buildFlowPreview(parseFlowInput(starterFlowJson).data!)

  return {
    nodes: preview.nodes as BuilderNode[],
    edges: preview.edges as BuilderEdge[],
  }
}

function exportCanvasFlow(nodes: BuilderNode[], edges: BuilderEdge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.code,
      label: node.data.title,
      content: node.data.text ?? node.data.description,
      options: node.data.options ?? [],
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  }
}

function createNodeFromBlock(
  block: BlockDef,
  nodes: BuilderNode[],
  dropPosition?: { x: number; y: number },
  selectedNodeId?: string | null,
): BuilderNode {
  const selectedNode = selectedNodeId
    ? nodes.find((node) => node.id === selectedNodeId) ?? null
    : null
  const siblingCount = selectedNode
    ? nodes.filter((node) => node.position.x > selectedNode.position.x && Math.abs(node.position.y - selectedNode.position.y) < 220).length
    : nodes.length

  const position =
    dropPosition ??
    (selectedNode
      ? {
          x: selectedNode.position.x + 360,
          y: selectedNode.position.y + siblingCount * 52,
        }
      : {
          x: 180 + (nodes.length % 3) * 320,
          y: 180 + Math.floor(nodes.length / 3) * 180,
        })

  return {
    id: `${block.code.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'flowNode',
    position,
    data: {
      code: block.code,
      category: block.category,
      title: block.title,
      description: normalizeDescription(block.description),
      text: normalizeDescription(block.description),
      options:
        block.code === 'BT'
          ? ['Quero continuar', 'Ver preco', 'Falar com suporte']
          : [],
    },
  }
}

function buildEdge(connection: Connection, nodes: BuilderNode[]): BuilderEdge {
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const sourceCategory = sourceNode?.data.category ?? 'comunicacao'
  const color = categoryMeta[sourceCategory].color

  return {
    id: connection.source && connection.target ? `${connection.source}_${connection.target}_${Date.now().toString(36)}` : `edge_${Date.now().toString(36)}`,
    source: connection.source ?? '',
    target: connection.target ?? '',
    type: 'smoothstep',
    animated: sourceNode?.data.code === 'GO' || sourceCategory === 'comunicacao',
    markerEnd: {
      type: 'arrowclosed',
      color,
    },
    style: {
      stroke: color,
      strokeWidth: 1.8,
      opacity: 0.92,
      strokeDasharray: sourceCategory === 'comunicacao' ? '4 6' : undefined,
    },
  }
}

function normalizeDescription(description: string) {
  return description.replace(/Ã§/g, 'ç').replace(/Ã£/g, 'ã').replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ãµ/g, 'õ')
}

function formatCategoryLabel(label: string) {
  return normalizeDescription(label).replace(/\s*&\s*/g, ' & ').toUpperCase()
}
