import { useEffect, useState } from 'react'
import {
  BarChart3,
  Bot,
  ChevronDown,
  Code2,
  CreditCard,
  GitBranch,
  Home,
  LayoutGrid,
  Link2,
  ListChecks,
  LogOut,
  Package,
  Plus,
  Settings,
  Shield,
  Target,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import logoUrl from '../../../logo.png'
import type { Page } from '@/lib/pages'
import type { Bot as BotRow } from '@/lib/api/bots'

interface MenuItem {
  label: string
  icon: LucideIcon
  page?: Page
  disabled?: boolean
}

interface MenuSection {
  id: 'menu' | 'auto' | 'integ' | 'config'
  label: string
  icon: LucideIcon
  items: MenuItem[]
}

const SECTIONS: MenuSection[] = [
  {
    id: 'menu',
    label: 'Menu',
    icon: Home,
    items: [
      { label: 'Dashboard', icon: LayoutGrid, page: 'dashboard' },
      { label: 'Meus Bots', icon: Bot, page: 'bots' },
      { label: 'Métricas', icon: BarChart3, page: 'analytics' },
      { label: 'Usuários', icon: Users, page: 'users' },
    ],
  },
  {
    id: 'auto',
    label: 'Automações',
    icon: Zap,
    items: [
      { label: 'Flow Builder', icon: GitBranch, page: 'flowIntel' },
      { label: 'Sequências', icon: ListChecks, disabled: true },
      { label: 'Gatilhos', icon: Target, disabled: true },
    ],
  },
  {
    id: 'integ',
    label: 'Integrações',
    icon: Link2,
    items: [
      { label: 'Webhooks', icon: Link2, disabled: true },
      { label: 'APIs', icon: Code2, disabled: true },
      { label: 'Pagamentos', icon: CreditCard, disabled: true },
    ],
  },
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    items: [
      { label: 'Conta', icon: User, disabled: true },
      { label: 'Planos', icon: Package, disabled: true },
      { label: 'Segurança', icon: Shield, disabled: true },
    ],
  },
]

interface HomeSidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  onSignOut: () => void
  onCreateBot: () => void
  selectedBot: BotRow | null
  isMobile: boolean
  open: boolean
  onClose: () => void
}

export default function HomeSidebar({
  currentPage,
  onNavigate,
  onSignOut,
  onCreateBot,
  selectedBot,
  isMobile,
  open,
  onClose,
}: HomeSidebarProps) {
  const [expanded, setExpanded] = useState<Record<MenuSection['id'], boolean>>({
    menu: true,
    auto: false,
    integ: false,
    config: false,
  })

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev }
      for (const section of SECTIONS) {
        if (section.items.some((item) => item.page === currentPage)) {
          next[section.id] = true
        }
      }
      return next
    })
  }, [currentPage])

  const toggle = (id: MenuSection['id']) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || !item.page) return
    onNavigate(item.page)
    if (isMobile) onClose()
  }

  return (
    <>
      {isMobile && open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className="flex flex-col overflow-y-auto border-r border-white/[0.06] bg-[#0d0d1a]"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (open ? 0 : -290) : 0,
          top: 0,
          bottom: 0,
          width: 272,
          flexShrink: 0,
          zIndex: 50,
          transition: isMobile ? 'left 280ms cubic-bezier(0.4,0,0.2,1)' : 'none',
          height: '100%',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-[18px] pb-4 pt-5">
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="Kraxium"
              className="h-[42px] w-[42px] object-contain"
              style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.5))' }}
            />
            <div>
              <div
                className="font-display text-base font-black"
                style={{
                  letterSpacing: 2,
                  background: 'linear-gradient(135deg,#a78bfa,#8b5cf6,#00ff88)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                KRAXIUM
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-slate-700">
                BOT PLATFORM
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="flex items-center text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="shrink-0 px-4 py-3.5">
          <button
            type="button"
            onClick={onCreateBot}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold tracking-wide text-white transition-all"
            style={{
              background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 28px rgba(139,92,246,0.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,0.4)'
            }}
          >
            <Plus size={16} aria-hidden />
            Criar novo bot
          </button>
        </div>

        <div className="shrink-0 px-4 pb-3.5">
          <div
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
            style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px]"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
            >
              <Bot size={14} aria-hidden className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-200">
                {selectedBot?.name ?? 'Nenhum bot selecionado'}
              </div>
              <div className="font-mono text-[10px] text-slate-600">
                {selectedBot ? `bot · ${selectedBot.id.slice(0, 8)}` : 'Selecione na aba Bots'}
              </div>
            </div>
            <ChevronDown size={12} aria-hidden className="text-slate-500" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5">
          {SECTIONS.map((section) => {
            const SectionIcon = section.icon
            const isOpen = expanded[section.id]
            return (
              <div key={section.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="flex w-full items-center gap-2.5 rounded-[10px] border-0 px-2.5 py-2.5 text-left text-[13px] font-semibold transition-all"
                  style={{
                    background: isOpen ? 'rgba(139,92,246,0.08)' : 'transparent',
                    color: isOpen ? '#a78bfa' : '#64748b',
                  }}
                  onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = 'transparent'
                  }}
                  aria-expanded={isOpen}
                >
                  <SectionIcon size={16} aria-hidden color={isOpen ? '#a78bfa' : '#4b5563'} />
                  <span className="flex-1">{section.label}</span>
                  <ChevronDown
                    size={13}
                    aria-hidden
                    color={isOpen ? '#a78bfa' : '#4b5563'}
                    style={{
                      transition: 'transform 200ms',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>

                {isOpen && (
                  <div className="mb-1 mt-0.5 pl-3.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = !item.disabled && item.page === currentPage
                      const baseColor = isActive ? '#a78bfa' : item.disabled ? '#334155' : '#64748b'
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleItemClick(item)}
                          disabled={item.disabled}
                          className="flex w-full items-center gap-2.5 rounded-[9px] border-0 px-2.5 py-2 text-left text-[13px] transition-all"
                          style={{
                            background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                            color: baseColor,
                            fontWeight: isActive ? 600 : 400,
                            boxShadow: isActive
                              ? 'inset 0 0 0 1px rgba(139,92,246,0.25)'
                              : 'none',
                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                            opacity: item.disabled ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive && !item.disabled) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                              e.currentTarget.style.color = '#94a3b8'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive && !item.disabled) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#64748b'
                            }
                          }}
                        >
                          <ItemIcon size={14} aria-hidden color={baseColor} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && (
                            <span
                              className="h-[5px] w-[5px] rounded-full"
                              style={{
                                background: '#8b5cf6',
                                boxShadow: '0 0 6px #8b5cf6',
                              }}
                            />
                          )}
                          {item.disabled && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-700">
                              em breve
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 px-4 py-3">
          <div
            className="rounded-2xl px-4 py-3.5"
            style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-base">◆</span>
              <span className="text-sm font-bold text-slate-200">Faturamento</span>
            </div>
            <div className="mb-1.5 flex justify-between">
              <span className="text-[11px] text-slate-500">R$ 0</span>
              <span className="text-[11px] text-slate-400">R$ 10.000</span>
            </div>
            <div
              className="mb-2 h-[5px] overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: '12%',
                  background: 'linear-gradient(90deg,#8b5cf6,#00ff88)',
                  boxShadow: '0 0 6px rgba(0,255,136,0.4)',
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Próximo Nível:</span>
              <span className="text-[11px] font-bold" style={{ color: '#00ff88' }}>
                Seller Bronze
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.05] px-4 pb-5 pt-2">
          <button
            type="button"
            className="mb-0.5 flex w-full items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-2.5 text-left text-[13px] text-slate-500"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = '#94a3b8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            <Shield size={15} aria-hidden color="#4b5563" />
            Suporte
            <ChevronDown
              size={12}
              aria-hidden
              color="#334155"
              style={{ marginLeft: 'auto', transform: 'rotate(-90deg)' }}
            />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-2.5 text-left text-[13px]"
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={15} aria-hidden color="#ef4444" />
            Sair da Conta
          </button>
        </div>
      </aside>
    </>
  )
}
