import { Check, GitBranch, Loader2 } from 'lucide-react'
import type { Bot as TelegramBot } from '@/lib/api/bots'
import { Button } from '@/components/ui/button'

export function SaveFlowDialog({
  name,
  botId,
  bots,
  loadingBots,
  saving,
  error,
  onNameChange,
  onBotChange,
  onCancel,
  onConfirm,
}: {
  name: string
  botId: string
  bots: TelegramBot[]
  loadingBots: boolean
  saving: boolean
  error: string | null
  onNameChange: (value: string) => void
  onBotChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-flow-dialog-title"
        className="w-full max-w-xl rounded-[28px] border border-neon-purple/25 bg-[#11141d] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neon-purple/25 bg-neon-purple/10 text-neon-purple">
            <GitBranch size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neon-purple">
              Salvar fluxo
            </p>
            <h2 id="save-flow-dialog-title" className="mt-1 text-2xl font-black text-white">
              Escolha o bot executor
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Esse bot passara a executar este fluxo. Se ele ja tiver outro fluxo ativo, o anterior sera pausado.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Nome do fluxo
            </span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-12 w-full rounded-[14px] border border-white/10 bg-[#0c0f16] px-4 text-sm font-bold text-white outline-none transition-colors focus:border-neon-purple/50"
              placeholder="Ex: Funil principal"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Bot que vai executar
            </span>
            <select
              value={botId}
              disabled={loadingBots || saving || bots.length === 0}
              onChange={(event) => onBotChange(event.target.value)}
              className="h-12 w-full rounded-[14px] border border-white/10 bg-[#0c0f16] px-4 text-sm font-bold text-white outline-none transition-colors focus:border-neon-purple/50 disabled:opacity-50"
            >
              {loadingBots && <option value="">Carregando bots...</option>}
              {!loadingBots && bots.length === 0 && <option value="">Nenhum bot encontrado</option>}
              {!loadingBots &&
                bots.map((bot) => (
                  <option key={bot.id} value={bot.id} className="bg-[#0c0f16] text-gray-200">
                    {bot.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm leading-6 text-neon-orange">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="neonGradient"
            onClick={onConfirm}
            disabled={saving || loadingBots || bots.length === 0}
            className="rounded-full px-5 font-bold disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Check size={15} className="mr-2" aria-hidden="true" />
            )}
            {saving ? 'Salvando...' : 'Salvar neste bot'}
          </Button>
        </div>
      </div>
    </div>
  )
}
