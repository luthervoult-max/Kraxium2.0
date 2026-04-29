import { useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { useSimulatorStore } from '@/lib/simulator/store'
import { submitUserInput } from '@/lib/simulator/engine'
import { cn } from '@/lib/utils'

export function UserInputBar() {
  const status = useSimulatorStore((state) => state.status)
  const pendingInputNodeId = useSimulatorStore((state) => state.pendingInputNodeId)
  const inputBuffer = useSimulatorStore((state) => state.inputBuffer)
  const setInputBuffer = useSimulatorStore((state) => state.setInputBuffer)
  const inputRef = useRef<HTMLInputElement>(null)

  const enabled = status === 'awaiting-input' && pendingInputNodeId !== null

  useEffect(() => {
    if (enabled) inputRef.current?.focus()
  }, [enabled])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!enabled || !pendingInputNodeId || !inputBuffer.trim()) return
    submitUserInput(pendingInputNodeId, inputBuffer.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 border-t border-white/6 bg-[#0f1118] px-3 py-2.5 transition-opacity',
        !enabled && 'opacity-60',
      )}
    >
      <input
        ref={inputRef}
        value={inputBuffer}
        onChange={(event) => setInputBuffer(event.target.value)}
        disabled={!enabled}
        placeholder={enabled ? 'Digite uma resposta…' : 'Aguardando nó de input…'}
        className="flex-1 rounded-full border border-white/8 bg-[#1a1f2c] px-4 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-neon-purple/60 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!enabled || !inputBuffer.trim()}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-purple text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        aria-label="Enviar"
      >
        <Send size={16} aria-hidden />
      </button>
    </form>
  )
}
