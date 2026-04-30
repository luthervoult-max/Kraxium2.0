import { Bell, Menu, Search } from 'lucide-react'

interface HomeTopbarProps {
  eyebrow?: string
  title: string
  titleHighlight?: string
  isMobile: boolean
  onMenuClick: () => void
  userEmail?: string | null
}

export default function HomeTopbar({
  eyebrow,
  title,
  titleHighlight,
  isMobile,
  onMenuClick,
  userEmail,
}: HomeTopbarProps) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'K'
  const fullTitle = titleHighlight ? `${title} ${titleHighlight}` : title

  return (
    <div
      className="flex shrink-0 items-center gap-3.5 border-b border-white/[0.05] px-5"
      style={{ height: 58, background: '#0a0a14' }}
    >
      {isMobile && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-slate-400"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Menu size={16} aria-hidden />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {!isMobile ? (
          <div>
            {eyebrow && (
              <div
                className="mb-px text-[9px] font-semibold uppercase"
                style={{ letterSpacing: '0.18em', color: '#a78bfa' }}
              >
                {eyebrow}
              </div>
            )}
            <div
              className="font-display text-[17px] font-bold text-white"
              style={{ letterSpacing: '-0.01em' }}
            >
              {title}
              {titleHighlight && <span className="text-[#a78bfa]"> {titleHighlight}</span>}
            </div>
          </div>
        ) : (
          <div className="font-display truncate text-base font-bold text-white">{fullTitle}</div>
        )}
      </div>

      {!isMobile && (
        <div
          className="flex items-center gap-2 rounded-[9px] px-3.5 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            minWidth: 200,
          }}
        >
          <Search size={13} aria-hidden className="text-slate-700" />
          <span className="text-xs text-slate-700">Buscar...</span>
        </div>
      )}

      <button
        type="button"
        aria-label="Notificações"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Bell size={16} aria-hidden className="text-slate-500" />
        <span
          className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full"
          style={{ background: '#8b5cf6', boxShadow: '0 0 6px rgba(139,92,246,0.8)' }}
        />
      </button>

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}
        title={userEmail ?? undefined}
      >
        {initial}
      </div>
    </div>
  )
}
