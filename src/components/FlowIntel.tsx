import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  Bot,
  BotOff,
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
  X,
} from 'lucide-react'
import { getFlowByBotId, saveFlow, upsertFlowByBotId, type Flow } from '@/lib/api/flows'
import '@xyflow/react/dist/style.css'
import { FlowNode, type FlowNodeData } from '@/components/flow/FlowNode'
import { TelegramSimulator } from '@/components/telegram/TelegramSimulator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  getNodeRuntimeHealth,
  getRecentNodeErrorLogs,
  type FlowNodeTrace,
  type FlowTraceNodeRef,
  type NodeRuntimeHealth,
} from '@/lib/api/flowNodeTraces'
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
type BuilderEdge = Edge<RemovableEdgeData>

interface RemovableEdgeData extends Record<string, unknown> {
  onDeleteEdge?: (edgeId: string) => void
}

const nodeTypes = { flowNode: FlowNode }
const edgeTypes = { removable: RemovableEdge }
const START_NODE_ID = 'start_node'
const START_NODE_COLOR = '#22c55e'
const START_NODE_LABEL = 'Início'
const START_NODE_TEXT = 'Quando o usuário inicia'

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
  onDirtyChange?: (dirty: boolean) => void
  onRegisterSave?: (handler: (() => Promise<boolean>) | null) => void
}

interface SaveContext {
  botId: string | null
  flow: Flow | null
  flowName: string
  nodes: BuilderNode[]
  edges: BuilderEdge[]
}

interface RuntimeNodeCacheEntry {
  source: BuilderNode
  healthKey: string
  enhanced: BuilderNode
}

interface FlowHealthIssue {
  id: string
  title: string
  detail: string
  severity: 'warning' | 'error'
}

type FlowHealthStatus = 'ok' | 'warning' | 'error'

const terminalNodeTypes = new Set(['CV', 'EP', 'AG'])

const initialCanvasState = createInitialCanvasState()

export default function FlowIntel({ botId, onDirtyChange, onRegisterSave }: FlowIntelProps) {
  const [flow, setFlow] = useState<Flow | null>(null)
  const [flowName, setFlowName] = useState('Novo fluxo')
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(initialCanvasState.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(initialCanvasState.edges)
  const [logsText, setLogsText] = useState('[]')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'saving'>('idle')
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<BuilderNode, BuilderEdge> | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)
  const [isBlockPaletteCollapsed, setIsBlockPaletteCollapsed] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [nodeHealth, setNodeHealth] = useState<Record<string, NodeRuntimeHealth>>({})
  const [selectedNodeErrors, setSelectedNodeErrors] = useState<FlowNodeTrace[]>([])
  const [loadingNodeErrors, setLoadingNodeErrors] = useState(false)
  const [loadingFlow, setLoadingFlow] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isTracePanelOpen, setIsTracePanelOpen] = useState(false)
  const saveContextRef = useRef<SaveContext | null>(null)
  const runtimeNodeCacheRef = useRef<Map<string, RuntimeNodeCacheEntry>>(new Map())

  saveContextRef.current = { botId, flow, flowName, nodes, edges }

  const resetCanvasDraft = useCallback((nextFlowName = 'Novo fluxo') => {
    const nextCanvas = createInitialCanvasState()
    setNodes(nextCanvas.nodes)
    setEdges(nextCanvas.edges)
    setFlowName(nextFlowName)
    setLogsText('[]')
    setAnalysis(null)
    setSelectedNodeId(null)
    setIsTracePanelOpen(false)
    setHasUnsavedChanges(false)
    setSaveState('idle')
  }, [setNodes, setEdges])

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId))
    markUnsaved()
  }, [markUnsaved, setEdges])

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === START_NODE_ID) return

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId))
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    )
    setSelectedNodeId((currentNodeId) => (currentNodeId === nodeId ? null : currentNodeId))
    setNodeHealth((currentHealth) => {
      if (!currentHealth[nodeId]) return currentHealth
      const nextHealth = { ...currentHealth }
      delete nextHealth[nodeId]
      return nextHealth
    })
    markUnsaved()
  }, [markUnsaved, setEdges, setNodes])

  useEffect(() => {
    resetCanvasDraft()
    if (!botId) {
      setFlow(null)
      setLoadError('Canvas iniciado com o bloco Start. Selecione um bot na aba Bots quando quiser salvar o fluxo.')
      setLoadingFlow(false)
      return
    }

    let cancelled = false
    setLoadingFlow(true)
    setLoadError(null)
    getFlowByBotId(botId)
      .then((data) => {
        if (cancelled) return
        setFlow(data)
        if (!data) {
          setFlowName('Novo fluxo')
          setLoadError('Canvas iniciado com o bloco Start. Monte um fluxo e clique em Salvar fluxo para gravar neste bot.')
          return
        }
        setFlowName(data.name)
        if (data.graph) {
          const savedCanvas = buildCanvasState(JSON.stringify(data.graph))
          setNodes(savedCanvas.nodes)
          setEdges(savedCanvas.edges)
        }
        setLoadError(null)
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
  }, [botId, resetCanvasDraft])

  const logsParse = useMemo(() => parseLogsInput(logsText), [logsText])
  const runtimeFlowId = flow?.id ?? botId ?? `draft:${flowName.trim() || 'novo-fluxo'}`
  const traceNodeSignature = useMemo(
    () =>
      nodes
        .map((node) => `${node.id}:${node.data.code}:${node.data.title}:${node.data.category}`)
        .join('|'),
    [nodes],
  )
  const traceNodeRefs = useMemo(() => nodes.map(toTraceNodeRef), [traceNodeSignature])
  const nodesWithRuntime = useMemo(
    () => {
      const cache = runtimeNodeCacheRef.current
      const liveNodeIds = new Set<string>()

      const enhancedNodes = nodes.map((node) => {
        const health = nodeHealth[node.id]
        const runtimeStatus = health?.status ?? 'ok'
        const errorCount = health?.errorCount ?? 0
        const lastErrorAt = health?.lastErrorAt ?? null
        const lastTraceId = health?.lastTraceId ?? null
        const healthKey = `${runtimeStatus}:${errorCount}:${lastErrorAt ?? ''}:${lastTraceId ?? ''}`
        const cached = cache.get(node.id)

        liveNodeIds.add(node.id)

        if (cached?.source === node && cached.healthKey === healthKey) {
          return cached.enhanced
        }

        const enhanced = {
          ...node,
          data: {
            ...node.data,
            runtimeStatus,
            errorCount,
            lastErrorAt,
            lastTraceId,
            onDeleteNode: node.id === START_NODE_ID ? undefined : handleDeleteNode,
          },
        }
        cache.set(node.id, { source: node, healthKey, enhanced })
        return enhanced
      })

      for (const nodeId of cache.keys()) {
        if (!liveNodeIds.has(nodeId)) {
          cache.delete(nodeId)
        }
      }

      return enhancedNodes
    },
    [handleDeleteNode, nodeHealth, nodes],
  )
  const totalErrorCount = useMemo(
    () => Object.values(nodeHealth).reduce((total, health) => total + health.errorCount, 0),
    [nodeHealth],
  )
  const errorNodeCount = useMemo(
    () => Object.values(nodeHealth).filter((health) => health.status === 'error').length,
    [nodeHealth],
  )
  const flowHealthIssues = useMemo(() => validateFlowStructure(nodes, edges), [nodes, edges])
  const flowProblemCount = flowHealthIssues.length + totalErrorCount
  const isFlowHealthy = flowProblemCount === 0
  const flowHealthStatus: FlowHealthStatus = isFlowHealthy
    ? 'ok'
    : totalErrorCount > 0 || flowHealthIssues.some((issue) => issue.severity === 'error')
      ? 'error'
      : 'warning'
  const paletteGroups = useMemo(
    () =>
      blocksByCategory
        .map((group) => ({
          ...group,
          blocks: group.blocks.filter((block) => block.code !== 'TR'),
        }))
        .filter((group) => group.blocks.length > 0),
    [],
  )
  const edgesWithActions = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: 'removable',
        data: {
          ...edge.data,
          onDeleteEdge: handleDeleteEdge,
        },
      })),
    [edges, handleDeleteEdge],
  )

  useEffect(() => {
    let cancelled = false

    if (traceNodeRefs.length === 0) {
      setNodeHealth({})
      return
    }

    getNodeRuntimeHealth({
      flowId: runtimeFlowId,
      botId,
      nodes: traceNodeRefs,
    }).then((health) => {
      if (!cancelled) {
        setNodeHealth(health)
      }
    })

    return () => {
      cancelled = true
    }
  }, [botId, runtimeFlowId, traceNodeRefs])

  useEffect(() => {
    const selectedStillExists = nodes.some((node) => node.id === selectedNodeId)
    if (!selectedStillExists) {
      setSelectedNodeId(null)
    }
  }, [nodes, selectedNodeId])

  const handleNodesChange = (changes: Parameters<typeof onNodesChange>[0]) => {
    const allowedChanges = changes.filter(
      (change) => !(change.type === 'remove' && change.id === START_NODE_ID),
    )

    if (allowedChanges.length === 0) {
      return
    }

    onNodesChange(allowedChanges)
    if (allowedChanges.some((change) => change.type !== 'select')) {
      markUnsaved()
    }
  }

  const handleEdgesChange = (changes: Parameters<typeof onEdgesChange>[0]) => {
    onEdgesChange(changes)
    if (changes.some((change) => change.type !== 'select')) {
      markUnsaved()
    }
  }

  const onConnect: OnConnect = (connection) => {
    if (connection.target === START_NODE_ID) return

    markUnsaved()
    setEdges((currentEdges) => addEdge(buildEdge(connection, nodes), currentEdges))
  }

  function handleAnalyze() {
    if (!logsParse.data || logsParse.errors.length > 0) {
      return
    }

    const flowJson = JSON.stringify(exportCanvasFlow(nodes, edges), null, 2)
    const report = generateFlowIntelReport(flowJson, logsText).report
    setAnalysis(report?.result ?? null)
  }

  const handleSave = useCallback(async () => {
    const context = saveContextRef.current

    if (!context?.botId) {
      setLoadError('Selecione um bot na aba Bots antes de salvar o fluxo.')
      return false
    }

    setSaveState('saving')
    try {
      const graph = exportCanvasFlow(context.nodes, context.edges)
      const savedFlow = context.flow
        ? await saveFlow(context.flow.id, context.flowName.trim() || 'Sem nome', graph)
        : await upsertFlowByBotId(context.botId, context.flowName.trim() || 'Sem nome', graph)
      setFlow(savedFlow)
      setSaveState('saved')
      setHasUnsavedChanges(false)
      setLoadError(null)
      window.setTimeout(() => setSaveState('idle'), 1800)
      return true
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Falha ao salvar fluxo.')
      setSaveState('idle')
      return false
    }
  }, [])

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
    return () => onDirtyChange?.(false)
  }, [hasUnsavedChanges, onDirtyChange])

  useEffect(() => {
    onRegisterSave?.(botId ? handleSave : null)
    return () => onRegisterSave?.(null)
  }, [botId, handleSave, onRegisterSave])

  function handleNewFlow() {
    resetCanvasDraft(flowName.trim() || 'Novo fluxo')
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

    setSelectedNodeId(nextNode.id)
    markUnsaved()
  }

  const selectedNode = selectedNodeId
    ? nodesWithRuntime.find((node) => node.id === selectedNodeId) ?? null
    : null
  const selectedNodeHealth = selectedNode ? nodeHealth[selectedNode.id] : null
  const selectedTraceNode = useMemo(
    () => (selectedNode ? toTraceNodeRef(selectedNode) : null),
    [
      selectedNode?.id,
      selectedNode?.data.code,
      selectedNode?.data.title,
      selectedNode?.data.category,
    ],
  )
  const isFocusMode = isBlockPaletteCollapsed
  const builderPanelHeightClass = 'h-[calc(100vh-260px)] min-h-[620px] xl:h-[calc(100vh-220px)]'

  useEffect(() => {
    let cancelled = false

    if (!selectedTraceNode) {
      setSelectedNodeErrors([])
      setLoadingNodeErrors(false)
      return
    }

    setLoadingNodeErrors(true)
    getRecentNodeErrorLogs({
      flowId: runtimeFlowId,
      botId,
      node: selectedTraceNode,
      limit: 3,
    })
      .then((logs) => {
        if (!cancelled) {
          setSelectedNodeErrors(logs)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingNodeErrors(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [botId, runtimeFlowId, selectedTraceNode])

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
        <div className="mb-5 rounded-[18px] border border-neon-purple/20 bg-neon-purple/8 px-5 py-4 text-sm leading-6 text-gray-300">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-neon-purple/25 bg-neon-purple/12 text-neon-purple">
                  <GitBranch size={17} aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-neon-purple xl:[writing-mode:vertical-rl] xl:rotate-180">
                  Blocos
                </span>
              </div>
            ) : (
              <h2 className="text-lg font-bold uppercase tracking-wider text-neon-purple">
                Blocos disponiveis
              </h2>
            )}

            <button
              type="button"
              onClick={() => setIsBlockPaletteCollapsed((value) => !value)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-neon-purple/30 hover:text-neon-purple"
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
              {paletteGroups.map((group) => (
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
                  onChange={(event) => {
                    setFlowName(event.target.value)
                    markUnsaved()
                  }}
                  className="h-14 w-full rounded-full border border-white/10 bg-[#11131a] px-6 text-lg text-white outline-none transition-colors focus:border-neon-purple/50"
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
                      ? 'border-neon-purple/45 bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/20'
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
                  disabled={!botId || saveState === 'saving'}
                  title={!botId ? 'Selecione um bot para salvar no Supabase.' : undefined}
                  className="h-14 rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-6 text-[12px] font-bold uppercase tracking-[0.26em] text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-60"
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
                      ? 'border-neon-purple/45 bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/20'
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
                  label={totalErrorCount > 0 ? `${totalErrorCount} erros` : '0 erros'}
                  tone={totalErrorCount > 0 ? 'red' : 'green'}
                />
                {errorNodeCount > 0 && (
                  <BuilderPill label={`${errorNodeCount} nos com falha`} tone="red" />
                )}
                {selectedNode && (
                <BuilderPill label={`selecionado: ${selectedNode.data.code}`} tone="neutral" />
                )}
              </div>

              <FlowHealthButton
                status={flowHealthStatus}
                problemCount={flowProblemCount}
                isOpen={isTracePanelOpen}
                onClick={() => setIsTracePanelOpen((value) => !value)}
              />

              {isTracePanelOpen && (
                <NodeTracePanel
                  node={selectedNode}
                  health={selectedNodeHealth}
                  logs={selectedNodeErrors}
                  loading={loadingNodeErrors}
                  issues={flowHealthIssues}
                  totalErrorCount={totalErrorCount}
                  flowStatus={flowHealthStatus}
                  onClose={() => setIsTracePanelOpen(false)}
                />
              )}

              <ReactFlow<BuilderNode, BuilderEdge>
                nodes={nodesWithRuntime}
                edges={edgesWithActions}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={setReactFlowInstance}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.05}
                maxZoom={1.8}
                nodesDraggable
                nodesConnectable
                elementsSelectable
                onlyRenderVisibleElements
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
                  nodeColor={(node) => {
                    const data = node.data as FlowNodeData
                    if (data.runtimeStatus === 'error') return '#ff3b5f'
                    return data.isStartNode ? START_NODE_COLOR : categoryMeta[data.category].color
                  }}
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
  tone: 'blue' | 'magenta' | 'green' | 'orange' | 'red' | 'neutral'
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-neon-purple/30 bg-neon-purple/12 text-neon-purple'
      : tone === 'magenta'
      ? 'border-neon-magenta/30 bg-neon-magenta/12 text-neon-magenta'
      : tone === 'red'
      ? 'border-[#ff3b5f]/35 bg-[#ff3b5f]/15 text-[#ff6b84]'
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

function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<BuilderEdge>) {
  const [isHovered, setIsHovered] = useState(false)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const edgeColor = typeof style?.stroke === 'string' ? style.stroke : '#b44dff'

  return (
    <>
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={style}
          interactionWidth={28}
        />
      </g>
      {data?.onDeleteEdge && (
        <EdgeLabelRenderer>
          <button
            type="button"
            aria-label="Excluir conexao"
            title="Excluir conexao"
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              data.onDeleteEdge?.(id)
            }}
            className={cn(
              'nodrag nopan absolute z-30 flex h-7 w-7 items-center justify-center rounded-full border bg-[#11141d]/95 text-white shadow-[0_12px_35px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-150 focus:pointer-events-auto focus:scale-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/60',
              isHovered ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
            )}
            style={{
              borderColor: edgeColor,
              boxShadow: `0 0 18px ${edgeColor}55`,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function FlowHealthButton({
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
        : 'border-[#ff3b5f]/45 text-[#ff6b84] shadow-[0_0_28px_rgba(255,59,95,0.2)]'

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
              : 'border-[#ff3b5f]/50 bg-[#ff3b5f]',
          )}
        >
          {problemCount > 9 ? '9+' : problemCount}
        </span>
      )}
    </button>
  )
}

function NodeTracePanel({
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
        : 'border-[#ff3b5f]/35 bg-[#ff3b5f]/15 text-[#ff6b84]'

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
                ? 'border-[#ff3b5f]/35 bg-[#ff3b5f]/15 text-[#ff6b84]'
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
            <div key={log._id} className="rounded-[16px] border border-[#ff3b5f]/20 bg-[#ff3b5f]/8 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#ff3b5f]/30 bg-[#ff3b5f]/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#ff6b84]">
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
          issue.severity === 'error' ? 'bg-[#ff3b5f]' : 'bg-neon-orange',
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

function validateFlowStructure(nodes: BuilderNode[], edges: BuilderEdge[]): FlowHealthIssue[] {
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

    if (!title || !content) {
      issues.push({
        id: `missing-content-${node.id}`,
        title: 'Informacao incompleta',
        detail: `O no ${node.data.code} precisa de titulo e conteudo para rodar corretamente.`,
        severity: 'warning',
      })
    }

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

function toTraceNodeRef(node: BuilderNode): FlowTraceNodeRef {
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

  return ensureStartNodeInCanvas({
    nodes: preview.nodes as BuilderNode[],
    edges: preview.edges as BuilderEdge[],
  })
}

function createInitialCanvasState(): {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
} {
  return {
    nodes: [createStartNode()],
    edges: [],
  }
}

function ensureStartNodeInCanvas(canvas: {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
}): {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
} {
  const existingStartNode = canvas.nodes.find((node) => node.id === START_NODE_ID)

  if (existingStartNode) {
    return {
      nodes: canvas.nodes.map((node) => (node.id === START_NODE_ID ? normalizeStartNode(node) : node)),
      edges: canvas.edges.filter((edge) => edge.target !== START_NODE_ID).map(normalizeStartEdge),
    }
  }

  const triggerNode = canvas.nodes.find((node) => node.data.code === 'TR')

  if (triggerNode) {
    return {
      nodes: canvas.nodes.map((node) => (node.id === triggerNode.id ? createStartNode(node.position) : node)),
      edges: canvas.edges
        .filter((edge) => edge.target !== triggerNode.id)
        .map((edge) => ({
          ...edge,
          source: edge.source === triggerNode.id ? START_NODE_ID : edge.source,
        }))
        .map(normalizeStartEdge),
    }
  }

  return {
    nodes: [createStartNode(), ...canvas.nodes],
    edges: canvas.edges,
  }
}

function normalizeStartNode(node: BuilderNode): BuilderNode {
  const startNode = createStartNode(node.position)

  return {
    ...node,
    id: START_NODE_ID,
    type: 'flowNode',
    data: {
      ...node.data,
      ...startNode.data,
    },
  }
}

function normalizeStartEdge(edge: BuilderEdge): BuilderEdge {
  if (edge.source !== START_NODE_ID) return edge

  return {
    ...edge,
    type: 'removable',
    markerEnd: {
      type: 'arrowclosed',
      color: START_NODE_COLOR,
    },
    style: {
      ...edge.style,
      stroke: START_NODE_COLOR,
      strokeWidth: edge.style?.strokeWidth ?? 1.8,
      opacity: edge.style?.opacity ?? 0.92,
      strokeDasharray: undefined,
    },
  }
}

function createStartNode(position: { x: number; y: number } = { x: 180, y: 220 }): BuilderNode {
  return {
    id: START_NODE_ID,
    type: 'flowNode',
    position,
    data: {
      code: 'TR',
      category: 'sistema',
      title: START_NODE_LABEL,
      description: START_NODE_TEXT,
      text: START_NODE_TEXT,
      options: [],
      isStartNode: true,
    },
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
  const color = sourceNode?.id === START_NODE_ID ? START_NODE_COLOR : categoryMeta[sourceCategory].color

  return {
    id: connection.source && connection.target ? `${connection.source}_${connection.target}_${Date.now().toString(36)}` : `edge_${Date.now().toString(36)}`,
    source: connection.source ?? '',
    target: connection.target ?? '',
    type: 'removable',
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
