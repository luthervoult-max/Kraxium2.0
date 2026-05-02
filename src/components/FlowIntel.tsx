import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react'
import { Loader2 } from 'lucide-react'
import { listBots, type Bot as TelegramBot } from '@/lib/api/bots'
import {
  getActiveFlowByBotId,
  getFlowById,
  saveFlowWithBot,
  type Flow,
  type ImportedFlowDraft,
} from '@/lib/api/flows'
import { listPaymentGatewayConnections } from '@/lib/api/paymentGateways'
import '@xyflow/react/dist/style.css'
import { BlockPalette } from '@/components/flow/BlockPalette'
import { FlowCanvasToolbar } from '@/components/flow/FlowCanvasToolbar'
import { BuilderPill } from '@/components/flow/FlowBuilderPill'
import {
  FlowHealthButton,
  NodeTracePanel,
  toTraceNodeRef,
  validateFlowStructure,
} from '@/components/flow/FlowHealthPanel'
import { FlowNode, type FlowNodeData } from '@/components/flow/FlowNode'
import { RemovableEdge } from '@/components/flow/RemovableEdge'
import { SaveFlowDialog } from '@/components/flow/SaveFlowDialog'
import {
  START_NODE_COLOR,
  START_NODE_ID,
  buildCanvasState,
  buildEdge,
  createInitialCanvasState,
  createNodeFromBlock,
  exportCanvasFlow,
  getEdgeColor,
} from '@/components/flow/flowCanvasState'
import type {
  BuilderEdge,
  BuilderNode,
  FlowHealthStatus,
  FlowSaveState,
  RuntimeNodeCacheEntry,
} from '@/components/flow/flowBuilderTypes'
import { TelegramSimulator } from '@/components/telegram/TelegramSimulator'
import {
  getNodeRuntimeHealth,
  getRecentNodeErrorLogs,
  type FlowNodeTrace,
  type NodeRuntimeHealth,
} from '@/lib/api/flowNodeTraces'
import { blocksByCategory, categoryMeta, type BlockDef } from '@/lib/blocks'
import { generateFlowIntelReport, parseLogsInput, type AnalysisResult } from '@/lib/flowIntel'
import {
  getBlockContent,
  getBlockOptions,
  getBlockOutputs,
  mergeBlockConfig,
  validateBlockConfig,
  type BlockConfig,
} from '@/lib/blockSpecs'
import { cn } from '@/lib/utils'

const nodeTypes = { flowNode: FlowNode }
const edgeTypes = { removable: RemovableEdge }

interface FlowIntelProps {
  botId: string | null
  flowId?: string | null
  importedDraft?: ImportedFlowDraft | null
  onDirtyChange?: (dirty: boolean) => void
  onRegisterSave?: (handler: (() => Promise<boolean>) | null) => void
  onDraftCreated?: () => void
  onSaved?: (flow: Flow) => void
}

interface SaveContext {
  botId: string | null
  flowId: string | null
  flow: Flow | null
  flowName: string
  nodes: BuilderNode[]
  edges: BuilderEdge[]
}

const initialCanvasState = createInitialCanvasState()

export default function FlowIntel({
  botId,
  flowId = null,
  importedDraft = null,
  onDirtyChange,
  onRegisterSave,
  onDraftCreated,
  onSaved,
}: FlowIntelProps) {
  const [flow, setFlow] = useState<Flow | null>(null)
  const [flowName, setFlowName] = useState('Novo fluxo')
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(initialCanvasState.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(initialCanvasState.edges)
  const [logsText, setLogsText] = useState('[]')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<FlowSaveState>('idle')
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogName, setSaveDialogName] = useState('Novo fluxo')
  const [saveDialogBotId, setSaveDialogBotId] = useState('')
  const [saveDialogBots, setSaveDialogBots] = useState<TelegramBot[]>([])
  const [saveDialogLoadingBots, setSaveDialogLoadingBots] = useState(false)
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null)
  const [hasPixGatewayConnected, setHasPixGatewayConnected] = useState(true)
  const saveDialogResolverRef = useRef<((saved: boolean) => void) | null>(null)
  const saveContextRef = useRef<SaveContext | null>(null)
  const runtimeNodeCacheRef = useRef<Map<string, RuntimeNodeCacheEntry>>(new Map())

  saveContextRef.current = { botId, flowId, flow, flowName, nodes, edges }

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

  const handleUpdateNodeConfig = useCallback((nodeId: string, patch: BlockConfig) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId || node.id === START_NODE_ID) return node

        const config = mergeBlockConfig(node.data.code, {
          ...(node.data.config ?? {}),
          ...patch,
        })

        return {
          ...node,
          data: {
            ...node.data,
            config,
            outputs: getBlockOutputs(node.data.code, config),
            text: getBlockContent(node.data.code, config, node.data.description),
            options: getBlockOptions(node.data.code, config),
          },
        }
      }),
    )
    markUnsaved()
  }, [markUnsaved, setNodes])

  useEffect(() => {
    let cancelled = false

    listPaymentGatewayConnections()
      .then((connections) => {
        if (cancelled) return
        setHasPixGatewayConnected(
          connections.some(
            (connection) =>
              connection.status === 'connected' &&
              ['mercado_pago', 'pushinpay', 'syncpay'].includes(connection.provider),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setHasPixGatewayConnected(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleNodeExpanded = useCallback((nodeId: string) => {
    if (nodeId === START_NODE_ID) return

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                expanded: !node.data.expanded,
              },
            }
          : node,
      ),
    )
  }, [setNodes])

  useEffect(() => {
    resetCanvasDraft()
    if (importedDraft) {
      const importedCanvas = buildCanvasState(JSON.stringify(importedDraft.graph))
      setFlow(null)
      setFlowName(importedDraft.name.trim() || 'Fluxo importado')
      setNodes(importedCanvas.nodes)
      setEdges(importedCanvas.edges)
      setSelectedNodeId(null)
      setIsTracePanelOpen(false)
      setLoadError('Fluxo importado como rascunho. Revise o canvas e clique em Salvar para escolher o bot executor.')
      setHasUnsavedChanges(true)
      setSaveState('idle')
      setLoadingFlow(false)
      return
    }

    if (!flowId && !botId) {
      setFlow(null)
      setLoadError('Canvas iniciado com o bloco Start. Monte o fluxo e clique em Salvar fluxo para escolher o bot executor.')
      setLoadingFlow(false)
      return
    }

    let cancelled = false
    setLoadingFlow(true)
    setLoadError(null)
    const request = flowId ? getFlowById(flowId) : getActiveFlowByBotId(botId!)

    request
      .then((data) => {
        if (cancelled) return
        setFlow(data)
        if (!data) {
          setFlowName('Novo fluxo')
          setLoadError('Canvas iniciado com o bloco Start. Monte um fluxo e clique em Salvar fluxo para escolher o bot executor.')
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
  }, [botId, flowId, importedDraft, resetCanvasDraft, setEdges, setNodes])

  const logsParse = useMemo(() => parseLogsInput(logsText), [logsText])
  const runtimeFlowId = flow?.id ?? flowId ?? botId ?? `draft:${flowName.trim() || 'novo-fluxo'}`
  const runtimeBotId = flow?.bot_id ?? botId
  const traceNodeSignature = useMemo(
    () =>
      nodes
        .map((node) => `${node.id}:${node.data.code}:${node.data.title}:${node.data.category}`)
        .join('|'),
    [nodes],
  )
  const traceNodeRefs = useMemo(() => nodes.map(toTraceNodeRef), [traceNodeSignature])
  const availableTargetNodes = useMemo(
    () =>
      nodes
        .filter((node) => node.id !== START_NODE_ID)
        .map((node) => ({
          id: node.id,
          label: `${node.data.code} · ${node.data.title}`,
        })),
    [nodes],
  )
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
        const config = mergeBlockConfig(node.data.code, node.data.config)
        const outputs = node.data.isStartNode ? [{ id: 'next', label: 'NEXT' }] : getBlockOutputs(node.data.code, config)
        const validationIssues = node.data.isStartNode ? [] : validateBlockConfig(node.data.code, config)
        if (!node.data.isStartNode && ['PX', 'PG'].includes(node.data.code) && !hasPixGatewayConnected) {
          validationIssues.push('Nenhum gateway PIX conectado para gerar cobranca real.')
        }
        const healthKey = [
          runtimeStatus,
          errorCount,
          lastErrorAt ?? '',
          lastTraceId ?? '',
          node.data.expanded ? 'open' : 'closed',
          hasPixGatewayConnected ? 'pix-on' : 'pix-off',
          JSON.stringify(config),
          availableTargetNodes.map((target) => target.id).join(','),
        ].join(':')
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
            config,
            outputs,
            validationIssues,
            availableTargetNodes: availableTargetNodes.filter((target) => target.id !== node.id),
            onConfigChange: handleUpdateNodeConfig,
            onDeleteNode: node.id === START_NODE_ID ? undefined : handleDeleteNode,
            onToggleExpanded: handleToggleNodeExpanded,
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
    [
      availableTargetNodes,
      handleDeleteNode,
      handleToggleNodeExpanded,
      handleUpdateNodeConfig,
      hasPixGatewayConnected,
      nodeHealth,
      nodes,
    ],
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
      edges.map((edge) => {
        const color = getEdgeColor(edge, nodes) ?? String(edge.style?.stroke ?? '#8b5cf6')

        return {
          ...edge,
          type: 'removable',
          markerEnd: edge.markerEnd && typeof edge.markerEnd === 'object'
            ? {
                ...edge.markerEnd,
                color,
              }
            : edge.markerEnd,
          style: {
            ...edge.style,
            stroke: color,
          },
          data: {
            ...edge.data,
            onDeleteEdge: handleDeleteEdge,
          },
        }
      }),
    [edges, handleDeleteEdge, nodes],
  )

  useEffect(() => {
    let cancelled = false

    if (traceNodeRefs.length === 0) {
      setNodeHealth({})
      return
    }

    getNodeRuntimeHealth({
      flowId: runtimeFlowId,
      botId: runtimeBotId,
      nodes: traceNodeRefs,
    }).then((health) => {
      if (!cancelled) {
        setNodeHealth(health)
      }
    })

    return () => {
      cancelled = true
    }
  }, [runtimeBotId, runtimeFlowId, traceNodeRefs])

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

  const resolveSaveDialog = useCallback((saved: boolean) => {
    saveDialogResolverRef.current?.(saved)
    saveDialogResolverRef.current = null
  }, [])

  const loadSaveDialogBots = useCallback(async (preferredBotId: string) => {
    setSaveDialogLoadingBots(true)
    setSaveDialogError(null)
    try {
      const bots = await listBots()
      setSaveDialogBots(bots)
      if (bots.length === 0) {
        setSaveDialogBotId('')
        setSaveDialogError('Crie um bot na aba Bots antes de salvar este fluxo.')
        return
      }
      if (!preferredBotId || !bots.some((bot) => bot.id === preferredBotId)) {
        setSaveDialogBotId(bots[0].id)
      }
    } catch (err) {
      setSaveDialogBots([])
      setSaveDialogError(err instanceof Error ? err.message : 'Falha ao carregar bots.')
    } finally {
      setSaveDialogLoadingBots(false)
    }
  }, [])

  const requestSaveWithDialog = useCallback(async () => {
    const context = saveContextRef.current
    if (!context) return false

    saveDialogResolverRef.current?.(false)
    const preferredBotId = context.flow?.bot_id ?? context.botId ?? ''

    setSaveDialogName(context.flowName.trim() || 'Novo fluxo')
    setSaveDialogBotId(preferredBotId)
    setSaveDialogError(null)
    setSaveDialogOpen(true)
    void loadSaveDialogBots(preferredBotId)

    return new Promise<boolean>((resolve) => {
      saveDialogResolverRef.current = resolve
    })
  }, [loadSaveDialogBots])

  async function handleConfirmSaveDialog() {
    const context = saveContextRef.current
    if (!context) return

    const botIdToSave = saveDialogBotId.trim()
    if (!botIdToSave) {
      setSaveDialogError('Escolha qual bot vai executar este fluxo.')
      return
    }

    setSaveState('saving')
    setSaveDialogError(null)
    try {
      const graph = exportCanvasFlow(context.nodes, context.edges)
      const savedFlow = await saveFlowWithBot({
        flowId: context.flow?.id ?? null,
        name: saveDialogName.trim() || context.flowName.trim() || 'Sem nome',
        graph,
        botId: botIdToSave,
      })
      setFlow(savedFlow)
      setFlowName(savedFlow.name)
      setSaveState('saved')
      setHasUnsavedChanges(false)
      setLoadError(null)
      setSaveDialogOpen(false)
      onSaved?.(savedFlow)
      resolveSaveDialog(true)
      window.setTimeout(() => setSaveState('idle'), 1800)
    } catch (err) {
      setSaveDialogError(err instanceof Error ? err.message : 'Falha ao salvar fluxo.')
      setSaveState('idle')
    }
  }

  function handleCancelSaveDialog() {
    if (saveState === 'saving') return
    setSaveDialogOpen(false)
    setSaveDialogError(null)
    resolveSaveDialog(false)
  }

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
    return () => onDirtyChange?.(false)
  }, [hasUnsavedChanges, onDirtyChange])

  useEffect(() => {
    onRegisterSave?.(requestSaveWithDialog)
    return () => onRegisterSave?.(null)
  }, [onRegisterSave, requestSaveWithDialog])

  function handleNewFlow() {
    setFlow(null)
    setLoadError(null)
    resetCanvasDraft('Novo fluxo')
    onDraftCreated?.()
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
      botId: runtimeBotId,
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
  }, [runtimeBotId, runtimeFlowId, selectedTraceNode])

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
      {loadError && (
        <div className="mb-5 rounded-[18px] border border-neon-purple/20 bg-neon-purple/8 px-5 py-4 text-sm leading-6 text-gray-300">
          {loadError ?? 'Modo demo ativo. Selecione um bot na aba Bots quando quiser salvar em um fluxo real.'}
        </div>
      )}

      <div
        className={cn(
          'grid gap-5',
          isBlockPaletteCollapsed
            ? 'xl:grid-cols-[72px_minmax(0,1fr)]'
            : 'xl:grid-cols-[260px_minmax(0,1fr)]',
        )}
      >
        <BlockPalette
          groups={paletteGroups}
          isCollapsed={isBlockPaletteCollapsed}
          panelHeightClass={builderPanelHeightClass}
          onToggleCollapsed={() => setIsBlockPaletteCollapsed((value) => !value)}
          onAddBlock={addBlockToCanvas}
        />

        <div className="min-w-0">
          <section
            className={cn(
              'flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0c0d10] shadow-[0_18px_55px_rgba(0,0,0,0.36)]',
              builderPanelHeightClass,
            )}
          >
            <FlowCanvasToolbar
              flowName={flowName}
              saveState={saveState}
              isFocusMode={isFocusMode}
              showSimulator={showSimulator}
              onFlowNameChange={(value) => {
                setFlowName(value)
                markUnsaved()
              }}
              onAnalyze={handleAnalyze}
              onToggleFocusMode={handleToggleFocusMode}
              onRequestSave={() => void requestSaveWithDialog()}
              onNewFlow={handleNewFlow}
              onToggleSimulator={() => setShowSimulator((value) => !value)}
            />

            <div
              className={cn(
                'grid min-h-0 flex-1 bg-[#08090b]',
                showSimulator ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]' : 'grid-cols-1',
              )}
            >
            <div
              className="relative h-full min-h-[520px] bg-[#08090b]"
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
                onNodeClick={(_, node) => {
                  setSelectedNodeId(node.id)
                  handleToggleNodeExpanded(node.id)
                }}
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
                  color="rgba(255,255,255,0.075)"
                  gap={22}
                  size={1}
                />
                <Controls
                  showInteractive={false}
                  className="[&>button]:!h-9 [&>button]:!w-9 [&>button]:!border-white/10 [&>button]:!bg-[#0c0d10] [&>button]:!text-white [&_.react-flow__controls-button]:!h-9 [&_.react-flow__controls-button]:!w-9 [&_.react-flow__controls-button]:!border-white/10 [&_.react-flow__controls-button]:!bg-[#0c0d10] [&_.react-flow__controls-button]:!text-white [&_.react-flow__controls-button>svg]:!fill-white [&_.react-flow__controls-button>svg]:!stroke-white"
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
                    background: '#0c0d10',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 18,
                  }}
                />
              </ReactFlow>
            </div>
              {showSimulator && (
                <div className="overflow-y-auto border-l border-white/10 bg-[#08090b] p-4">
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
      {saveDialogOpen && (
        <SaveFlowDialog
          name={saveDialogName}
          botId={saveDialogBotId}
          bots={saveDialogBots}
          loadingBots={saveDialogLoadingBots}
          saving={saveState === 'saving'}
          error={saveDialogError}
          onNameChange={setSaveDialogName}
          onBotChange={setSaveDialogBotId}
          onCancel={handleCancelSaveDialog}
          onConfirm={() => void handleConfirmSaveDialog()}
        />
      )}
    </main>
  )
}
