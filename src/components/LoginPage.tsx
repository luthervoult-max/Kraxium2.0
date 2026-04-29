import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar login.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep-900 p-6">
      <div className="w-full max-w-md rounded-[34px] border border-white/8 bg-[#11141d] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-blue/15 text-neon-blue">
            <Sparkles size={20} aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neon-blue">
              Kraxium
            </p>
            <h1 className="text-xl font-bold text-white">Flow Intel Dashboard</h1>
          </div>
        </div>

        <p className="mb-8 text-sm leading-7 text-gray-400">
          Entre com sua conta Google para acessar seus bots e fluxos.
        </p>

        <Button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="h-12 w-full rounded-full border border-white/10 bg-white text-[13px] font-semibold uppercase tracking-[0.18em] text-[#16181f] hover:bg-white/95 disabled:opacity-60"
        >
          <GoogleIcon className="mr-3 h-5 w-5" />
          {loading ? 'Redirecionando…' : 'Continuar com Google'}
        </Button>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <p className="mt-6 text-[11px] leading-5 text-gray-500">
          Ao continuar, você concorda em conectar sua conta Google ao Kraxium para autenticação.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
