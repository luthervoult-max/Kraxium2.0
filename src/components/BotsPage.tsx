import { useEffect, useState } from 'react'
import { Bot as BotIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import BotForm from '@/components/BotForm'
import BotTutorial from '@/components/BotTutorial'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBot, deleteBot, listBots, type Bot } from '@/lib/api/bots'

interface BotsPageProps {
  selectedBotId: string | null
  onSelectBot: (id: string | null) => void
}

export default function BotsPage({ selectedBotId, onSelectBot }: BotsPageProps) {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      const data = await listBots()
      setBots(data)
      if (!selectedBotId && data[0]) {
        onSelectBot(data[0].id)
      }
      if (selectedBotId && !data.some((bot) => bot.id === selectedBotId)) {
        onSelectBot(data[0]?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao listar bots.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const bot = await createBot({ name: `Bot ${bots.length + 1}` })
      await refresh()
      onSelectBot(bot.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar bot.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este bot? Fluxos vinculados ficarao sem bot executor.')) return
    try {
      await deleteBot(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir.')
    }
  }

  const selectedBot = bots.find((bot) => bot.id === selectedBotId) ?? null

  return (
    <main className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-white/8 bg-deep-800/60 p-3">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neon-purple">
                Seus bots
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={creating}
                className="h-7 rounded-full bg-neon-purple/15 border border-neon-purple/30 text-neon-purple text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-neon-purple/25"
              >
                {creating ? (
                  <Loader2 size={12} className="mr-1 animate-spin" aria-hidden />
                ) : (
                  <Plus size={12} className="mr-1" aria-hidden />
                )}
                Novo
              </Button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-6 text-gray-500">
                <Loader2 size={16} className="animate-spin" aria-hidden />
              </div>
            )}

            {!loading && bots.length === 0 && (
              <p className="px-2 py-4 text-xs text-gray-500">
                Nenhum bot ainda. Clique em "Novo" para criar.
              </p>
            )}

            <ul className="space-y-1">
              {bots.map((bot) => {
                const isActive = bot.id === selectedBotId
                return (
                  <li
                    key={bot.id}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 transition-colors',
                      isActive
                        ? 'bg-neon-purple/12 text-white'
                        : 'text-gray-300 hover:bg-white/4',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectBot(bot.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          isActive
                            ? 'bg-neon-purple/20 text-neon-purple'
                            : 'bg-white/4 text-gray-400',
                        )}
                      >
                        <BotIcon size={14} aria-hidden />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {bot.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(bot.id)}
                      className="shrink-0 rounded-lg p-1 opacity-0 transition-opacity hover:bg-white/5 group-hover:opacity-100"
                      aria-label={`Excluir ${bot.name}`}
                    >
                      <Trash2
                        size={13}
                        className="text-gray-500 hover:text-red-400"
                        aria-hidden
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {error && (
            <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/8 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </aside>

        <div className="flex-1 min-w-0">
          {selectedBot ? (
            <BotForm bot={selectedBot} onChanged={refresh} />
          ) : (
            <div className="rounded-2xl border border-white/8 bg-deep-800/60 p-10 text-center text-sm text-gray-500">
              Selecione ou crie um bot para começar.
            </div>
          )}
        </div>

        <div className="w-full shrink-0 lg:w-72">
          <BotTutorial />
        </div>
      </div>
    </main>
  )
}
