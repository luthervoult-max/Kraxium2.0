import type { Edge, Node } from '@xyflow/react'
import type { BlockConfig } from '@/lib/blockSpecs'
import type { FlowNodeData } from '@/components/flow/FlowNode'

export type BuilderNode = Node<FlowNodeData, 'flowNode'>
export type BuilderEdge = Edge<RemovableEdgeData>

export interface RemovableEdgeData extends Record<string, unknown> {
  onDeleteEdge?: (edgeId: string) => void
}

export interface SavedFlowMeta {
  nodes: Map<string, { config?: BlockConfig }>
  edges: Map<string, { sourceHandle?: string; targetHandle?: string; label?: string }>
  edgeByEndpoints: Map<string, { sourceHandle?: string; targetHandle?: string; label?: string }>
}

export interface RuntimeNodeCacheEntry {
  source: BuilderNode
  healthKey: string
  enhanced: BuilderNode
}

export interface FlowHealthIssue {
  id: string
  title: string
  detail: string
  severity: 'warning' | 'error'
}

export type FlowHealthStatus = 'ok' | 'warning' | 'error'
export type FlowSaveState = 'idle' | 'saved' | 'saving'
