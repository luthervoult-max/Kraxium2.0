import { Check, Loader2, Maximize2, Minimize2, Plus, Save, Smartphone, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FlowSaveState } from '@/components/flow/flowBuilderTypes'
import { cn } from '@/lib/utils'

interface FlowCanvasToolbarProps {
  flowName: string
  saveState: FlowSaveState
  isFocusMode: boolean
  showSimulator: boolean
  onFlowNameChange: (value: string) => void
  onAnalyze: () => void
  onToggleFocusMode: () => void
  onRequestSave: () => void
  onNewFlow: () => void
  onToggleSimulator: () => void
}

const toolbarButtonClass =
  'h-10 shrink-0 rounded-full px-3.5 text-[11px] font-black uppercase tracking-[0.12em] lg:px-4'
const toolbarGhostButtonClass = 'border-white/10 bg-white/[0.045] text-white hover:bg-white/10'
const toolbarActiveButtonClass =
  'border-neon-purple/45 bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/20'

export function FlowCanvasToolbar({
  flowName,
  saveState,
  isFocusMode,
  showSimulator,
  onFlowNameChange,
  onAnalyze,
  onToggleFocusMode,
  onRequestSave,
  onNewFlow,
  onToggleSimulator,
}: FlowCanvasToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/10 bg-surface-1 px-4 py-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 items-center gap-3 lg:w-[260px] xl:w-[320px]">
        <input
          value={flowName}
          onChange={(event) => onFlowNameChange(event.target.value)}
          className="h-10 w-full rounded-full border border-white/10 bg-surface-2 px-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-gray-600 focus:border-neon-purple/50"
          placeholder="Nome do fluxo"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto pb-1 lg:justify-end lg:overflow-visible lg:pb-0">
        <Button
          type="button"
          onClick={onAnalyze}
          aria-label="Gerar fluxo com IA"
          title="Gerar fluxo com IA"
          className={cn(toolbarButtonClass, toolbarGhostButtonClass)}
        >
          <Wand2 size={13} className="mr-1.5" aria-hidden="true" />
          Gerar IA
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleFocusMode}
          aria-label={isFocusMode ? 'Sair do modo foco' : 'Entrar no modo foco'}
          title={isFocusMode ? 'Sair do modo foco' : 'Entrar no modo foco'}
          className={cn(
            toolbarButtonClass,
            isFocusMode ? toolbarActiveButtonClass : toolbarGhostButtonClass,
          )}
        >
          {isFocusMode ? (
            <Minimize2 size={13} className="mr-1.5" aria-hidden="true" />
          ) : (
            <Maximize2 size={13} className="mr-1.5" aria-hidden="true" />
          )}
          {isFocusMode ? 'Sair' : 'Foco'}
        </Button>
        <Button
          type="button"
          onClick={onRequestSave}
          disabled={saveState === 'saving'}
          aria-label="Salvar fluxo"
          title="Salvar fluxo"
          className={cn(
            toolbarButtonClass,
            'border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] text-white shadow-[0_0_16px_rgba(180,77,255,0.22)] hover:opacity-95 disabled:opacity-60',
          )}
        >
          {saveState === 'saving' ? (
            <Loader2 size={13} className="mr-1.5 animate-spin" aria-hidden="true" />
          ) : saveState === 'saved' ? (
            <Check size={13} className="mr-1.5" aria-hidden="true" />
          ) : (
            <Save size={13} className="mr-1.5" aria-hidden="true" />
          )}
          {saveState === 'saving'
            ? 'Salvando...'
            : saveState === 'saved'
            ? 'Salvo'
            : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNewFlow}
          aria-label="Criar novo fluxo"
          title="Criar novo fluxo"
          className={cn(toolbarButtonClass, toolbarGhostButtonClass)}
        >
          <Plus size={13} className="mr-1.5" aria-hidden="true" />
          Novo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleSimulator}
          aria-label={showSimulator ? 'Ocultar simulador' : 'Mostrar simulador'}
          title={showSimulator ? 'Ocultar simulador' : 'Mostrar simulador'}
          className={cn(
            toolbarButtonClass,
            showSimulator ? toolbarActiveButtonClass : toolbarGhostButtonClass,
          )}
        >
          <Smartphone size={13} className="mr-1.5" aria-hidden="true" />
          Simular
        </Button>
      </div>
    </div>
  )
}
