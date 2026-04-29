import { BarChart3, Bot, Users, GitBranch, Activity, type LucideIcon } from 'lucide-react'
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
  { id: 'users', icon: Users, label: 'Users', navigable: false },
  { id: 'analytics', icon: Activity, label: 'Analytics', navigable: false },
]

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r border-white/5 bg-deep-800/80 px-4 py-6 backdrop-blur-md lg:flex">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-magenta flex items-center justify-center shadow-[0_0_8px_rgba(0,212,255,0.5)]">
          <span aria-label="Kraxium" role="img" className="text-white text-lg">
            👽
          </span>
        </div>
        <span className="font-display font-bold text-lg text-white tracking-wider">
          KRAXI<span className="text-neon-blue">UM</span>
        </span>
      </div>

      <div className="flex items-center gap-2 mb-8 px-2 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 w-fit">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green" />
        </span>
        <span className="text-xs font-medium text-neon-green tracking-wider">SYSTEM ONLINE</span>
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
              title={isDisabled ? 'Em breve' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-neon-blue/15 text-neon-blue border border-neon-blue/30 shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                  : isDisabled
                  ? 'text-gray-600 border border-transparent cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent',
              )}
            >
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
              {isDisabled && (
                <span className="ml-auto text-[9px] uppercase tracking-wider text-gray-700 font-semibold">
                  em breve
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="pt-4 border-t border-white/5 text-xs text-gray-500">v1.0.0 · kraxium.io</div>
    </aside>
  )
}
