import { useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatusBar from '@/components/StatusBar'
import MetricCard from '@/components/MetricCard'
import FlowCard from '@/components/FlowCard'
import RevenueChart from '@/components/RevenueChart'
import BotsPage from '@/components/BotsPage'
import FlowIntel from '@/components/FlowIntel'
import LoginPage from '@/components/LoginPage'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { generateRevenueSeries, generateSparkline } from '@/lib/mockData'
import type { Page } from '@/lib/pages'

const metrics = [
  {
    title: 'Receita Total',
    value: 'R$ 42.8k',
    change: '+12.5%',
    color: '#00d4ff',
    trend: generateSparkline(1, 7, 5800, 1200),
  },
  {
    title: 'Conversao',
    value: '24.6%',
    change: '+3.2%',
    color: '#39ff14',
    trend: generateSparkline(2, 7, 24, 4),
  },
  {
    title: 'Usuarios Ativos',
    value: '3,842',
    change: '+18%',
    color: '#ff2a9d',
    trend: generateSparkline(3, 7, 480, 90),
  },
]

const flows = [
  { name: 'Funil Principal', status: 'active' as const, progress: 78, tags: ['/START', 'onboard', 'checkout'], leads: '2.4k' },
  { name: 'Reengajamento', status: 'active' as const, progress: 45, tags: ['/recover', 'offer'], leads: '846' },
  { name: 'Upsell VIP', status: 'paused' as const, progress: 23, tags: ['/upgrade', 'premium'], leads: '312' },
  { name: 'Abandono de Carrinho', status: 'active' as const, progress: 91, tags: ['/abandoned', 'urgent'], leads: '1.2k' },
]

const revenueSeries = generateRevenueSeries(90)

const pageConfig: Record<Page, { eyebrow: string; title: string; titleHighlight?: string }> = {
  dashboard: { eyebrow: '', title: 'Pulse da', titleHighlight: 'Operacao' },
  bots: { eyebrow: 'SISTEMA', title: 'Configuracoes' },
  flowIntel: { eyebrow: 'ANALISE', title: 'Flow Intel' },
}

const mobilePages: Array<{ id: Page; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'flowIntel', label: 'Flow Intel' },
  { id: 'bots', label: 'Bots' },
]

function Shell() {
  const { user, loading, signOut } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-900 text-gray-500">
        <Loader2 size={20} className="mr-3 animate-spin" aria-hidden />
        Verificando sessão…
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const { eyebrow, title, titleHighlight } = pageConfig[page]

  return (
    <div className="min-h-screen bg-deep-900 lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Header
          eyebrow={eyebrow || undefined}
          title={title}
          titleHighlight={titleHighlight}
          right={
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden md:block">{user.email}</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => void signOut()}
                className="h-9 rounded-full border-white/10 bg-white/5 px-3 text-xs text-gray-200 hover:bg-white/10"
              >
                <LogOut size={13} className="mr-2" aria-hidden />
                Sair
              </Button>
            </div>
          }
        />

        <div className="px-6 pt-4 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mobilePages.map((item) => {
              const isActive = item.id === page
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={
                    isActive
                      ? 'shrink-0 rounded-full border border-neon-blue/30 bg-neon-blue/15 px-3 py-2 text-xs font-semibold text-neon-blue'
                      : 'shrink-0 rounded-full border border-white/10 bg-deep-800/60 px-3 py-2 text-xs font-semibold text-gray-400'
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {page === 'dashboard' && (
          <main className="space-y-8 p-6">
            <StatusBar />

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-neon-blue" />
                Metricas Principais
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {metrics.map((metric) => (
                  <MetricCard key={metric.title} {...metric} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-neon-magenta" />
                Performance ao Longo do Tempo
              </h2>
              <RevenueChart data={revenueSeries} />
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-neon-green" />
                Flow Intelligence
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {flows.map((flow) => (
                  <FlowCard key={flow.name} {...flow} />
                ))}
              </div>
            </section>
          </main>
        )}

        {page === 'flowIntel' && <FlowIntel botId={selectedBotId} />}
        {page === 'bots' && (
          <BotsPage selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
