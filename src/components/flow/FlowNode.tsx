import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Plus, Trash2, X } from 'lucide-react'
import { categoryMeta, type Category } from '@/lib/blocks'
import {
  getBlockSpec,
  listFromConfig,
  routeListFromConfig,
  type BlockConfig,
  type BlockFieldSpec,
  type BlockOutput,
} from '@/lib/blockSpecs'

export interface FlowTargetOption {
  id: string
  label: string
}

export interface FlowNodeData extends Record<string, unknown> {
  code: string
  category: Category
  title: string
  description: string
  text?: string
  options?: string[]
  config?: BlockConfig
  expanded?: boolean
  outputs?: BlockOutput[]
  validationIssues?: string[]
  isStartNode?: boolean
  runtimeStatus?: 'ok' | 'error'
  errorCount?: number
  lastErrorAt?: string | null
  lastTraceId?: string | null
  availableTargetNodes?: FlowTargetOption[]
  onConfigChange?: (nodeId: string, patch: BlockConfig) => void
  onDeleteNode?: (nodeId: string) => void
  onToggleExpanded?: (nodeId: string) => void
}

function FlowNodeComponent({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const { code, category, title, description } = data
  const meta = categoryMeta[category]
  const isStartNode = data.isStartNode === true
  const hasRuntimeError = data.runtimeStatus === 'error'
  const hasValidationIssues = (data.validationIssues?.length ?? 0) > 0
  const nodeColor = hasRuntimeError ? '#ff3b5f' : isStartNode ? '#22c55e' : meta.color
  const nodeRgb = hasRuntimeError ? '255,59,95' : isStartNode ? '34,197,94' : meta.rgb
  const outputs = data.outputs ?? [{ id: 'next', label: 'NEXT' }]
  const config = data.config ?? {}
  const spec = getBlockSpec(code)

  if (isStartNode) {
    return (
      <div
        className="group/node relative w-[260px] rounded-2xl border bg-[#151720]/95 backdrop-blur-md transition-all"
        style={{
          borderColor: selected ? nodeColor : `rgba(${nodeRgb}, 0.25)`,
          boxShadow: selected
            ? `0 0 0 1px ${nodeColor}, 0 0 24px rgba(${nodeRgb}, 0.35)`
            : `0 0 12px rgba(${nodeRgb}, 0.12)`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${nodeColor}, rgba(${nodeRgb}, 0.4))` }}
        />

        <div className="p-4">
          <NodeHeader
            code={code}
            label={meta.label}
            badge="Start"
            color={nodeColor}
            rgb={nodeRgb}
          />
          <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-white font-display">{title}</p>
          <p className="text-[11px] leading-6 text-gray-400">{description}</p>
          <NodeOutputPill label="NEXT" color={nodeColor} rgb={nodeRgb} />
        </div>

        <Handle
          id="next"
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-0"
          style={{ background: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
        />
      </div>
    )
  }

  if (data.expanded) {
    return (
      <div
        className="group/node relative w-[310px] rounded-[14px] border bg-[#11131a]/98 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all"
        style={{
          borderColor: selected || hasRuntimeError || hasValidationIssues ? nodeColor : `rgba(${nodeRgb}, 0.32)`,
          boxShadow: selected
            ? `0 0 0 1px ${nodeColor}, 0 0 28px rgba(${nodeRgb}, 0.34)`
            : hasValidationIssues
              ? `0 0 0 1px rgba(255,157,42,0.24), 0 0 24px rgba(255,157,42,0.16)`
              : `0 0 16px rgba(${nodeRgb}, 0.12)`,
        }}
      >
        {data.onDeleteNode && <DeleteButton title={title} onDelete={() => data.onDeleteNode?.(id)} />}

        <div
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-[14px]"
          style={{ background: nodeColor, boxShadow: `0 0 16px rgba(${nodeRgb}, 0.6)` }}
        />

        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-0"
          style={{ background: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
        />

        <div className="space-y-3 p-4">
          <NodeHeader
            code={code}
            label={title}
            badge={meta.label.split(' ')[0]}
            color={nodeColor}
            rgb={nodeRgb}
          />

          <p className="text-[10px] leading-5 text-gray-500">{spec?.summary ?? description}</p>

          {hasValidationIssues && (
            <div className="rounded-[10px] border border-neon-orange/25 bg-neon-orange/10 px-3 py-2 text-[10px] leading-5 text-neon-orange">
              {data.validationIssues?.[0]}
            </div>
          )}

          <div className="space-y-2">
            {(spec?.fields ?? []).map((field) => (
              <FieldEditor
                key={field.key}
                field={field}
                value={config[field.key]}
                color={nodeColor}
                rgb={nodeRgb}
                targets={data.availableTargetNodes ?? []}
                onChange={(value) => data.onConfigChange?.(id, { [field.key]: value })}
              />
            ))}
          </div>

          {outputs.length > 0 && (
            <div className="relative min-h-[36px] pt-2">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(outputs.length, 4)}, minmax(0, 1fr))` }}>
                {outputs.map((output) => (
                  <span
                    key={output.id}
                    className="truncate text-center text-[8px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: nodeColor }}
                    title={output.label}
                  >
                    {output.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <SourceHandles outputs={outputs} color={nodeColor} />
      </div>
    )
  }

  return (
    <div
      className="group/node relative w-[260px] rounded-2xl border bg-[#151720]/95 backdrop-blur-md transition-all"
      style={{
        borderColor: selected || hasRuntimeError || hasValidationIssues ? nodeColor : `rgba(${nodeRgb}, 0.25)`,
        boxShadow: selected
          ? `0 0 0 1px ${nodeColor}, 0 0 24px rgba(${nodeRgb}, 0.35)`
          : hasRuntimeError
            ? `0 0 0 1px rgba(${nodeRgb}, 0.35), 0 0 24px rgba(${nodeRgb}, 0.26)`
            : hasValidationIssues
              ? '0 0 0 1px rgba(255,157,42,0.26), 0 0 24px rgba(255,157,42,0.14)'
              : `0 0 12px rgba(${nodeRgb}, 0.12)`,
      }}
    >
      {data.onDeleteNode && <DeleteButton title={title} onDelete={() => data.onDeleteNode?.(id)} />}

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
        <NodeHeader
          code={code}
          label={meta.label}
          badge={hasValidationIssues ? 'Pendente' : meta.label.split(' ')[0]}
          color={hasValidationIssues ? '#ff9d2a' : nodeColor}
          rgb={hasValidationIssues ? '255,157,42' : nodeRgb}
        />

        <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-white font-display">{title}</p>
        <p className="text-[11px] leading-6 text-gray-400">{description}</p>

        {outputs.length > 0 && (
          <NodeOutputPill label={outputs.length > 1 ? `${outputs.length} saidas` : outputs[0]?.label ?? 'NEXT'} color={nodeColor} rgb={nodeRgb} />
        )}
      </div>

      <CompactSourceHandles outputs={outputs} color={nodeColor} />
    </div>
  )
}

function NodeHeader({
  code,
  label,
  badge,
  color,
  rgb,
}: {
  code: string
  label: string
  badge: string
  color: string
  rgb: string
}) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold font-mono"
          style={{
            background: `rgba(${rgb}, 0.15)`,
            color,
            border: `1px solid rgba(${rgb}, 0.3)`,
          }}
        >
          {code}
        </span>
        <p className="truncate text-[8px] font-semibold uppercase tracking-[0.28em]" style={{ color: `rgba(${rgb}, 0.7)` }}>
          {label}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.22em]"
        style={{
          background: `rgba(${rgb}, 0.1)`,
          color,
          border: `1px solid rgba(${rgb}, 0.25)`,
        }}
      >
        {badge}
      </span>
    </div>
  )
}

function DeleteButton({ title, onDelete }: { title: string; onDelete: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Excluir bloco ${title}`}
      title="Excluir bloco"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDelete()
      }}
      className="nodrag nopan pointer-events-none absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#0f1118]/95 text-gray-300 opacity-0 shadow-[0_10px_28px_rgba(0,0,0,0.36)] backdrop-blur-md transition-all hover:border-[#ff3b5f]/45 hover:text-[#ff6b84] focus:pointer-events-auto focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/60 group-hover/node:pointer-events-auto group-hover/node:opacity-100"
    >
      <X size={13} aria-hidden="true" />
    </button>
  )
}

function NodeOutputPill({ label, color, rgb }: { label: string; color: string; rgb: string }) {
  return (
    <div
      className="mt-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-[0.22em]"
      style={{
        background: `rgba(${rgb}, 0.12)`,
        color,
        border: `1px solid rgba(${rgb}, 0.25)`,
      }}
    >
      {label}
    </div>
  )
}

function FieldEditor({
  field,
  value,
  color,
  rgb,
  targets,
  onChange,
}: {
  field: BlockFieldSpec
  value: unknown
  color: string
  rgb: string
  targets: FlowTargetOption[]
  onChange: (value: unknown) => void
}) {
  const commonClass =
    'nodrag nopan w-full rounded-[9px] border border-white/8 bg-[#0b0d12] px-3 py-2 text-[11px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-neon-purple/50'

  return (
    <div className="block space-y-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {field.label}
        {field.required ? <span className="ml-1 text-neon-orange">*</span> : null}
      </span>

      {field.kind === 'textarea' ? (
        <textarea
          value={String(value ?? '')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={`${commonClass} min-h-[74px] resize-none leading-5`}
        />
      ) : field.kind === 'number' ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={field.min}
            value={Number(value ?? 0)}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onChange(Number(event.target.value))}
            className={commonClass}
          />
          {field.suffix && <span className="text-[10px] font-semibold text-gray-500">{field.suffix}</span>}
        </div>
      ) : field.kind === 'select' ? (
        <select
          value={String(value ?? field.options?.[0]?.value ?? '')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          className={commonClass}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.kind === 'node-select' ? (
        <select
          value={String(value ?? '')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          className={commonClass}
        >
          <option value="">Selecione...</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
        </select>
      ) : field.kind === 'switch' ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onChange(!Boolean(value))
          }}
          className="nodrag nopan flex w-full items-center justify-between rounded-[9px] border border-white/8 bg-[#0b0d12] px-3 py-2 text-[11px] text-gray-300"
        >
          <span>{Boolean(value) ? 'Ativo' : 'Desativado'}</span>
          <span
            className="h-4 w-8 rounded-full p-0.5 transition-colors"
            style={{ background: Boolean(value) ? `rgba(${rgb}, 0.42)` : 'rgba(255,255,255,0.12)' }}
          >
            <span
              className="block h-3 w-3 rounded-full bg-white transition-transform"
              style={{ transform: Boolean(value) ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </span>
        </button>
      ) : field.kind === 'button-list' ? (
        <StringListEditor value={listFromConfig(value, [])} color={color} onChange={onChange} addLabel="Adicionar botao" />
      ) : field.kind === 'route-list' ? (
        <RouteListEditor value={routeListFromConfig(value)} color={color} onChange={onChange} />
      ) : (
        <input
          value={String(value ?? '')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={commonClass}
        />
      )}

      {field.helper && <span className="text-[9px] leading-4 text-gray-600">{field.helper}</span>}
    </div>
  )
}

function StringListEditor({
  value,
  color,
  onChange,
  addLabel,
}: {
  value: string[]
  color: string
  onChange: (value: string[]) => void
  addLabel: string
}) {
  return (
    <div className="nodrag nopan space-y-2" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      {value.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(event) => {
              const next = [...value]
              next[index] = event.target.value
              onChange(next)
            }}
            className="w-full rounded-[9px] border border-white/8 bg-[#0b0d12] px-3 py-2 text-[11px] text-white outline-none focus:border-neon-purple/50"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-white/8 bg-white/5 text-gray-400 hover:border-[#ff3b5f]/35 hover:text-[#ff6b84]"
            aria-label="Remover item"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, `${addLabel.replace('Adicionar ', '')} ${value.length + 1}`])}
        className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-dashed px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color, borderColor: `${color}55`, background: `${color}12` }}
      >
        <Plus size={12} aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  )
}

function RouteListEditor({
  value,
  color,
  onChange,
}: {
  value: Array<{ label: string; weight: number }>
  color: string
  onChange: (value: Array<{ label: string; weight: number }>) => void
}) {
  return (
    <div className="nodrag nopan space-y-2" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      {value.map((route, index) => (
        <div key={`${route.label}-${index}`} className="grid grid-cols-[1fr_70px_32px] gap-2">
          <input
            value={route.label}
            onChange={(event) => {
              const next = [...value]
              next[index] = { ...route, label: event.target.value }
              onChange(next)
            }}
            className="rounded-[9px] border border-white/8 bg-[#0b0d12] px-3 py-2 text-[11px] text-white outline-none focus:border-neon-purple/50"
          />
          <input
            type="number"
            value={route.weight}
            onChange={(event) => {
              const next = [...value]
              next[index] = { ...route, weight: Number(event.target.value) }
              onChange(next)
            }}
            className="rounded-[9px] border border-white/8 bg-[#0b0d12] px-2 py-2 text-[11px] text-white outline-none focus:border-neon-purple/50"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, routeIndex) => routeIndex !== index))}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/8 bg-white/5 text-gray-400 hover:border-[#ff3b5f]/35 hover:text-[#ff6b84]"
            aria-label="Remover caminho"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { label: `Caminho ${value.length + 1}`, weight: 0 }])}
        className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-dashed px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color, borderColor: `${color}55`, background: `${color}12` }}
      >
        <Plus size={12} aria-hidden="true" />
        Adicionar caminho
      </button>
    </div>
  )
}

function CompactSourceHandles({ outputs, color }: { outputs: BlockOutput[]; color: string }) {
  if (outputs.length === 0) return null

  if (outputs.length <= 1) {
    return (
      <Handle
        id={outputs[0]?.id ?? 'next'}
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-0"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
    )
  }

  return <SourceHandles outputs={outputs} color={color} />
}

function SourceHandles({ outputs, color }: { outputs: BlockOutput[]; color: string }) {
  if (outputs.length === 0) return null

  return (
    <>
      {outputs.map((output, index) => (
        <Handle
          key={output.id}
          id={output.id}
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-0"
          style={{
            left: `${((index + 1) / (outputs.length + 1)) * 100}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      ))}
    </>
  )
}

export const FlowNode = memo(FlowNodeComponent)
