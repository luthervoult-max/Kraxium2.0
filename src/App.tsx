import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import HomeSidebar from '@/components/home/HomeSidebar'
import HomeTopbar from '@/components/home/HomeTopbar'
import DashboardHome from '@/components/home/DashboardHome'
import AlertsPage from '@/components/AlertsPage'
import BotsPage from '@/components/BotsPage'
import FlowIntel from '@/components/FlowIntel'
import FlowsPage from '@/components/FlowsPage'
import LoginPage from '@/components/LoginPage'
import UsersPage from '@/components/UsersPage'
import AnalyticsPage from '@/components/AnalyticsPage'
import PaymentsPage from '@/components/PaymentsPage'
import PaymentRadarPage from '@/components/PaymentRadarPage'
import RemarketingPage from '@/components/RemarketingPage'
import WebhooksPage from '@/components/WebhooksPage'
import AccountPage from '@/components/AccountPage'
import { Button } from '@/components/ui/button'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { listBots, type Bot as BotRow } from '@/lib/api/bots'
import { getAlertCount } from '@/lib/api/alerts'
import { getCurrentProfile, type AccountProfile } from '@/lib/api/profile'
import type { FlowWithBot, ImportedFlowDraft } from '@/lib/api/flows'
import type { Page } from '@/lib/pages'

const pageConfig: Record<Page, { eyebrow: string; title: string; titleHighlight?: string }> = {
  dashboard: { eyebrow: 'Dashboard', title: 'Pulse da', titleHighlight: 'Operação' },
  flows: { eyebrow: 'Automação', title: 'Meus', titleHighlight: 'Fluxos' },
  bots: { eyebrow: 'Sistema', title: 'Configurações' },
  flowIntel: { eyebrow: 'Automação', title: 'Flow Builder' },
  users: { eyebrow: 'CRM', title: 'Base de', titleHighlight: 'Clientes' },
  analytics: { eyebrow: 'Métricas', title: 'Performance' },
  webhooks: { eyebrow: 'Integrações', title: 'Webhooks' },
  payments: { eyebrow: 'Integrações', title: 'Pagamentos' },
  paymentRadar: { eyebrow: 'Integrações', title: 'Radar de', titleHighlight: 'Pagamentos' },
  remarketing: { eyebrow: 'Automação', title: 'Remarketing' },
  alerts: { eyebrow: 'Sistema', title: 'Alertas', titleHighlight: 'Importantes' },
  account: { eyebrow: 'Configurações', title: 'Minha', titleHighlight: 'Conta' },
}

type PendingLeaveAction =
  | { type: 'page'; page: Page }
  | { type: 'signOut' }
  | { type: 'createFlow' }
  | { type: 'editFlow'; flowId: string; botId: string | null }
  | { type: 'importFlow'; draft: ImportedFlowDraft }

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < breakpoint,
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

function Shell() {
  const { user, loading, signOut } = useAuth()
  const isMobile = useIsMobile()
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [importedFlowDraft, setImportedFlowDraft] = useState<ImportedFlowDraft | null>(null)
  const [flowDirty, setFlowDirty] = useState(false)
  const [pendingLeaveAction, setPendingLeaveAction] = useState<PendingLeaveAction | null>(null)
  const [flowSaveHandler, setFlowSaveHandler] = useState<(() => Promise<boolean>) | null>(null)
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bots, setBots] = useState<BotRow[]>([])
  const [alertCount, setAlertCount] = useState(0)
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    setAccountProfile(null)
    getCurrentProfile()
      .then((profile) => {
        if (active) setAccountProfile(profile)
      })
      .catch(() => {
        if (active) setAccountProfile(null)
      })
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    listBots()
      .then((data) => {
        if (active) setBots(data)
      })
      .catch(() => {
        if (active) setBots([])
      })
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    const fetchCount = () => {
      getAlertCount()
        .then((count) => {
          if (active) setAlertCount(count)
        })
        .catch(() => {
          if (active) setAlertCount(0)
        })
    }
    fetchCount()
    const interval = setInterval(fetchCount, 5 * 60 * 1000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [user])

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
      setImportedFlowDraft(null)
      setPage('flowIntel')
      return
    }
    if (action.type === 'editFlow') {
      setSelectedFlowId(action.flowId)
      setSelectedBotId(action.botId)
      setImportedFlowDraft(null)
      setPage('flowIntel')
      return
    }
    if (action.type === 'importFlow') {
      setSelectedFlowId(null)
      setSelectedBotId(null)
      setImportedFlowDraft(action.draft)
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
    setImportedFlowDraft(null)
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
    setImportedFlowDraft(null)
    setPage('flowIntel')
  }

  function requestImportFlow(draft: ImportedFlowDraft) {
    if (page === 'flowIntel' && flowDirty) {
      setPendingLeaveAction({ type: 'importFlow', draft })
      return
    }
    setFlowDirty(false)
    setSelectedFlowId(null)
    setSelectedBotId(null)
    setImportedFlowDraft(draft)
    setPage('flowIntel')
  }

  function handleBotSelection(botId: string | null) {
    setSelectedBotId(botId)
    setSelectedFlowId(null)
    setImportedFlowDraft(null)
  }

  function handleFlowSaved(flow: { id: string; bot_id: string | null }) {
    setSelectedFlowId(flow.id)
    setSelectedBotId(flow.bot_id)
    setImportedFlowDraft(null)
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

  function requestCreateBot() {
    requestNavigate('bots')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070710] text-gray-500">
        <Loader2 size={20} className="mr-3 animate-spin" aria-hidden />
        Verificando sessão…
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const { eyebrow, title, titleHighlight } = pageConfig[page]
  const selectedBot = bots.find((b) => b.id === selectedBotId) ?? null

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#070710', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
    >
      <HomeSidebar
        currentPage={page}
        onNavigate={requestNavigate}
        onSignOut={requestSignOut}
        onCreateBot={requestCreateBot}
        selectedBot={selectedBot}
        isMobile={isMobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        alertCount={alertCount}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <HomeTopbar
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen(true)}
          userEmail={user.email}
          profile={accountProfile}
          onAccountClick={() => requestNavigate('account')}
        />

        {page === 'dashboard' && (
          <DashboardHome
            isMobile={isMobile}
            onNavigate={requestNavigate}
            onSelectBot={handleBotSelection}
          />
        )}

        {page === 'flowIntel' && (
          <div className="flex-1 overflow-y-auto">
            <FlowIntel
              botId={selectedBotId}
              flowId={selectedFlowId}
              importedDraft={importedFlowDraft}
              onDirtyChange={setFlowDirty}
              onRegisterSave={registerFlowSaveHandler}
              onDraftCreated={() => {
                setSelectedFlowId(null)
                setSelectedBotId(null)
                setImportedFlowDraft(null)
              }}
              onSaved={handleFlowSaved}
            />
          </div>
        )}
        {page === 'flows' && (
          <div className="flex-1 overflow-y-auto">
            <FlowsPage
              onCreateFlow={requestCreateFlow}
              onEditFlow={requestEditFlow}
              onImportFlow={requestImportFlow}
            />
          </div>
        )}
        {page === 'bots' && (
          <div className="flex-1 overflow-y-auto">
            <BotsPage selectedBotId={selectedBotId} onSelectBot={handleBotSelection} />
          </div>
        )}
        {page === 'users' && (
          <div className="flex-1 overflow-y-auto">
            <UsersPage />
          </div>
        )}
        {page === 'analytics' && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsPage />
          </div>
        )}
        {page === 'payments' && (
          <div className="flex-1 overflow-y-auto">
            <PaymentsPage />
          </div>
        )}
        {page === 'webhooks' && (
          <div className="flex-1 overflow-y-auto">
            <WebhooksPage />
          </div>
        )}
        {page === 'paymentRadar' && (
          <div className="flex-1 overflow-y-auto">
            <PaymentRadarPage />
          </div>
        )}
        {page === 'remarketing' && (
          <div className="flex-1 overflow-y-auto">
            <RemarketingPage />
          </div>
        )}
        {page === 'alerts' && (
          <div className="flex-1 overflow-y-auto">
            <AlertsPage onNavigate={requestNavigate} />
          </div>
        )}
        {page === 'account' && (
          <div className="flex-1 overflow-y-auto">
            <AccountPage
              profile={accountProfile}
              userEmail={user.email}
              lastSignInAt={user.last_sign_in_at}
              onProfileChange={setAccountProfile}
            />
          </div>
        )}
      </div>

      {pendingLeaveAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
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
                  Se voce sair agora, o canvas sera resetado e os blocos que ainda nao foram
                  salvos serao perdidos.
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
