import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { deleteBot, updateBot, type Bot } from '@/lib/api/bots'

interface BotFormProps {
  bot: Bot
  onChanged: () => void | Promise<void>
}

export default function BotForm({ bot, onChanged }: BotFormProps) {
  const [name, setName] = useState(bot.name)
  const [token, setToken] = useState(bot.telegram_token ?? '')
  const [webhookUrl, setWebhookUrl] = useState(bot.webhook_url ?? '')
  const [notificationsEnabled, setNotificationsEnabled] = useState(bot.notifications_enabled ?? true)
  const [webhookEnabled, setWebhookEnabled] = useState(bot.webhook_enabled ?? false)
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(bot.name)
    setToken(bot.telegram_token ?? '')
    setWebhookUrl(bot.webhook_url ?? '')
    setNotificationsEnabled(bot.notifications_enabled ?? true)
    setWebhookEnabled(bot.webhook_enabled ?? false)
    setSavedAt(null)
    setError(null)
  }, [bot.id])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateBot(bot.id, {
        name: name.trim() || 'Bot sem nome',
        telegram_token: token.trim() || null,
        webhook_url: webhookUrl.trim() || null,
        notifications_enabled: notificationsEnabled,
        webhook_enabled: webhookEnabled,
      })
      setSavedAt(Date.now())
      await onChanged()
      window.setTimeout(() => setSavedAt(null), 2200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar bot.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir o bot "${bot.name}"? Fluxos vinculados ficarao sem bot executor.`)) return
    try {
      await deleteBot(bot.id)
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir bot.')
    }
  }

  const labelClass = 'text-[10px] font-semibold uppercase tracking-widest text-neon-purple mb-2 block'
  const groupClass = 'bg-deep-800/60 border border-white/5 rounded-xl p-5 flex flex-col gap-5'

  return (
    <div className="flex flex-col gap-5">
      <div className={groupClass}>
        <p className={labelClass}>Informações do Bot</p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bot-name" className="text-[10px] font-semibold uppercase tracking-widest text-neon-purple">
            Nome do Bot
          </label>
          <Input
            id="bot-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-deep-900 border-white/5 text-white font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bot-token" className="text-[10px] font-semibold uppercase tracking-widest text-neon-purple">
            Token do Telegram
          </label>
          <div className="relative">
            <Input
              id="bot-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxx"
              className="bg-deep-900 border-white/5 text-white pr-10 font-mono placeholder:font-mono"
            />
            <button
              type="button"
              aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
              onClick={() => setShowToken((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-purple transition-colors"
            >
              {showToken ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bot-webhook" className="text-[10px] font-semibold uppercase tracking-widest text-neon-purple">
            Webhook URL
          </label>
          <Input
            id="bot-webhook"
            type="url"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://seu-servidor.com/webhook"
            className="bg-deep-900 border-white/5 text-white placeholder:font-mono font-mono"
          />
        </div>
      </div>

      <div className={groupClass}>
        <p className={labelClass}>Preferências</p>

        <Toggle
          id="toggle-notifications"
          label="Notificações ativas"
          checked={notificationsEnabled}
          onChange={(value) => setNotificationsEnabled(value)}
        />
        <Toggle
          id="toggle-webhook"
          label="Webhook habilitado"
          checked={webhookEnabled}
          onChange={(value) => setWebhookEnabled(value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          variant="neonGradient"
        >
          {saving ? (
            <Loader2 size={15} className="mr-2 animate-spin" aria-hidden />
          ) : (
            <Save size={15} aria-hidden="true" className="mr-2" />
          )}
          {savedAt ? 'Salvo!' : saving ? 'Salvando…' : 'Salvar Alterações'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 hover:text-red-300"
        >
          <Trash2 size={15} aria-hidden="true" className="mr-2" />
          Excluir Bot
        </Button>
      </div>
    </div>
  )
}
