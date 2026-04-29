import { create } from 'zustand'
import type {
  ChatMessage,
  NodeTrace,
  SimulatorSpeed,
  SimulatorStatus,
} from './types'

interface SimulatorState {
  flowId: string
  runId: string | null
  status: SimulatorStatus
  currentNodeId: string | null
  visitedNodes: string[]
  messages: ChatMessage[]
  variables: Record<string, unknown>
  traces: NodeTrace[]
  speed: SimulatorSpeed
  errorMessage: string | null
  pendingButtonNodeId: string | null
  pendingInputNodeId: string | null
  inputBuffer: string
}

interface SimulatorActions {
  setGraph: (flowId: string) => void
  reset: () => void
  setStatus: (status: SimulatorStatus) => void
  setCurrentNode: (nodeId: string | null) => void
  pushMessage: (message: ChatMessage) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  removeMessage: (id: string) => void
  pushTrace: (trace: NodeTrace) => void
  setVariable: (key: string, value: unknown) => void
  setSpeed: (speed: SimulatorSpeed) => void
  setError: (message: string | null) => void
  setAwaitingButton: (nodeId: string | null) => void
  setAwaitingInput: (nodeId: string | null) => void
  setInputBuffer: (value: string) => void
  markVisited: (nodeId: string) => void
}

const initialState: SimulatorState = {
  flowId: 'default',
  runId: null,
  status: 'idle',
  currentNodeId: null,
  visitedNodes: [],
  messages: [],
  variables: {},
  traces: [],
  speed: 1,
  errorMessage: null,
  pendingButtonNodeId: null,
  pendingInputNodeId: null,
  inputBuffer: '',
}

export const useSimulatorStore = create<SimulatorState & SimulatorActions>((set) => ({
  ...initialState,

  setGraph: (flowId) => set({ flowId }),

  reset: () => set({ ...initialState, flowId: useSimulatorStore.getState().flowId }),

  setStatus: (status) => set({ status }),

  setCurrentNode: (currentNodeId) => set({ currentNodeId }),

  pushMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, ...patch } : message,
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),

  pushTrace: (trace) => set((state) => ({ traces: [...state.traces, trace] })),

  setVariable: (key, value) =>
    set((state) => ({ variables: { ...state.variables, [key]: value } })),

  setSpeed: (speed) => set({ speed }),

  setError: (errorMessage) => set({ errorMessage }),

  setAwaitingButton: (pendingButtonNodeId) =>
    set({
      pendingButtonNodeId,
      status: pendingButtonNodeId ? 'awaiting-button' : 'running',
    }),

  setAwaitingInput: (pendingInputNodeId) =>
    set({
      pendingInputNodeId,
      status: pendingInputNodeId ? 'awaiting-input' : 'running',
    }),

  setInputBuffer: (inputBuffer) => set({ inputBuffer }),

  markVisited: (nodeId) =>
    set((state) =>
      state.visitedNodes.includes(nodeId)
        ? state
        : { visitedNodes: [...state.visitedNodes, nodeId] },
    ),
}))

export type SimulatorStore = SimulatorState & SimulatorActions
