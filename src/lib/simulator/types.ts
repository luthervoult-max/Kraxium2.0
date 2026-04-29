import type { Edge, Node } from '@xyflow/react'
import type { FlowNodeData } from '@/components/flow/FlowNode'

export type SimNode = Node<FlowNodeData, 'flowNode'>
export type SimEdge = Edge

export type ChatMessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'video-note'
  | 'location'
  | 'buttons'
  | 'user-input'
  | 'system'
  | 'typing'

export interface ChatMessage {
  id: string
  nodeId: string | null
  nodeCode: string | null
  category: FlowNodeData['category'] | null
  kind: ChatMessageKind
  author: 'bot' | 'user' | 'system'
  text?: string
  options?: string[]
  selectedOption?: string
  mediaUrl?: string
  createdAt: number
}

export type TraceStatus = 'success' | 'error' | 'skipped'

export interface NodeTrace {
  id: string
  flowId: string
  runId: string
  nodeId: string
  nodeCode: string
  status: TraceStatus
  errorMessage?: string
  payload?: unknown
  durationMs: number
  createdAt: number
}

export type SimulatorStatus =
  | 'idle'
  | 'running'
  | 'awaiting-input'
  | 'awaiting-button'
  | 'finished'
  | 'error'

export type SimulatorSpeed = 1 | 2 | 4 | 'instant'
