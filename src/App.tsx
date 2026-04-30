import { useCallback, useEffect, useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatusBar from '@/components/StatusBar'
import MetricCard from '@/components/MetricCard'
import FlowCard from '@/components/FlowCard'
import RevenueChart from '@/components/RevenueChart'
import BotsPage from '@/components/BotsPage'
import FlowIntel from '@/components/FlowIntel'
import FlowsPage from '@/components/FlowsPage'
import LoginPage from '@/components/LoginPage'
import UsersPage from '@/components/UsersPage'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import type { FlowWithBot } from '@/lib/api/flows'
import { generateRevenueSeries, generateSparkline } from '@/lib/mockData'
import type { Page } from '@/lib/pages'

const metrics = [
  {
    title: 'Receita Total',
    value: 'R$ 42.8k',
    change: '+12.5%',
    color: '#b44dff',
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
  flows: { eyebrow: 'AUTOMACAO', title: 'Meus', titleHighlight: 'Fluxos' },
  bots: { eyebrow: 'SISTEMA', title: 'Configuracoes' },
  flowIntel: { eyebrow: 'ANALISE', title: 'Flow Intel' },
  users: { eyebrow: 'CRM', title: 'Base de', titleHighlight: 'Clientes' },
}

const mobilePages: Array<{ id: Page; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'flows', label: 'Fluxos' },
  { id: 'flowIntel', label: 'Flow Intel' },
  { id: 'bots', label: 'Bots' },
  { id: 'users', label: 'Users' },
]

type PendingLeaveAction =
  | { type: 'page'; page: Page }
  | { type: 'signOut' }
  | { type: 'createFlow' }
  | { type: 'editFlow'; flowId: string; botId: string | null }

function Shell() {
  const { user, loading, signOut } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [flowDirty, setFlowDirty] = useState(false)
  const [pendingLeaveAction, setPendingLeaveAction] = useState<PendingLeaveAction | null>(null)
  const [flowSaveHandler, setFlowSaveHandler] = useState<(() => Promise<boolean>) | null>(null)
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false)

  useEffect(() => {
    if (!flowDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [flowDirty])

  const registerFlowSaveHandler = useCallback((handler: (() => Promise<boolean>) | null) => {
    setFlowSaveHandler(() => handler)
  }, [])

  function requestNavigate(nextPage: Page) {
    if (nextPage === page) return
    if (page === 'flowIntel' && flowDirty) {
      setPendingLeaveAction({ type: 'page', page: nextPage })
      return
    }
    setPage(nextPage)
  }

  async function finishLeave(action: PendingLeaveAction) {
    setFlowDirty(false)
    setPendingLeaveAction(null)
    if (action.type === 'page') {
      setPage(action.page)
      return
    }
    if (action.type === 'createFlow') {
      setSelectedFlowId(null)
      setSelectedBotId(null)
      setPage('flowIntel')
      return
    }
    if (action.type === 'editFlow') {
      setSelectedFlowId(action.flowId)
      setSelectedBotId(action.botId)
      setPage('flowIntel')
      return
    }
    await signOut()
  }

  function requestCreateFlow() {
    if (page === 'flowIntel' && flowDirty) {
      setPendingLeaveAction({ type: 'createFlow' })
      return
    }
    setFlowDirty(false)
    setSelectedFlowId(null)
    setSelectedBotId(null)
    setPage('flowIntel')
  }

  function requestEditFlow(flow: FlowWithBot) {
    if (page === 'flowIntel' && flowDirty) {
      setPendingLeaveAction({ type: 'editFlow', flowId: flow.id, botId: flow.bot_id })
      return
    }
    setFlowDirty(false)
    setSelectedFlowId(flow.id)
    setSelectedBotId(flow.bot_id)
    setPage('flowIntel')
  }

  function handleBotSelection(botId: string | null) {
    setSelectedBotId(botId)
    setSelectedFlowId(null)
  }

  function handleFlowSaved(flow: { id: string; bot_id: string | null }) {
    setSelectedFlowId(flow.id)
    setSelectedBotId(flow.bot_id)
  }

  async function handleSaveAndLeave() {
    if (!pendingLeaveAction || !flowSaveHandler) return
    const action = pendingLeaveAction
    setPendingLeaveAction(null)
    setSavingBeforeLeave(true)
    try {
      const saved = await flowSaveHandler()
      if (saved) {
        await finishLeave(action)
      } else {
        setPendingLeaveAction(action)
      }
    } finally {
      setSavingBeforeLeave(false)
    }
  }

  function requestSignOut() {
    if (page === 'flowIntel' && flowDirty) {
      setPendingLeaveAction({ type: 'signOut' })
      return
    }
    void signOut()
  }

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
      <Sidebar currentPage={page} onNavigate={requestNavigate} />
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
                onClick={requestSignOut}
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
                  onClick={() => requestNavigate(item.id)}
                  className={
                    isActive
                      ? 'shrink-0 rounded-full border border-neon-purple/30 bg-neon-purple/15 px-3 py-2 text-xs font-semibold text-neon-purple'
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
                <span className="h-2 w-2 rounded-full bg-neon-purple" />
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

        {page === 'flowIntel' && (
          <FlowIntel
            botId={selectedBotId}
            flowId={selectedFlowId}
            onDirtyChange={setFlowDirty}
            onRegisterSave={registerFlowSaveHandler}
            onDraftCreated={() => {
              setSelectedFlowId(null)
              setSelectedBotId(null)
            }}
            onSaved={handleFlowSaved}
          />
        )}
        {page === 'flows' && (
          <FlowsPage onCreateFlow={requestCreateFlow} onEditFlow={requestEditFlow} />
        )}
        {page === 'bots' && (
          <BotsPage selectedBotId={selectedBotId} onSelectBot={handleBotSelection} />
        )}
        {page === 'users' && <UsersPage />}
      </div>

      {pendingLeaveAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-flow-title"
            className="w-full max-w-lg rounded-[28px] border border-neon-purple/25 bg-[#11141d] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-5 flex items-start gap-4">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-neon-orange shadow-[0_0_18px_rgba(255,177,0,0.8)]" />
              <div>
                <h2 id="unsaved-flow-title" className="text-xl font-bold text-white">
                  Salvar fluxo antes de sair?
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Se voce sair agora, o canvas sera resetado e os blocos que ainda nao foram salvos serao perdidos.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void finishLeave(pendingLeaveAction)}
                disabled={savingBeforeLeave}
                className="rounded-full border-white/10 bg-white/5 px-5 text-gray-200 hover:bg-white/10"
              >
                Sair sem salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingLeaveAction(null)}
                disabled={savingBeforeLeave}
                className="rounded-full border-white/10 bg-transparent px-5 text-gray-300 hover:bg-white/5"
              >
                Continuar no canvas
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveAndLeave()}
                disabled={!flowSaveHandler || savingBeforeLeave}
                className="rounded-full border border-neon-purple/70 bg-[linear-gradient(90deg,#b44dff,#ff2a9d)] px-5 font-bold text-white shadow-[0_0_18px_rgba(180,77,255,0.25)] hover:opacity-95 disabled:opacity-60"
              >
                {savingBeforeLeave ? 'Salvando...' : 'Salvar e sair'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
