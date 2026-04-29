import { Pause, Play, RotateCcw } from 'lucide-react'
import { useSimulatorStore } from '@/lib/simulator/store'
import { runSimulation } from '@/lib/simulator/engine'
import type { SimEdge, SimNode, SimulatorSpeed } from '@/lib/simulator/types'
import { cn } from '@/lib/utils'

const SPEEDS: SimulatorSpeed[] = [1, 2, 4, 'instant']

interface SimulatorControlsProps {
  flowId: string
  nodes: SimNode[]
  edges: SimEdge[]
}

export function SimulatorControls({ flowId, nodes, edges }: SimulatorControlsProps) {
  const status = useSimulatorStore((state) => state.status)
  const speed = useSimulatorStore((state) => state.speed)
  const setSpeed = useSimulatorStore((state) => state.setSpeed)
  const setStatus = useSimulatorStore((state) => state.setStatus)
  const reset = useSimulatorStore((state) => state.reset)
  const errorMessage = useSimulatorStore((state) => state.errorMessage)
  const visitedCount = useSimulatorStore((state) => state.visitedNodes.length)

  const isActive =
    status === 'running' || status === 'awaiting-button' || status === 'awaiting-input'

  function handlePlay() {
    if (isActive) {
      setStatus('idle')
      return
    }
    void runSimulation({ flowId, nodes, edges })
  }

  function handleReset() {
    setStatus('idle')
    reset()
  }

  return (
    <div className="border-b border-white/6 bg-[#0f1118] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          className={cn(
            'flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors',
            isActive
              ? 'border border-orange-400/40 bg-orange-400/12 text-orange-300 hover:bg-orange-400/18'
              : 'bg-[#2b87f5] text-white hover:opacity-90',
          )}
        >
          {isActive ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          {isActive ? 'Parar' : 'Play'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10"
        >
          <RotateCcw size={14} aria-hidden />
          Reset
        </button>

        <div className="ml-auto flex items-center gap-1 rounded-full border border-white/6 bg-white/4 p-0.5">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
                speed === value
                  ? 'bg-white/12 text-white'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              {value === 'instant' ? '∞' : `${value}x`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-500">
        <span>status: <span className="text-gray-300">{status}</span></span>
        <span>·</span>
        <span>nós visitados: <span className="text-gray-300">{visitedCount}</span></span>
        {errorMessage && (
          <>
            <span>·</span>
            <span className="text-red-400 normal-case tracking-normal">{errorMessage}</span>
          </>
        )}
      </div>
    </div>
  )
}
