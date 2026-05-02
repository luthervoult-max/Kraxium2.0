import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ElementType, type ReactNode } from 'react'
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Shield,
  Sparkles,
  Trophy,
  Upload,
  User,
  X,
} from 'lucide-react'
import {
  getCurrentProfile,
  removeAccountAvatar,
  setRankingVisible,
  updateAccountPassword,
  updateAccountProfile,
  uploadAccountAvatar,
  type AccountProfile,
} from '@/lib/api/profile'
import { getAnalyticsDashboard, type AnalyticsOverview } from '@/lib/api/analytics'

interface AccountPageProps {
  profile: AccountProfile | null
  userEmail?: string | null
  lastSignInAt?: string | null
  onProfileChange: (profile: AccountProfile) => void
}

const emptyOverview: AnalyticsOverview = {
  interactions: 0,
  starts: 0,
  revenueGeneratedCents: 0,
  revenueConfirmedCents: 0,
  averageTicketCents: 0,
  startRate: 0,
  leadSaleRate: 0,
  approvalRate: 0,
  generatedPayments: 0,
  confirmedPayments: 0,
}

export default function AccountPage({
  profile,
  userEmail,
  lastSignInAt,
  onProfileChange,
}: AccountPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [localProfile, setLocalProfile] = useState<AccountProfile | null>(profile)
  const [overview, setOverview] = useState<AnalyticsOverview>(emptyOverview)
  const [loading, setLoading] = useState(!profile)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalProfile(profile)
  }, [profile])

  useEffect(() => {
    if (localProfile) return
    let active = true
    setLoading(true)
    getCurrentProfile()
      .then((nextProfile) => {
        if (!active) return
        setLocalProfile(nextProfile)
        onProfileChange(nextProfile)
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, 'Não foi possível carregar sua conta.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [localProfile, onProfileChange])

  useEffect(() => {
    let active = true
    setMetricsLoading(true)
    getAnalyticsDashboard({ timeRange: 'month' })
      .then((dashboard) => {
        if (active) setOverview(dashboard.overview)
      })
      .catch(() => {
        if (active) setOverview(emptyOverview)
      })
      .finally(() => {
        if (active) setMetricsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const displayName = localProfile?.fullName || localProfile?.nickname || userEmail || 'Sua conta'
  const nickname = localProfile?.nickname || 'Sem apelido'
  const avatarInitial = (localProfile?.nickname || localProfile?.fullName || userEmail || 'K')
    .charAt(0)
    .toUpperCase()

  const profileForm = useMemo(
    () => ({
      fullName: localProfile?.fullName ?? '',
      nickname: localProfile?.nickname ?? '',
      phone: localProfile?.phone ?? '',
      referralCode: localProfile?.referralCode ?? '',
    }),
    [localProfile],
  )

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const nextProfile = await uploadAccountAvatar(file)
      setLocalProfile(nextProfile)
      onProfileChange(nextProfile)
      setMessage('Foto da conta atualizada.')
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar a imagem.'))
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleRemoveAvatar() {
    if (!localProfile) return
    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const nextProfile = await removeAccountAvatar(localProfile.avatarUrl)
      setLocalProfile(nextProfile)
      onProfileChange(nextProfile)
      setMessage('Foto removida da conta.')
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover a imagem.'))
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleRankingToggle() {
    if (!localProfile) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const nextProfile = await setRankingVisible(!localProfile.rankingVisible)
      setLocalProfile(nextProfile)
      onProfileChange(nextProfile)
      setMessage(nextProfile.rankingVisible ? 'Ranking ativado.' : 'Você foi ocultado do ranking.')
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível alterar o ranking.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#070710] text-slate-500">
        <Loader2 className="mr-3 animate-spin" size={20} />
        Carregando conta...
      </main>
    )
  }

  return (
    <main className="min-h-full overflow-x-hidden bg-[#070710] px-5 py-7 text-white lg:px-8">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-neon-purple">
              Configurações
            </p>
            <h1 className="font-display text-4xl font-black tracking-normal text-white lg:text-5xl">
              Minha <span className="text-neon-purple">Conta</span>
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-400">
              Gerencie seus dados reais, sua foto de perfil e preferências da conta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatusPill icon={Shield} label="Dados protegidos por RLS" />
            <StatusPill icon={CheckCircle2} label="Perfil conectado ao Supabase" />
          </div>
        </header>

        {(message || error) && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-bold ${
              error
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(340px,470px),1fr]">
          <div className="space-y-6">
            <ProfileCard
              profile={localProfile}
              displayName={displayName}
              nickname={nickname}
              initial={avatarInitial}
              userEmail={userEmail}
              lastSignInAt={lastSignInAt}
              avatarBusy={avatarBusy}
              onPickAvatar={() => fileInputRef.current?.click()}
              onRemoveAvatar={handleRemoveAvatar}
            />

            <QuickMetrics overview={overview} loading={metricsLoading} />

            <SecurityPanel onChangePassword={() => setPasswordOpen(true)} />

            <RankingPanel
              visible={localProfile?.rankingVisible ?? true}
              saving={saving}
              onToggle={handleRankingToggle}
            />
          </div>

          <div className="space-y-6">
            <AwardsPanel />
            <PersonalInfoPanel
              profile={localProfile}
              userEmail={userEmail}
              onEdit={() => setEditOpen(true)}
            />
          </div>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {editOpen && (
        <EditProfileModal
          initialValues={profileForm}
          onClose={() => setEditOpen(false)}
          onSave={async (values) => {
            setSaving(true)
            setError(null)
            setMessage(null)
            try {
              const nextProfile = await updateAccountProfile(values)
              setLocalProfile(nextProfile)
              onProfileChange(nextProfile)
              setMessage('Informações da conta atualizadas.')
              setEditOpen(false)
            } catch (err) {
              setError(errorMessage(err, 'Não foi possível salvar suas informações.'))
            } finally {
              setSaving(false)
            }
          }}
          saving={saving}
        />
      )}

      {passwordOpen && (
        <PasswordModal
          onClose={() => setPasswordOpen(false)}
          onSave={async (password) => {
            setSaving(true)
            setError(null)
            setMessage(null)
            try {
              await updateAccountPassword(password)
              setMessage('Senha atualizada com sucesso.')
              setPasswordOpen(false)
            } catch (err) {
              setError(errorMessage(err, 'Não foi possível alterar sua senha.'))
            } finally {
              setSaving(false)
            }
          }}
          saving={saving}
        />
      )}
    </main>
  )
}

function ProfileCard({
  profile,
  displayName,
  nickname,
  initial,
  userEmail,
  lastSignInAt,
  avatarBusy,
  onPickAvatar,
  onRemoveAvatar,
}: {
  profile: AccountProfile | null
  displayName: string
  nickname: string
  initial: string
  userEmail?: string | null
  lastSignInAt?: string | null
  avatarBusy: boolean
  onPickAvatar: () => void
  onRemoveAvatar: () => void
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.22),transparent_35%),linear-gradient(135deg,rgba(139,92,246,0.13),rgba(8,9,11,0.98))] p-7">
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-neon-purple/30 bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-4xl font-black text-white shadow-[0_0_32px_rgba(139,92,246,0.35)]">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              onClick={onPickAvatar}
              disabled={avatarBusy}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#151722] text-neon-purple shadow-lg transition hover:bg-neon-purple hover:text-white disabled:opacity-60"
              aria-label="Trocar foto"
            >
              {avatarBusy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="break-words text-2xl font-black text-white">{displayName}</h2>
            <p className="mt-1 truncate text-sm text-slate-400">{userEmail || profile?.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MiniBadge icon={User} label={nickname} />
              <MiniBadge icon={Trophy} label="Premiações em breve" tone="orange" />
            </div>
          </div>
        </div>

        <div className="my-6 h-px bg-white/10" />

        <div className="grid gap-3 text-sm">
          <InfoRow label="Membro desde" value={formatDate(profile?.createdAt)} />
          <InfoRow label="Último acesso" value={formatDate(lastSignInAt)} />
          <InfoRow label="ID da conta" value={profile?.id ? `${profile.id.slice(0, 8)}...` : 'Carregando'} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPickAvatar}
            disabled={avatarBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-neon-purple/30 bg-neon-purple/15 px-4 py-2 text-sm font-black text-white transition hover:bg-neon-purple/25 disabled:opacity-60"
          >
            <Upload size={15} />
            Trocar foto
          </button>
          {profile?.avatarUrl && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              disabled={avatarBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
            >
              <X size={15} />
              Remover
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}

function QuickMetrics({ overview, loading }: { overview: AnalyticsOverview; loading: boolean }) {
  const items = [
    { label: 'Starts no mês', value: formatNumber(overview.starts), icon: Sparkles },
    { label: 'Vendas pagas', value: formatNumber(overview.confirmedPayments), icon: CheckCircle2 },
    { label: 'Receita confirmada', value: formatCurrency(overview.revenueConfirmedCents), icon: Trophy },
    { label: 'Conversão', value: `${overview.leadSaleRate}%`, icon: Eye },
  ]

  return (
    <Panel>
      <PanelTitle icon={Sparkles} title="Resumo real da conta" subtitle="Dados do mês atual" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Icon size={17} className="mb-3 text-neon-purple" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {loading ? <Loader2 size={18} className="animate-spin text-slate-500" /> : item.value}
              </p>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function SecurityPanel({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <Panel>
      <PanelTitle icon={Shield} title="Segurança" subtitle="Controle de acesso da sua conta" />
      <div className="mt-5 space-y-3">
        <ActionRow
          icon={Shield}
          title="Autenticação 2FA"
          subtitle="Proteção adicional da conta"
          badge="Em Breve"
          disabled
        />
        <ActionRow
          icon={KeyRound}
          title="Senha"
          subtitle="Altere sua senha de acesso"
          button="Alterar senha"
          tone="red"
          onClick={onChangePassword}
        />
      </div>
    </Panel>
  )
}

function RankingPanel({
  visible,
  saving,
  onToggle,
}: {
  visible: boolean
  saving: boolean
  onToggle: () => void
}) {
  return (
    <Panel>
      <PanelTitle icon={visible ? Eye : EyeOff} title="Privacidade no ranking" subtitle="Controle como sua conta aparece" />
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-white">{visible ? 'Visível no ranking' : 'Oculto do ranking'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {visible
                ? 'Sua conta pode aparecer nos rankings públicos do dashboard.'
                : 'Sua conta não aparece nos rankings públicos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={saving}
            className="rounded-xl border border-neon-purple/30 bg-neon-purple/20 px-5 py-3 text-sm font-black text-white transition hover:bg-neon-purple/30 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
    </Panel>
  )
}

function AwardsPanel() {
  return (
    <Panel>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PanelTitle icon={Trophy} title="Premiações" subtitle="Programa de conquistas da plataforma" />
        <span className="w-fit rounded-full border border-neon-purple/30 bg-neon-purple/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-neon-purple">
          Em Breve
        </span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {['Ranking de vendedores', 'Metas de faturamento', 'Benefícios por nível'].map((title) => (
          <div
            key={title}
            className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_55%),rgba(255,255,255,0.03)] p-6"
          >
            <Lock size={20} className="text-neon-purple" />
            <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Esta área será liberada em uma próxima etapa com regras reais e progresso calculado.
            </p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function PersonalInfoPanel({
  profile,
  userEmail,
  onEdit,
}: {
  profile: AccountProfile | null
  userEmail?: string | null
  onEdit: () => void
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={User} title="Informações pessoais" subtitle="Dados principais da conta" />
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15"
        >
          <Pencil size={16} />
          Editar
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ReadOnlyField icon={User} label="Nome completo" value={profile?.fullName || 'Não informado'} />
        <ReadOnlyField icon={IdCard} label="Apelido" value={profile?.nickname || 'Não informado'} />
        <ReadOnlyField icon={Mail} label="Email" value={userEmail || profile?.email || 'Não informado'} />
        <ReadOnlyField icon={Phone} label="Telefone" value={profile?.phone || 'Não informado'} />
        <div className="lg:col-span-2">
          <ReadOnlyField
            icon={Trophy}
            label="Código de indicação"
            value={profile?.referralCode || 'Não informado'}
          />
        </div>
      </div>
    </Panel>
  )
}

function EditProfileModal({
  initialValues,
  saving,
  onClose,
  onSave,
}: {
  initialValues: { fullName: string; nickname: string; phone: string; referralCode: string }
  saving: boolean
  onClose: () => void
  onSave: (values: { fullName: string; nickname: string; phone: string; referralCode: string }) => Promise<void>
}) {
  const [values, setValues] = useState(initialValues)

  return (
    <Modal title="Editar informações" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(values)
        }}
      >
        <EditableField
          label="Nome completo"
          value={values.fullName}
          onChange={(fullName) => setValues((prev) => ({ ...prev, fullName }))}
        />
        <EditableField
          label="Apelido"
          value={values.nickname}
          onChange={(nickname) => setValues((prev) => ({ ...prev, nickname }))}
          placeholder="Como você quer ser chamado"
        />
        <EditableField
          label="Telefone"
          value={values.phone}
          onChange={(phone) => setValues((prev) => ({ ...prev, phone }))}
          placeholder="(00) 00000-0000"
        />
        <EditableField
          label="Código de indicação"
          value={values.referralCode}
          onChange={(referralCode) => setValues((prev) => ({ ...prev, referralCode }))}
          placeholder="Opcional"
        />
        <ModalActions saving={saving} onClose={onClose} saveLabel="Salvar perfil" />
      </form>
    </Modal>
  )
}

function PasswordModal({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean
  onClose: () => void
  onSave: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  return (
    <Modal title="Alterar senha" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setLocalError(null)
          if (password !== confirm) {
            setLocalError('As senhas não conferem.')
            return
          }
          void onSave(password)
        }}
      >
        {localError && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {localError}
          </div>
        )}
        <EditableField
          label="Nova senha"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo de 8 caracteres"
        />
        <EditableField
          label="Confirmar senha"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Digite novamente"
        />
        <ModalActions saving={saving} onClose={onClose} saveLabel="Alterar senha" />
      </form>
    </Modal>
  )
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-surface-2 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] ${className}`}
    >
      {children}
    </section>
  )
}

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neon-purple/25 bg-neon-purple/15 text-neon-purple">
        <Icon size={19} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: string
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-200">{label}</p>
      <div className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-lg font-bold text-white">
        <Icon size={20} className="shrink-0 text-slate-500" />
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  )
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-neon-purple/60 focus:bg-white/[0.08]"
      />
    </label>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-surface-3 p-6 shadow-[0_30px_110px_rgba(0,0,0,0.7)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({
  saving,
  saveLabel,
  onClose,
}: {
  saving: boolean
  saveLabel: string
  onClose: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-slate-300 hover:bg-white/10 disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl border border-neon-purple/50 bg-[linear-gradient(135deg,#5b1fa6,#b44dff)] px-5 py-3 text-sm font-black text-white shadow-[0_0_22px_rgba(180,77,255,0.28)] disabled:opacity-60"
      >
        {saving ? 'Salvando...' : saveLabel}
      </button>
    </div>
  )
}

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  badge,
  button,
  disabled,
  tone = 'purple',
  onClick,
}: {
  icon: ElementType
  title: string
  subtitle: string
  badge?: string
  button?: string
  disabled?: boolean
  tone?: 'purple' | 'red'
  onClick?: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            tone === 'red' ? 'bg-red-500/15 text-red-300' : 'bg-neon-purple/15 text-neon-purple'
          }`}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-white">{title}</p>
            {badge && (
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      {button && (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black text-white transition disabled:opacity-50 ${
            tone === 'red'
              ? 'bg-red-500 hover:bg-red-400'
              : 'bg-neon-purple hover:bg-neon-purple/85'
          }`}
        >
          {button}
        </button>
      )}
    </div>
  )
}

function StatusPill({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
      <Icon size={14} className="text-neon-purple" />
      {label}
    </span>
  )
}

function MiniBadge({
  icon: Icon,
  label,
  tone = 'purple',
}: {
  icon: ElementType
  label: string
  tone?: 'purple' | 'orange'
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
        tone === 'orange'
          ? 'border-orange-400/25 bg-orange-400/10 text-orange-200'
          : 'border-neon-purple/25 bg-neon-purple/15 text-neon-purple'
      }`}
    >
      <Icon size={13} />
      {label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="truncate text-right font-black text-white">{value}</span>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
