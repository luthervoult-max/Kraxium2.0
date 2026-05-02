import { GitBranch, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { BlockDef, Category, categoryMeta } from '@/lib/blocks'
import { cn } from '@/lib/utils'
import { formatCategoryLabel, normalizeDescription } from '@/components/flow/flowCanvasState'

type PaletteGroup = {
  category: Category
  meta: (typeof categoryMeta)[Category]
  blocks: BlockDef[]
}

interface BlockPaletteProps {
  groups: PaletteGroup[]
  isCollapsed: boolean
  panelHeightClass: string
  onToggleCollapsed: () => void
  onAddBlock: (block: BlockDef) => void
}

export function BlockPalette({
  groups,
  isCollapsed,
  panelHeightClass,
  onToggleCollapsed,
  onAddBlock,
}: BlockPaletteProps) {
  return (
    <aside
      className={cn(
        'flex flex-col overflow-hidden border border-white/10 bg-[#0c0d10] shadow-[0_18px_55px_rgba(0,0,0,0.36)] transition-all',
        panelHeightClass,
        isCollapsed
          ? 'w-full rounded-[18px] xl:min-h-[640px] xl:w-[72px]'
          : 'w-full rounded-l-[22px] xl:max-h-full xl:max-w-[260px]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b border-white/10 bg-[#08090b]',
          isCollapsed ? 'px-4 py-4 xl:flex-col xl:px-3 xl:py-5' : 'px-5 py-4',
        )}
      >
        {isCollapsed ? (
          <div className="flex items-center gap-3 xl:flex-col">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-neon-purple/25 bg-neon-purple/12 text-neon-purple">
              <GitBranch size={17} aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neon-purple xl:[writing-mode:vertical-rl] xl:rotate-180">
              Blocos
            </span>
          </div>
        ) : (
          <h2 className="text-base font-black uppercase tracking-[0.16em] text-neon-purple">
            Blocos disponiveis
          </h2>
        )}

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-neon-purple/30 hover:text-neon-purple"
          aria-label={isCollapsed ? 'Expandir blocos' : 'Minimizar blocos'}
          title={isCollapsed ? 'Expandir blocos' : 'Minimizar blocos'}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {groups.map((group) => (
            <section key={group.category} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-white/7" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gray-500">
                  {formatCategoryLabel(group.meta.label)}
                </p>
              </div>

              <div className="space-y-3">
                {group.blocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/kraxium-block', JSON.stringify(block))
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => onAddBlock(block)}
                    className="group h-20 w-full overflow-hidden rounded-[8px] border border-white/10 bg-[#111318] p-3 text-left transition-all hover:border-neon-purple/30 hover:bg-[#151821]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border font-mono text-lg font-bold"
                        style={{
                          color: group.meta.color,
                          background: `rgba(${group.meta.rgb}, 0.12)`,
                          borderColor: `rgba(${group.meta.rgb}, 0.24)`,
                        }}
                      >
                        {block.code}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold uppercase tracking-[0.04em] text-white">
                          {block.title}
                        </p>
                        <p className="mt-2 text-[14px] leading-8 text-gray-400">
                          {normalizeDescription(block.description)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </aside>
  )
}
