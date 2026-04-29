import { useState } from 'react'
import {
  Activity,
  BarChart3,
  Bot,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Page } from '@/lib/pages'

interface NavItem {
  id: string
  icon: LucideIcon
  label: string
  navigable: boolean
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard', navigable: true },
  { id: 'flowIntel', icon: GitBranch, label: 'Flow Intel', navigable: true },
  { id: 'bots', icon: Bot, label: 'Bots', navigable: true },
  { id: 'users', icon: Users, label: 'Users', navigable: true },
  { id: 'analytics', icon: Activity, label: 'Analytics', navigable: false },
]

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden flex-col border-r border-white/5 bg-deep-800/80 py-6 backdrop-blur-md transition-[width,padding] duration-300 lg:flex',
        isCollapsed ? 'w-20 px-3' : 'w-64 px-4',
      )}
    >
      <div
        className={cn(
          'mb-8 flex items-center gap-3',
          isCollapsed ? 'flex-col justify-center' : 'justify-between',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-3', isCollapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue to-neon-magenta shadow-[0_0_8px_rgba(0,212,255,0.5)]">
            <span aria-label="Kraxium" role="img" className="text-lg text-white">
              👽
            </span>
          </div>
          {!isCollapsed && (
            <span className="font-display truncate text-lg font-bold tracking-wider text-white">
              KRAXI<span className="text-neon-blue">UM</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-neon-blue/35 hover:text-neon-blue"
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        className={cn(
          'mb-8 flex items-center gap-2 rounded-full border border-neon-green/30 bg-neon-green/10 py-1.5',
          isCollapsed ? 'mx-auto w-10 justify-center px-0' : 'w-fit px-2',
        )}
        title="System online"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon-green" />
        </span>
        {!isCollapsed && (
          <span className="text-xs font-medium tracking-wider text-neon-green">SYSTEM ONLINE</span>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = item.id === currentPage
          const isDisabled = !item.navigable

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              disabled={isDisabled}
              onClick={() => item.navigable && onNavigate(item.id as Page)}
              title={isDisabled ? `${item.label} - em breve` : item.label}
              className={cn(
                'flex w-full items-center rounded-lg border px-3 py-3 text-sm font-medium transition-all',
                isCollapsed ? 'justify-center gap-0' : 'gap-3',
                isActive
                  ? 'border-neon-blue/30 bg-neon-blue/15 text-neon-blue shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                  : isDisabled
                    ? 'cursor-not-allowed border-transparent text-gray-600'
                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon size={18} aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {isDisabled && !isCollapsed && (
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-gray-700">
                  em breve
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div
        className={cn(
          'border-t border-white/5 pt-4 text-xs text-gray-500',
          isCollapsed && 'text-center',
        )}
      >
        {isCollapsed ? 'v1' : 'v1.0.0 · kraxium.io'}
      </div>
    </aside>
  )
}
