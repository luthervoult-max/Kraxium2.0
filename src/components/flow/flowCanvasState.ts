import type { Connection } from '@xyflow/react'
import { categoryMeta, type BlockDef } from '@/lib/blocks'
import { getBlockContent, getBlockOptions, getBlockOutputs, getDefaultConfig, mergeBlockConfig, type BlockConfig } from '@/lib/blockSpecs'
import { buildFlowPreview, parseFlowInput } from '@/lib/flowIntel'
import type { BuilderEdge, BuilderNode, SavedFlowMeta } from '@/components/flow/flowBuilderTypes'

export const START_NODE_ID = 'start_node'
export const START_NODE_COLOR = '#22c55e'
const START_NODE_LABEL = 'In\u00edcio'
const START_NODE_TEXT = 'Quando o usu\u00e1rio inicia'

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

export function buildCanvasState(flowJson: string): {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
} {
  const parsed = parseFlowInput(flowJson)
  const preview = parsed.data && parsed.errors.length === 0 ? buildFlowPreview(parsed.data) : buildFlowPreview(parseFlowInput(starterFlowJson).data!)
  const savedMeta = readSavedFlowMeta(flowJson)

  return ensureStartNodeInCanvas({
    nodes: (preview.nodes as BuilderNode[]).map((node) => {
      const savedNode = savedMeta.nodes.get(node.id)
      const config = mergeBlockConfig(node.data.code, savedNode?.config)

      return {
        ...node,
        data: {
          ...node.data,
          config,
          expanded: false,
          outputs: getBlockOutputs(node.data.code, config),
          text: getBlockContent(node.data.code, config, node.data.text || node.data.description),
          options: getBlockOptions(node.data.code, config),
        },
      }
    }),
    edges: (preview.edges as BuilderEdge[]).map((edge) => {
      const savedEdge = savedMeta.edges.get(edge.id) ?? savedMeta.edgeByEndpoints.get(`${edge.source}->${edge.target}`)

      return {
        ...edge,
        type: 'removable',
        sourceHandle: savedEdge?.sourceHandle,
        targetHandle: savedEdge?.targetHandle,
        label: savedEdge?.label,
      }
    }),
  })
}

function readSavedFlowMeta(flowJson: string): SavedFlowMeta {
  const meta: SavedFlowMeta = {
    nodes: new Map(),
    edges: new Map(),
    edgeByEndpoints: new Map(),
  }

  try {
    const parsed = JSON.parse(flowJson) as {
      nodes?: Array<{ id?: string; config?: BlockConfig }>
      edges?: Array<{ id?: string; source?: string; target?: string; sourceHandle?: string; targetHandle?: string; label?: string }>
    }

    parsed.nodes?.forEach((node) => {
      if (node.id) {
        meta.nodes.set(node.id, { config: node.config })
      }
    })

    parsed.edges?.forEach((edge) => {
      const edgeMeta = {
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
      }

      if (edge.id) {
        meta.edges.set(edge.id, edgeMeta)
      }

      if (edge.source && edge.target) {
        meta.edgeByEndpoints.set(`${edge.source}->${edge.target}`, edgeMeta)
      }
    })
  } catch {
    return meta
  }

  return meta
}

export function createInitialCanvasState(): {
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
    sourceHandle: 'next',
    label: edge.label ?? 'NEXT',
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
      outputs: [{ id: 'next', label: 'NEXT' }],
      isStartNode: true,
    },
  }
}

export function exportCanvasFlow(nodes: BuilderNode[], edges: BuilderEdge[]) {
  return {
    nodes: nodes.map((node) => {
      const config = mergeBlockConfig(node.data.code, node.data.config)

      return {
        id: node.id,
        type: node.data.code,
        label: node.data.title,
        content: getBlockContent(node.data.code, config, node.data.text ?? node.data.description),
        options: getBlockOptions(node.data.code, config),
        config,
        outputs: node.data.isStartNode ? [{ id: 'next', label: 'NEXT' }] : getBlockOutputs(node.data.code, config),
        position: node.position,
      }
    }),
    edges: edges.map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source)
      const sourceConfig = sourceNode ? mergeBlockConfig(sourceNode.data.code, sourceNode.data.config) : {}
      const output = sourceNode
        ? getBlockOutputs(sourceNode.data.code, sourceConfig).find((item) => item.id === edge.sourceHandle)
        : null

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        label: String(edge.label ?? output?.label ?? ''),
      }
    }),
  }
}

export function createNodeFromBlock(
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
  const config = getDefaultConfig(block.code)

  return {
    id: `${block.code.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'flowNode',
    position,
    data: {
      code: block.code,
      category: block.category,
      title: block.title,
      description: normalizeDescription(block.description),
      text: getBlockContent(block.code, config, normalizeDescription(block.description)),
      options: getBlockOptions(block.code, config),
      config,
      expanded: false,
      outputs: getBlockOutputs(block.code, config),
    },
  }
}

export function buildEdge(connection: Connection, nodes: BuilderNode[]): BuilderEdge {
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const sourceCategory = sourceNode?.data.category ?? 'comunicacao'
  const sourceConfig = sourceNode ? mergeBlockConfig(sourceNode.data.code, sourceNode.data.config) : {}
  const sourceOutputs = sourceNode?.id === START_NODE_ID ? [{ id: 'next', label: 'NEXT' }] : getBlockOutputs(sourceNode?.data.code ?? '', sourceConfig)
  const sourceHandle = connection.sourceHandle ?? sourceOutputs[0]?.id
  const output = sourceOutputs.find((item) => item.id === sourceHandle)
  const color = getOutputColor(output, sourceNode?.id === START_NODE_ID ? START_NODE_COLOR : categoryMeta[sourceCategory].color)

  return {
    id: connection.source && connection.target ? `${connection.source}_${connection.target}_${Date.now().toString(36)}` : `edge_${Date.now().toString(36)}`,
    source: connection.source ?? '',
    target: connection.target ?? '',
    sourceHandle,
    targetHandle: connection.targetHandle ?? undefined,
    type: 'removable',
    label: output?.label,
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

export function getEdgeColor(edge: BuilderEdge, nodes: BuilderNode[]) {
  const sourceNode = nodes.find((node) => node.id === edge.source)
  if (!sourceNode) return null

  const sourceCategory = sourceNode.data.category ?? 'comunicacao'
  const sourceConfig = mergeBlockConfig(sourceNode.data.code, sourceNode.data.config)
  const sourceOutputs =
    sourceNode.id === START_NODE_ID
      ? [{ id: 'next', label: 'NEXT' }]
      : getBlockOutputs(sourceNode.data.code, sourceConfig)
  const output = sourceOutputs.find((item) => item.id === edge.sourceHandle)
  const fallbackColor = sourceNode.id === START_NODE_ID ? START_NODE_COLOR : categoryMeta[sourceCategory].color

  return getOutputColor(output, fallbackColor)
}

function getOutputColor(
  output: { id: string; label: string } | undefined,
  fallbackColor: string,
) {
  const id = output?.id?.toLowerCase()
  const label = output?.label
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (id === 'paid' || label === 'pago') return '#22ff3d'
  if (id === 'unpaid' || label === 'nao pago') return '#ff3b5f'
  return fallbackColor
}

export function normalizeDescription(description: string) {
  return description.replace(/Ã§/g, 'ç').replace(/Ã£/g, 'ã').replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ãµ/g, 'õ')
}

export function formatCategoryLabel(label: string) {
  return normalizeDescription(label).replace(/\s*&\s*/g, ' & ').toUpperCase()
}
