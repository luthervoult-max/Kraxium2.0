import { Smartphone } from 'lucide-react'
import type { SimEdge, SimNode } from '@/lib/simulator/types'
import { ChatViewport } from './ChatViewport'
import { SimulatorControls } from './SimulatorControls'
import { UserInputBar } from './UserInputBar'

interface TelegramSimulatorProps {
  flowId: string
  flowName: string
  nodes: SimNode[]
  edges: SimEdge[]
}

export function TelegramSimulator({ flowId, flowName, nodes, edges }: TelegramSimulatorProps) {
  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[#0a0d14] shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3 border-b border-white/6 bg-surface-4 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-purple/15 text-neon-purple">
          <Smartphone size={16} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{flowName || 'Bot do Telegram'}</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">simulação</p>
        </div>
      </div>

      <SimulatorControls flowId={flowId} nodes={nodes} edges={edges} />

      <ChatViewport />

      <UserInputBar />
    </div>
  )
}
