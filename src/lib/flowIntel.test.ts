import { describe, expect, it } from 'vitest'
import { analyzeFlow, parseFlowInput, parseLogsInput } from '@/lib/flowIntel'

const flowJson = JSON.stringify(
  {
    nodes: [
      { id: 'start', type: 'TR', label: 'Start', content: 'Entrada do fluxo.' },
      { id: 'pitch', data: { code: 'TX', title: 'Pitch', body: 'Conheca a oferta com calma e sem CTA nenhum por enquanto.' } },
      { id: 'go_fast', type: 'GO', label: 'Atalho', content: 'Pula para a proxima etapa.' },
      { id: 'offer', type: 'TX', label: 'Oferta', content: 'Esse texto esta longo demais para Telegram e continua sem uma chamada de acao clara mesmo depois de explicar varios detalhes do produto e do metodo.' },
      { id: 'long_1', type: 'TX', label: 'Passo 1', content: 'Contexto adicional.' },
      { id: 'long_2', type: 'TX', label: 'Passo 2', content: 'Contexto adicional.' },
      { id: 'long_3', type: 'TX', label: 'Passo 3', content: 'Contexto adicional.' },
      { id: 'long_4', type: 'TX', label: 'Passo 4', content: 'Contexto adicional.' },
      { id: 'long_5', type: 'TX', label: 'Passo 5', content: 'Contexto adicional.' },
      { id: 'cv', type: 'CV', label: 'Conversao', content: 'Fim.' },
      { id: 'isolated', type: 'TX', label: 'Isolado', content: 'No solto.' },
    ],
    edges: [
      { source: 'start', target: 'pitch' },
      { from: 'pitch', to: 'go_fast' },
      { source: 'go_fast', target: 'offer' },
      { source: 'offer', target: 'long_1' },
      { source: 'long_1', target: 'long_2' },
      { source: 'long_2', target: 'long_3' },
      { source: 'long_3', target: 'long_4' },
      { source: 'long_4', target: 'long_5' },
      { source: 'long_5', target: 'cv' },
    ],
  },
  null,
  2,
)

const logsJson = JSON.stringify(
  [
    { userId: 'u1', type: 'node_view', currentNodeId: 'start', timestamp: '2026-04-27T12:00:00.000Z' },
    { userId: 'u1', type: 'node_view', currentNodeId: 'pitch', timestamp: '2026-04-27T12:00:01.000Z' },
    { userId: 'u1', type: 'node_view', currentNodeId: 'go_fast', timestamp: '2026-04-27T12:00:02.000Z' },
    { userId: 'u1', type: 'node_view', currentNodeId: 'offer', timestamp: '2026-04-27T12:00:03.000Z' },
    { userId: 'u1', event: 'user_message', message: 'quanto custa?', nodeId: 'offer', timestamp: '2026-04-27T12:00:04.000Z' },

    { sessionId: 's2', type: 'node_view', meta: { nodeId: 'start' }, createdAt: '2026-04-27T12:01:00.000Z' },
    { sessionId: 's2', type: 'node_view', meta: { nodeId: 'pitch' }, createdAt: '2026-04-27T12:01:01.000Z' },
    { sessionId: 's2', type: 'node_view', meta: { nodeId: 'go_fast' }, createdAt: '2026-04-27T12:01:02.000Z' },
    { sessionId: 's2', type: 'node_view', meta: { nodeId: 'offer' }, createdAt: '2026-04-27T12:01:03.000Z' },
    { sessionId: 's2', event: 'user_message', payload: { message: 'quanto custa?' }, meta: { nodeId: 'offer' }, createdAt: '2026-04-27T12:01:04.000Z' },

    { userId: 'u3', type: 'node_view', currentNodeId: 'start', timestamp: '2026-04-27T12:02:00.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'pitch', timestamp: '2026-04-27T12:02:01.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'go_fast', timestamp: '2026-04-27T12:02:02.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'offer', timestamp: '2026-04-27T12:02:03.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'long_1', timestamp: '2026-04-27T12:02:04.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'long_2', timestamp: '2026-04-27T12:02:05.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'long_3', timestamp: '2026-04-27T12:02:06.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'long_4', timestamp: '2026-04-27T12:02:07.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'long_5', timestamp: '2026-04-27T12:02:08.000Z' },
    { userId: 'u3', type: 'node_view', currentNodeId: 'cv', timestamp: '2026-04-27T12:02:09.000Z' },

    { userId: 'u4', type: 'node_view', currentNodeId: 'start', timestamp: '2026-04-27T12:03:00.000Z' },
    { userId: 'u4', type: 'node_view', currentNodeId: 'pitch', timestamp: '2026-04-27T12:03:01.000Z' },
    { userId: 'u4', type: 'node_view', currentNodeId: 'go_fast', timestamp: '2026-04-27T12:03:02.000Z' },
    { userId: 'u4', type: 'node_view', currentNodeId: 'offer', timestamp: '2026-04-27T12:03:03.000Z' },
    { userId: 'u4', event: 'user_message', message: 'qual o valor?', nodeId: 'offer', timestamp: '2026-04-27T12:03:04.000Z' },
  ],
  null,
  2,
)

describe('Flow Intel parser', () => {
  it('accepts source/target, from/to, content and data.body aliases', () => {
    const flow = parseFlowInput(flowJson)
    const logs = parseLogsInput(logsJson)

    expect(flow.errors).toEqual([])
    expect(flow.data?.edges).toHaveLength(9)
    expect(flow.data?.nodes.find((node) => node.id === 'pitch')?.text).toContain('CTA')
    expect(logs.errors).toEqual([])
    expect(logs.data?.map((entry) => entry.sessionId)).toContain('u1')
    expect(logs.data?.map((entry) => entry.sessionId)).toContain('s2')
  })
})

describe('Flow Intel analysis', () => {
  const parsedFlow = parseFlowInput(flowJson).data!
  const parsedLogs = parseLogsInput(logsJson).data!
  const result = analyzeFlow(parsedFlow, parsedLogs)

  it('finds a high-drop bottleneck', () => {
    expect(result.bottlenecks.some((item) => item.nodeId === 'offer' && item.dropRate >= 50)).toBe(true)
  })

  it('scores weak TX copy below 4 and suggests an improved version', () => {
    const offer = result.messageEvaluations.find((item) => item.nodeId === 'offer')

    expect(offer?.score).toBeLessThan(4)
    expect(offer?.improvedText).not.toEqual(offer?.currentText)
  })

  it('captures recurring price intent as unmapped', () => {
    expect(result.unmappedIntents.some((item) => item.intent.includes('preco') && item.frequency >= 2)).toBe(true)
  })

  it('flags isolated nodes, long paths without pause and simplifiable GO usage', () => {
    expect(result.structuralOptimizations.some((item) => item.nodeIds.includes('isolated'))).toBe(true)
    expect(result.structuralOptimizations.some((item) => item.issue.includes('Caminho longo'))).toBe(true)
    expect(result.structuralOptimizations.some((item) => item.nodeIds.includes('go_fast'))).toBe(true)
  })
})
