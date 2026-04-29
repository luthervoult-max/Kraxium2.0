import { MessageSquare, Key, Globe, CheckCircle, User, Bot, Lock } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: MessageSquare,
    title: 'Criar o bot no Telegram',
    description: 'Abra o Telegram, busque por @BotFather e envie o comando /newbot. Escolha um nome e username para o seu bot.',
  },
  {
    number: '02',
    icon: Key,
    title: 'Copiar o Token',
    description: 'O BotFather vai gerar um token único no formato 1234567890:AAFxxx. Copie e cole no campo "Token do Telegram".',
  },
  {
    number: '03',
    icon: Globe,
    title: 'Definir a Webhook URL',
    description: 'Informe a URL pública HTTPS do seu servidor. Ex: https://meusite.com/webhook. O Telegram vai enviar eventos para esse endereço.',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Ativar e Salvar',
    description: 'Habilite o Webhook e as Notificações nas Preferências e clique em Salvar Alterações. Seu bot estará online.',
  },
]

const requirements = [
  { icon: User, text: 'Conta Telegram ativa' },
  { icon: Bot, text: 'Acesso ao @BotFather' },
  { icon: Lock, text: 'URL pública com HTTPS' },
]

export default function BotTutorial() {
  return (
    <aside className="sticky top-6 bg-deep-800/40 border border-neon-blue/10 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neon-blue bg-neon-blue/10 border border-neon-blue/20 rounded px-2 py-1">
          Como conectar
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Siga os passos abaixo para conectar seu bot do Telegram ao Kraxium.
      </p>

      <ol className="flex flex-col gap-4">
        {steps.map((step) => (
          <li key={step.number} className="flex gap-3">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-7 h-7 rounded-full bg-neon-blue/10 border border-neon-blue/25 flex items-center justify-center">
                <step.icon size={13} className="text-neon-blue" aria-hidden="true" />
              </div>
              <span className="text-[9px] font-bold text-neon-blue/40 font-mono">{step.number}</span>
            </div>
            <div className="pt-0.5">
              <p className="text-xs font-semibold text-white mb-1">{step.title}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-white/5 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Você vai precisar de
        </p>
        <ul className="flex flex-col gap-2">
          {requirements.map((req) => (
            <li key={req.text} className="flex items-center gap-2 text-xs text-gray-400">
              <req.icon size={13} className="text-neon-blue shrink-0" aria-hidden="true" />
              {req.text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
