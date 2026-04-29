import { useEffect, useRef } from 'react'
import { useSimulatorStore } from '@/lib/simulator/store'
import { MessageBubble } from './MessageBubble'

export function ChatViewport() {
  const messages = useSimulatorStore((state) => state.messages)
  const status = useSimulatorStore((state) => state.status)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [messages.length])

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
      style={{
        background:
          'linear-gradient(180deg, #0e1219 0%, #131824 100%)',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='%23ffffff' fill-opacity='0.015'/%3E%3C/svg%3E\")",
      }}
    >
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-gray-500">
            {status === 'idle'
              ? 'Clique em Play para iniciar a simulação.'
              : 'Aguardando mensagens…'}
          </p>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          awaitingButton={status === 'awaiting-button'}
        />
      ))}
    </div>
  )
}
