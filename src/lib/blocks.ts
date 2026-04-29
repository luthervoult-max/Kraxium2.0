export type Category = 'sistema' | 'comunicacao' | 'logica' | 'pagamento' | 'entrega'

export interface BlockDef {
  id: string
  code: string
  category: Category
  title: string
  description: string
}

export const categoryMeta: Record<Category, { label: string; color: string; rgb: string }> = {
  sistema: { label: 'Sistema', color: '#00d4ff', rgb: '0, 212, 255' },
  comunicacao: { label: 'Comunicação', color: '#ff2a9d', rgb: '255, 42, 157' },
  logica: { label: 'Lógica & Fluxo', color: '#ff9d2a', rgb: '255, 157, 42' },
  pagamento: { label: 'Pagamento', color: '#39ff14', rgb: '57, 255, 20' },
  entrega: { label: 'Entrega', color: '#b44dff', rgb: '180, 77, 255' },
}

export const blocks: BlockDef[] = [
  // SISTEMA
  { id: 'disparo', code: 'TR', category: 'sistema', title: 'Disparo', description: 'Entrada inicial por comando, gatilho público ou evento.' },
  { id: 'conversao', code: 'CV', category: 'sistema', title: 'Conversão', description: 'Marca fim do fluxo, compra ou ativação.' },

  // COMUNICACAO
  { id: 'mensagem', code: 'MS', category: 'comunicacao', title: 'Mensagem', description: 'Mensagem rica com título e corpo.' },
  { id: 'texto', code: 'TX', category: 'comunicacao', title: 'Texto', description: 'Texto simples para enviar no chat.' },
  { id: 'imagem', code: 'IM', category: 'comunicacao', title: 'Imagem', description: 'Envia imagem por URL com legenda.' },
  { id: 'video', code: 'VD', category: 'comunicacao', title: 'Vídeo', description: 'Envia vídeo por URL.' },
  { id: 'audio', code: 'AU', category: 'comunicacao', title: 'Áudio', description: 'Envia áudio por URL.' },
  { id: 'arquivo', code: 'AR', category: 'comunicacao', title: 'Arquivo', description: 'Entrega arquivo ou documento hospedado.' },
  { id: 'video-nota', code: 'VN', category: 'comunicacao', title: 'Vídeo Nota', description: 'Envia vídeo nota no Telegram.' },
  { id: 'digitando', code: 'TP', category: 'comunicacao', title: 'Digitando', description: 'Mostra ação de digitação antes da próxima etapa.' },
  { id: 'botoes', code: 'BT', category: 'comunicacao', title: 'Botões', description: 'Mensagem com escolhas e saídas por botão.' },
  { id: 'input-usuario', code: 'IN', category: 'comunicacao', title: 'Input do Usuário', description: 'Captura resposta e salva em variável.' },

  // LOGICA & FLUXO
  { id: 'localizacao', code: 'LC', category: 'logica', title: 'Localização', description: 'Pede localização ou envia um ponto fixo.' },
  { id: 'atraso', code: 'DL', category: 'logica', title: 'Atraso', description: 'Espera fixa em segundos, minutos ou dias.' },
  { id: 'smart-delay', code: 'SD', category: 'logica', title: 'Smart Delay', description: 'Respeita janela horária por timezone com atraso extra.' },
  { id: 'gatilho', code: 'GT', category: 'logica', title: 'Gatilho', description: 'Avalia variável, resposta ou estado.' },
  { id: 'randomizer', code: 'RD', category: 'logica', title: 'Randomizer', description: 'Escolhe rota por peso configurado.' },
  { id: 'go-to', code: 'GO', category: 'logica', title: 'Go To', description: 'Salta explicitamente para outro nodo.' },

  // PAGAMENTO
  { id: 'gerar-pix', code: 'PX', category: 'pagamento', title: 'Gerar PIX', description: 'Reserva o bloco PIX para a stack futura.' },
  { id: 'gerar-pagamento', code: 'PG', category: 'pagamento', title: 'Gerar Pagamento', description: 'Cria checkout usando priceId do bloco.' },
  { id: 'order-bump', code: 'OB', category: 'pagamento', title: 'Order Bump', description: 'Oferta extra com aceite, recusa e timeout.' },
  { id: 'upsell', code: 'UP', category: 'pagamento', title: 'Upsell', description: 'Oferta de upgrade após a compra principal.' },
  { id: 'downsell', code: 'DS', category: 'pagamento', title: 'Downsell', description: 'Oferta alternativa quando o usuário recusa o upsell.' },

  // ENTREGA
  { id: 'entrega-produto', code: 'EP', category: 'entrega', title: 'Entrega do Produto', description: 'Libera acesso ao produto digital após pagamento confirmado.' },
  { id: 'acesso-grupo', code: 'AG', category: 'entrega', title: 'Acesso a Grupo', description: 'Gera link de convite para grupo ou canal exclusivo.' },
]

export const blocksByCategory = (Object.keys(categoryMeta) as Category[]).map((cat) => ({
  category: cat,
  meta: categoryMeta[cat],
  blocks: blocks.filter((b) => b.category === cat),
}))

export const blockById = (id: string) => blocks.find((b) => b.id === id)
