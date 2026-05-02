import type { ReactNode } from 'react'
import { Search, Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  eyebrow?: string
  title: string
  titleHighlight?: string
  right?: ReactNode
}

export default function Header({ eyebrow, title, titleHighlight, right }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-deep-900/80 px-6 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {title}
            {titleHighlight && <span className="text-neon-purple"> {titleHighlight}</span>}
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto xl:justify-end">
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <Input
              placeholder="Buscar bots, usuarios..."
              aria-label="Buscar"
              className="w-full border-white/5 bg-deep-700 pl-9 text-white placeholder:text-gray-500"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            aria-label="Notificacoes"
            className="relative border-white/5 text-gray-400 hover:text-neon-purple"
          >
            <Bell size={18} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-neon-magenta" />
          </Button>

          {right ?? (
            <Button variant="neonOutline">
              <Plus size={16} aria-hidden="true" className="mr-2" />
              Novo Bot
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
