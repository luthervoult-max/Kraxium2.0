import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import { categoryMeta, type Category } from '@/lib/blocks'

export interface FlowNodeData extends Record<string, unknown> {
  code: string
  category: Category
  title: string
  description: string
  text?: string
  options?: string[]
  runtimeStatus?: 'ok' | 'error'
  errorCount?: number
  lastErrorAt?: string | null
  lastTraceId?: string | null
  onDeleteNode?: (nodeId: string) => void
}

function FlowNodeComponent({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const { code, category, title, description } = data
  const meta = categoryMeta[category]
  const hasRuntimeError = data.runtimeStatus === 'error'
  const nodeColor = hasRuntimeError ? '#ff3b5f' : meta.color
  const nodeRgb = hasRuntimeError ? '255,59,95' : meta.rgb

  return (
    <div
      className="group/node relative w-[260px] rounded-2xl border bg-[#151720]/95 backdrop-blur-md transition-all"
      style={{
        borderColor: selected || hasRuntimeError ? nodeColor : `rgba(${nodeRgb}, 0.25)`,
        boxShadow: selected
          ? `0 0 0 1px ${nodeColor}, 0 0 24px rgba(${nodeRgb}, 0.35)`
          : hasRuntimeError
            ? `0 0 0 1px rgba(${nodeRgb}, 0.35), 0 0 24px rgba(${nodeRgb}, 0.26)`
            : `0 0 12px rgba(${nodeRgb}, 0.12)`,
      }}
    >
      {data.onDeleteNode && (
        <button
          type="button"
          aria-label={`Excluir bloco ${title}`}
          title="Excluir bloco"
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            data.onDeleteNode?.(id)
          }}
          className="nodrag nopan pointer-events-none absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#0f1118]/95 text-gray-300 opacity-0 shadow-[0_10px_28px_rgba(0,0,0,0.36)] backdrop-blur-md transition-all hover:border-[#ff3b5f]/45 hover:text-[#ff6b84] focus:pointer-events-auto focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/60 group-hover/node:pointer-events-auto group-hover/node:opacity-100"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}

      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${nodeColor}, rgba(${nodeRgb}, 0.4))` }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-0"
        style={{ background: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-bold font-mono"
              style={{
                background: `rgba(${meta.rgb}, 0.15)`,
                color: meta.color,
                border: `1px solid rgba(${meta.rgb}, 0.3)`,
              }}
            >
              {code}
            </span>
            <p
              className="text-[8px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: `rgba(${meta.rgb}, 0.7)` }}
            >
              {meta.label}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasRuntimeError && (
              <span className="rounded-full border border-[#ff3b5f]/35 bg-[#ff3b5f]/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#ff6b84]">
                {data.errorCount ?? 1} erro{(data.errorCount ?? 1) > 1 ? 's' : ''}
              </span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.22em]"
              style={{
                background: `rgba(${meta.rgb}, 0.1)`,
                color: meta.color,
                border: `1px solid rgba(${meta.rgb}, 0.25)`,
              }}
            >
              {meta.label.split(' ')[0]}
            </span>
          </div>
        </div>

        <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-white font-display">{title}</p>
        <p className="text-[11px] leading-6 text-gray-400">{description}</p>

        <div className="mt-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-[0.22em]"
          style={{
            background: `rgba(${meta.rgb}, 0.12)`,
            color: meta.color,
            border: `1px solid rgba(${meta.rgb}, 0.25)`,
          }}
        >
          NEXT
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-0"
        style={{ background: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
      />
    </div>
  )
}

export const FlowNode = memo(FlowNodeComponent)
