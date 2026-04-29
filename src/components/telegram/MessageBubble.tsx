import { memo } from 'react'
import { FileIcon, ImageIcon, MapPin, Mic, Video } from 'lucide-react'
import { categoryMeta } from '@/lib/blocks'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/simulator/types'
import { selectButtonOption } from '@/lib/simulator/engine'

const KIND_ICON: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Mic,
  file: FileIcon,
  'video-note': Video,
  location: MapPin,
}

interface MessageBubbleProps {
  message: ChatMessage
  awaitingButton: boolean
}

function MessageBubbleComponent({ message, awaitingButton }: MessageBubbleProps) {
  const meta = message.category ? categoryMeta[message.category] : null
  const isUser = message.author === 'user'
  const isSystem = message.author === 'system' || message.kind === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-1">
        <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
          {message.text}
        </div>
      </div>
    )
  }

  if (message.kind === 'typing') {
    return (
      <div className="flex justify-start">
        <div className="rounded-2xl bg-[#1c2230] px-4 py-3 text-xs text-gray-400">
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:160ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400 [animation-delay:320ms]" />
          </span>
        </div>
      </div>
    )
  }

  const Icon = KIND_ICON[message.kind]

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-md',
          isUser
            ? 'bg-[#2b87f5] text-white rounded-br-sm'
            : 'bg-[#1c2230] text-gray-100 rounded-bl-sm border border-white/4',
        )}
        style={
          !isUser && meta
            ? { boxShadow: `inset 0 1px 0 rgba(${meta.rgb}, 0.18)` }
            : undefined
        }
      >
        {!isUser && message.nodeCode && (
          <div
            className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.18em]"
            style={{
              color: meta?.color,
              background: meta ? `rgba(${meta.rgb}, 0.12)` : undefined,
            }}
          >
            {message.nodeCode}
          </div>
        )}

        {Icon && (
          <div
            className="mb-2 flex h-32 items-center justify-center rounded-xl border border-white/8 bg-black/20"
            aria-label={`Preview de ${message.kind}`}
          >
            <Icon size={32} className="text-gray-500" aria-hidden />
          </div>
        )}

        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

        {message.kind === 'buttons' && message.options && (
          <div className="mt-3 grid gap-1.5">
            {message.options.map((option) => {
              const isSelected = message.selectedOption === option
              const disabled = !awaitingButton || Boolean(message.selectedOption)
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectButtonOption(message.id, option)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors',
                    isSelected
                      ? 'border-[#2b87f5] bg-[#2b87f5]/15 text-white'
                      : 'border-white/10 bg-white/4 text-gray-200 hover:bg-white/8',
                    disabled && !isSelected && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleComponent)
