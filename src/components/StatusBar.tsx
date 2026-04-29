import { Cloud, CheckCircle } from 'lucide-react'

export default function StatusBar() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-deep-800/50 border border-white/5 rounded-lg text-xs text-gray-400">
      <span className="flex items-center gap-1.5">
        <Cloud size={14} aria-hidden="true" className="text-neon-blue" />
        Sistema sincronizado
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle size={14} aria-hidden="true" className="text-neon-green" />
        Última atualização: 2 min atrás
      </span>
      <span className="text-gray-600" aria-hidden="true">
        |
      </span>
      <span>
        Webhooks: <span className="text-neon-green font-medium">ativos</span>
      </span>
    </div>
  )
}
