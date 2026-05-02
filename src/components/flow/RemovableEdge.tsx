import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import type { BuilderEdge } from '@/components/flow/flowBuilderTypes'
import { cn } from '@/lib/utils'

export function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<BuilderEdge>) {
  const [isHovered, setIsHovered] = useState(false)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const edgeColor = typeof style?.stroke === 'string' ? style.stroke : '#b44dff'

  return (
    <>
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={style}
          interactionWidth={28}
        />
      </g>
      {data?.onDeleteEdge && (
        <EdgeLabelRenderer>
          <button
            type="button"
            aria-label="Excluir conexao"
            title="Excluir conexao"
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              data.onDeleteEdge?.(id)
            }}
            className={cn(
              'nodrag nopan absolute z-30 flex h-7 w-7 items-center justify-center rounded-full border bg-surface-4/95 text-white shadow-[0_12px_35px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-150 focus:pointer-events-auto focus:scale-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/60',
              isHovered ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
            )}
            style={{
              borderColor: edgeColor,
              boxShadow: `0 0 18px ${edgeColor}55`,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
