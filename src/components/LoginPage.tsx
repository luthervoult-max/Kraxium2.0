import { useState } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'
import loginLogoUrl from '../../logo.png'

type LoginMode = 'password' | 'google'
type AuthMode = 'signIn' | 'signUp'

export default function LoginPage() {
  const { resetPassword, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signIn')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingMode, setLoadingMode] = useState<LoginMode | null>(null)

  async function handlePasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim() || !password) {
      setError('Informe seu e-mail e senha para entrar.')
      return
    }

    setLoadingMode('password')
    try {
      if (authMode === 'signUp') {
        await signUpWithPassword(email.trim(), password)
        setNotice('Conta criada. Verifique seu e-mail se a confirmacao estiver ativada.')
        setAuthMode('signIn')
        setPassword('')
        setLoadingMode(null)
        return
      }

      await signInWithPassword(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar com e-mail e senha.')
      setLoadingMode(null)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setNotice(null)
    setLoadingMode('google')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar login com Google.')
      setLoadingMode(null)
    }
  }

  async function handleResetPassword() {
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError('Informe seu e-mail antes de recuperar a senha.')
      return
    }

    try {
      await resetPassword(email.trim())
      setNotice('Enviamos as instrucoes de recuperacao para o seu e-mail.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar recuperacao de senha.')
    }
  }

  const isLoading = loadingMode !== null

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep-900 px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(180,77,255,0.16)_1px,transparent_1px)] bg-[length:32px_32px] opacity-45" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(180,77,255,0.14),transparent_34%,rgba(57,255,20,0.1)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-magenta/60 to-neon-green/60" />

      <section className="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-[20px] border border-neon-purple/30 bg-deep-800/90 px-9 pb-8 pt-9 shadow-[0_0_0_1px_rgba(180,77,255,0.12),0_24px_80px_rgba(0,0,0,0.72),0_0_42px_rgba(57,255,20,0.08)] backdrop-blur-2xl max-[480px]:px-6 max-[480px]:py-7">
        <div className="mb-7 flex flex-col items-center">
          <img
            src={loginLogoUrl}
            alt="KRAXIUM BOT"
            className="mb-[-4px] h-[220px] w-[220px] object-contain drop-shadow-[0_0_28px_rgba(180,77,255,0.58)] max-[480px]:h-[118px] max-[480px]:w-[118px]"
          />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-neon-green/65">
            KRAXIUM BOT
          </p>
        </div>

        <div className="mb-7 text-center">
          <h1 className="font-display text-[22px] font-bold tracking-normal text-white">
            {authMode === 'signIn' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {authMode === 'signIn' ? 'Acesse sua conta KRAXIUM BOT' : 'Comece a usar o KRAXIUM BOT'}
          </p>
        </div>

        <div className="mb-7 h-px bg-gradient-to-r from-transparent via-neon-purple/35 to-transparent" />

        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <LoginField
            id="login-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            autoComplete="email"
            icon={<Mail size={15} aria-hidden="true" />}
          />

          <LoginField
            id="login-password"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="********"
            autoComplete="current-password"
            icon={<LockKeyhole size={15} aria-hidden="true" />}
            action={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-gray-500 transition-colors hover:text-neon-magenta"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            }
          />

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-3.5 w-3.5 accent-[#39ff14]"
              />
              Lembrar-me
            </label>
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              className="text-xs font-medium text-neon-green transition-colors hover:text-neon-magenta"
            >
              Esqueci a senha
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="relative h-[46px] w-full overflow-hidden rounded-[10px] border-0 bg-[linear-gradient(135deg,#ff2a9d_0%,#b44dff_48%,#39ff14_100%)] text-sm font-black tracking-[0.08em] text-deep-900 shadow-[0_4px_24px_rgba(180,77,255,0.35),0_0_24px_rgba(57,255,20,0.14)] transition-all hover:-translate-y-px hover:shadow-[0_4px_30px_rgba(180,77,255,0.55),0_0_30px_rgba(57,255,20,0.2)] disabled:translate-y-0 disabled:opacity-70"
          >
            {loadingMode === 'password' ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
                Autenticando...
              </>
            ) : (
              authMode === 'signIn' ? 'Entrar na Plataforma' : 'Criar conta gratis'
            )}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] text-gray-600">
          <span className="h-px flex-1 bg-neon-purple/15" />
          ou continue com
          <span className="h-px flex-1 bg-neon-green/15" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleGoogleSignIn()}
          disabled={isLoading}
          className="h-[44px] w-full rounded-[10px] border-neon-blue/25 bg-deep-900/70 text-[13px] font-semibold text-gray-200 transition-all hover:border-neon-green/40 hover:bg-white/10"
        >
          {loadingMode === 'google' ? (
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Entrar com Google
        </Button>

        {error && (
          <div className="mt-4 rounded-[14px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-[14px] border border-neon-green/25 bg-neon-green/10 px-4 py-3 text-sm leading-6 text-neon-green">
            {notice}
          </div>
        )}

        <div className="mt-5 border-t border-neon-purple/15 pt-4 text-center text-xs text-gray-500">
          {authMode === 'signIn' ? 'Nao tem conta?' : 'Ja tem conta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setAuthMode((mode) => (mode === 'signIn' ? 'signUp' : 'signIn'))
              setError(null)
              setNotice(null)
            }}
            className="font-semibold text-neon-purple transition-colors hover:text-neon-green"
          >
            {authMode === 'signIn' ? 'Criar conta gratis' : 'Entrar agora'}
          </button>
        </div>
      </section>
    </main>
  )
}

interface LoginFieldProps {
  id: string
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete: string
  icon: React.ReactNode
  action?: React.ReactNode
}

function LoginField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  icon,
  action,
}: LoginFieldProps) {
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-neon-purple"
      >
        {label}
      </label>
      <span className="relative block">
        <span className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-neon-blue/65">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'h-[43px] w-full rounded-[10px] border border-white/10 bg-deep-900/85 px-10 text-sm text-white outline-none transition-[border-color,box-shadow] placeholder:text-gray-700 focus:border-neon-green/60 focus:shadow-[0_0_0_3px_rgba(57,255,20,0.12)]',
            action && 'pr-11',
          )}
        />
        {action}
      </span>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
