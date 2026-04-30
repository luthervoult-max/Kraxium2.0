import { useEffect, useState } from 'react'
import { Bot as BotIcon, CreditCard, GitBranch, Users } from 'lucide-react'
import { listBots, type Bot as BotRow } from '@/lib/api/bots'
import type { Page } from '@/lib/pages'

type Accent = 'purple' | 'green' | 'pink' | 'gold'

interface KpiCardData {
  label: string
  value: string
  sub: string
  pct: number
  accent: Accent
}

const KPIS: KpiCardData[] = [
  { label: 'Receita Total', value: 'R$12.4K', sub: 'meta: R$17.2K · 30 dias', pct: 72, accent: 'purple' },
  { label: 'PAGOS 7D', value: '847', sub: 'meta: 1.2K · confirmados', pct: 70, accent: 'green' },
  { label: 'VISITAS 7D', value: '3.2K', sub: 'meta: 8K · acessos', pct: 40, accent: 'pink' },
  { label: 'Conversão', value: '26.4%', sub: 'visits → pagamentos', pct: 26, accent: 'gold' },
]

const ACCENT_PALETTE: Record<
  Accent,
  { c: string; label: string; border: string; track: string; glow?: string }
> = {
  purple: {
    c: '#8b5cf6',
    label: '#a78bfa',
    border: 'rgba(139,92,246,0.3)',
    track: 'rgba(139,92,246,0.12)',
  },
  green: {
    c: '#00ff88',
    label: '#00ff88',
    border: 'rgba(0,255,136,0.2)',
    track: 'rgba(0,255,136,0.1)',
    glow: '0 0 8px rgba(0,255,136,0.3)',
  },
  pink: {
    c: '#ec4899',
    label: '#f472b6',
    border: 'rgba(236,72,153,0.2)',
    track: 'rgba(236,72,153,0.1)',
  },
  gold: {
    c: '#f59e0b',
    label: '#f59e0b',
    border: 'rgba(245,158,11,0.2)',
    track: 'rgba(245,158,11,0.1)',
  },
}

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function KpiCard({ label, value, sub, pct, accent }: KpiCardData) {
  const a = ACCENT_PALETTE[accent]
  const radius = 27
  const circ = 2 * Math.PI * radius
  const dash = (pct / 100) * circ
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[14px] p-4"
      style={{ background: '#16213e', border: `1px solid ${a.border}` }}
    >
      <div
        className="text-[9px] font-semibold uppercase"
        style={{ letterSpacing: '0.15em', color: a.label }}
      >
        {label}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg width="64" height="64" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r={radius} fill="none" stroke={a.track} strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke={a.c}
              strokeWidth="7"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{ filter: a.glow ? `drop-shadow(0 0 3px ${a.c})` : 'none' }}
            />
          </svg>
          <div
            className="font-display absolute inset-0 flex items-center justify-center text-xs font-bold"
            style={{ color: a.c }}
          >
            {pct}%
          </div>
        </div>
        <div className="flex-1">
          <div
            className="font-display text-[22px] font-bold leading-tight text-white"
            style={{ lineHeight: 1.1 }}
          >
            {value}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">{sub}</div>
        </div>
      </div>
    </div>
  )
}

interface BotCardProps {
  bot: BotRow
  onManage: () => void
}

function BotCard({ bot, onManage }: BotCardProps) {
  const isActive = Boolean(bot.telegram_token)
  const statusColor = isActive ? '#00ff88' : '#f59e0b'
  const statusText = isActive ? 'Ativo' : 'Pausado'
  const handle = bot.telegram_token ? `@${bot.name.toLowerCase().replace(/\s+/g, '_')}` : 'sem token'
  const usersCount = 0
  const msgsCount = 0
  const flowName = bot.webhook_enabled ? 'Webhook ativo' : 'Sem fluxo conectado'

  return (
    <div
      className="rounded-[14px] p-4 transition-colors"
      style={{
        background: '#16213e',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
      }}
      onClick={onManage}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onManage()
        }
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px]"
          style={{
            background: 'linear-gradient(135deg,#1a1a2e,#2e1065)',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <BotIcon size={18} aria-hidden className="text-[#a78bfa]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 truncate text-sm font-semibold text-white">{bot.name}</div>
          <div className="font-mono text-[10px] text-slate-600">{handle}</div>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px]"
          style={{
            border: `1px solid ${statusColor}44`,
            background: `${statusColor}11`,
          }}
        >
          <div
            className="h-[5px] w-[5px] rounded-full"
            style={{
              background: statusColor,
              boxShadow: isActive ? `0 0 5px ${statusColor}` : 'none',
            }}
          />
          <span
            className="text-[9px] font-semibold uppercase"
            style={{ letterSpacing: '0.1em', color: statusColor }}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div
          className="rounded-[9px] px-2.5 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="mb-0.5 text-[9px] uppercase text-slate-600"
            style={{ letterSpacing: '0.1em' }}
          >
            Usuários
          </div>
          <div className="font-display text-[17px] font-bold" style={{ color: '#a78bfa' }}>
            {formatNumber(usersCount)}
          </div>
        </div>
        <div
          className="rounded-[9px] px-2.5 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="mb-0.5 text-[9px] uppercase text-slate-600"
            style={{ letterSpacing: '0.1em' }}
          >
            Mensagens
          </div>
          <div className="font-display text-[17px] font-bold" style={{ color: '#00ff88' }}>
            {formatNumber(msgsCount)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          Fluxo: <span className="font-medium text-slate-400">{flowName}</span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onManage()
          }}
          className="rounded-[7px] px-3.5 py-1 text-[11px] font-semibold"
          style={{
            border: '1px solid rgba(139,92,246,0.35)',
            background: 'rgba(139,92,246,0.1)',
            color: '#a78bfa',
          }}
        >
          Gerenciar →
        </button>
      </div>
    </div>
  )
}

interface DashboardHomeProps {
  isMobile: boolean
  onNavigate: (page: Page) => void
  onSelectBot: (botId: string) => void
}

export default function DashboardHome({ isMobile, onNavigate, onSelectBot }: DashboardHomeProps) {
  const [bots, setBots] = useState<BotRow[]>([])
  const [loadingBots, setLoadingBots] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoadingBots(true)
    listBots()
      .then((data) => {
        if (!active) return
        setBots(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar bots')
      })
      .finally(() => {
        if (active) setLoadingBots(false)
      })
    return () => {
      active = false
    }
  }, [])

  const today = new Date().toLocaleDateString('pt-BR')

  const quickActions: Array<{
    label: string
    color: string
    icon: typeof GitBranch
    onClick: () => void
  }> = [
    { label: 'Novo Fluxo', color: '#8b5cf6', icon: GitBranch, onClick: () => onNavigate('flowIntel') },
    { label: 'Adicionar Bot', color: '#10b981', icon: BotIcon, onClick: () => onNavigate('bots') },
    { label: 'Gerar PIX', color: '#f59e0b', icon: CreditCard, onClick: () => onNavigate('flows') },
    { label: 'Ver Usuários', color: '#ec4899', icon: Users, onClick: () => onNavigate('users') },
  ]

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: isMobile ? '16px 14px' : '22px 28px' }}
    >
      <div
        className="mb-5 flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
        style={{
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.22)',
        }}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: '#8b5cf6', boxShadow: '0 0 8px rgba(139,92,246,0.8)' }}
        />
        <span className="text-xs font-medium text-[#a78bfa]">
          Sistema operando normalmente · Última sincronização agora
        </span>
        {!isMobile && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-700">{today}</span>
        )}
      </div>

      <div
        className="mb-3 text-[9px] font-semibold uppercase"
        style={{ letterSpacing: '0.15em', color: '#a78bfa' }}
      >
        Métricas Principais
      </div>
      <div
        className="mb-6 grid gap-2.5"
        style={{
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
        }}
      >
        {KPIS.map((m) => (
          <KpiCard key={m.label} {...m} />
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div
          className="text-[9px] font-semibold uppercase"
          style={{ letterSpacing: '0.15em', color: '#a78bfa' }}
        >
          Meus Bots ({bots.length})
        </div>
        <button
          type="button"
          onClick={() => onNavigate('bots')}
          className="border-0 bg-transparent text-xs font-semibold"
          style={{ color: '#8b5cf6' }}
        >
          Ver todos →
        </button>
      </div>

      {error && (
        <div
          className="mb-3 rounded-[10px] px-3.5 py-2.5 text-xs"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {loadingBots ? (
        <div className="text-xs text-slate-500">Carregando bots…</div>
      ) : bots.length === 0 ? (
        <div
          className="rounded-[14px] p-5 text-center text-sm text-slate-400"
          style={{
            background: '#16213e',
            border: '1px dashed rgba(139,92,246,0.25)',
          }}
        >
          Nenhum bot cadastrado ainda.{' '}
          <button
            type="button"
            onClick={() => onNavigate('bots')}
            className="border-0 bg-transparent font-semibold"
            style={{ color: '#a78bfa' }}
          >
            Criar o primeiro
          </button>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)' }}
        >
          {bots.slice(0, 6).map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onManage={() => {
                onSelectBot(bot.id)
                onNavigate('bots')
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <div
          className="mb-3 text-[9px] font-semibold uppercase"
          style={{ letterSpacing: '0.15em', color: '#a78bfa' }}
        >
          Ações Rápidas
        </div>
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          }}
        >
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-4 transition-all"
                style={{
                  background: '#16213e',
                  border: `1px solid ${a.color}28`,
                  color: a.color,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${a.color}66`
                  e.currentTarget.style.background = `${a.color}11`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${a.color}28`
                  e.currentTarget.style.background = '#16213e'
                }}
              >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    background: `${a.color}18`,
                    border: `1px solid ${a.color}33`,
                  }}
                >
                  <Icon size={16} aria-hidden color={a.color} />
                </div>
                <span
                  className="text-left text-xs font-semibold leading-snug text-slate-200"
                >
                  {a.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
